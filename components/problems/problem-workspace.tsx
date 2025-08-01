"use client";

import { CodeEditor } from "@/components/code/code-editor";
import { Shield } from "@/components/icons";
import { useProblemAnalyticsContext } from "@/components/problems/problem-analytics-provider";
import { SubmissionStatusBadge } from "@/components/submissions/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useContestAntiCheat } from "@/hooks/use-contest-anti-cheat";
import { useSubmissionRealtime } from "@/hooks/use-submission-realtime";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/constants";
import type { ContestProblemAntiCheatContext } from "@/lib/contests/anti-cheat/types";
import { getDefaultCodeStub } from "@/lib/problems/editor-presets";
import { invalidateTags } from "@/lib/react-query/invalidation";
import {
  sessionQueryOptions,
  submissionDraftQueryOptions,
  submissionHistoryQueryOptions,
} from "@/lib/react-query/policies";
import { simulateSampleRun } from "@/lib/submissions/simulator";
import type {
  SampleRunResult,
  SubmissionDetailPayload,
  SubmissionHistoryEntry,
} from "@/lib/submissions/types";
import { trpc } from "@/lib/trpc/client";
import { ProblemDetailPayload } from "@/lib/trpc/router/problems";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Alert01Icon,
  BookOpen01Icon,
  CircleArrowReload01Icon,
  Copy01Icon,
  Legal01Icon,
  PlayIcon,
  SaveEnergy01Icon,
  SentIcon,
  Settings02Icon,
  TimeScheduleIcon,
  Train01Icon,
} from "hugeicons-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type WorkspaceResult =
  | (SampleRunResult & { kind: "sample" })
  | (SubmissionDetailPayload & { kind: "submission" });

type WorkspacePreferences = {
  theme: "system" | "light" | "dark";
  fontSize: number;
  wrapLines: boolean;
  showMinimap: boolean;
};

type PresenceSignal = {
  id: string;
  userId: string | null;
  language: string;
  timestamp: number;
};

const DEFAULT_PREFERENCES: WorkspacePreferences = {
  theme: "system",
  fontSize: 14,
  wrapLines: true,
  showMinimap: false,
};

const PREFERENCE_KEY = "workspace:prefs";

export function ProblemWorkspace({
  problem,
  contestContext,
}: {
  problem: ProblemDetailPayload;
  contestContext?: ContestProblemAntiCheatContext;
}) {
  const { resolvedTheme } = useTheme();
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const { data: session } = trpc.auth.getSession.useQuery(undefined, sessionQueryOptions);
  const userId = session?.user?.id ?? null;
  const manualOnly = problem.judgeMode === "MANUAL";
  const requiresManualReview = problem.judgeMode !== "AUTO";
  const analytics = useProblemAnalyticsContext();
  const contestGuard = useContestAntiCheat(contestContext);
  const baseAnalyticsContext = useMemo(
    () => ({
      problemId: problem.id,
      contestId: contestContext?.contestId,
    }),
    [contestContext?.contestId, problem.id],
  );
  const examModeClass =
    contestGuard.enabled && contestGuard.examMode.disableSelection ? "exam-mode-locked" : "";

  const languageOptions = useMemo(() => {
    if (problem.languages.length > 0) {
      return problem.languages.filter((lang) =>
        SUPPORTED_LANGUAGES.includes(lang.code as SupportedLanguage),
      ) as Array<ProblemDetailPayload["languages"][number] & { code: SupportedLanguage }>;
    }
    return SUPPORTED_LANGUAGES.map((code) => ({
      code,
      displayName: code.toUpperCase(),
      codeStub: getDefaultCodeStub(code),
      fileExtension: null,
    }));
  }, [problem.languages]);

  const initialLanguage = languageOptions[0]?.code ?? "cpp17";
  const [activeLanguage, setActiveLanguage] = useState<SupportedLanguage>(initialLanguage);
  const [codeByLanguage, setCodeByLanguage] = useState<Record<string, string>>(() => {
    return languageOptions.reduce<Record<string, string>>((acc, language) => {
      acc[language.code] = language.codeStub ?? getDefaultCodeStub(language.code);
      return acc;
    }, {});
  });
  const [customInput, setCustomInput] = useState("");
  const [preferences, setPreferences] = useState<WorkspacePreferences>(() => {
    if (typeof window === "undefined") return DEFAULT_PREFERENCES;
    try {
      const stored = window.localStorage.getItem(PREFERENCE_KEY);
      if (!stored) return DEFAULT_PREFERENCES;
      const parsed = JSON.parse(stored) as WorkspacePreferences;
      return { ...DEFAULT_PREFERENCES, ...parsed };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });
  const [autosaveState, setAutosaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [consoleLines, setConsoleLines] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"run" | "submission">("run");
  const [sampleResult, setSampleResult] = useState<WorkspaceResult | null>(null);
  const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(null);
  const [lastSubmission, setLastSubmission] = useState<WorkspaceResult | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [presenceWarning, setPresenceWarning] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const clientId = useMemo(() => createClientId(), []);
  const autosaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const realtimeHandler = useCallback(
    (detail: SubmissionDetailPayload) => {
      utils.submissions.get.setData({ submissionId: detail.id }, detail);
    },
    [utils],
  );
  const editorOpenedAtRef = useRef(timestamp());
  const lastActivityAtRef = useRef(timestamp());
  const lastHeartbeatAtRef = useRef(timestamp());
  const runCounterRef = useRef(0);
  const submitCounterRef = useRef(0);
  const touchActivity = useCallback(() => {
    lastActivityAtRef.current = timestamp();
  }, []);
  useSubmissionRealtime({
    submissionId: currentSubmissionId,
    onUpdate: realtimeHandler,
  });

  const activeCode = codeByLanguage[activeLanguage] ?? getDefaultCodeStub(activeLanguage);
  const editorTheme =
    preferences.theme === "system"
      ? resolvedTheme === "dark"
        ? "dark"
        : "light"
      : preferences.theme;

  const draftKey = useMemo(
    () => `code:${userId ?? "guest"}:${problem.id}:${activeLanguage}`,
    [userId, problem.id, activeLanguage],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PREFERENCE_KEY, JSON.stringify(preferences));
    } catch {
      // ignore
    }
  }, [preferences]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(draftKey);
    if (stored) {
      startTransition(() => setCodeByLanguage((prev) => ({ ...prev, [activeLanguage]: stored })));
    }
  }, [draftKey, activeLanguage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateOffline = () => setIsOffline(!window.navigator.onLine);
    updateOffline();
    window.addEventListener("online", updateOffline);
    window.addEventListener("offline", updateOffline);
    return () => {
      window.removeEventListener("online", updateOffline);
      window.removeEventListener("offline", updateOffline);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (autosaveTimeout.current) {
      clearTimeout(autosaveTimeout.current);
    }
    startTransition(() => setAutosaveState("saving"));
    autosaveTimeout.current = setTimeout(() => {
      try {
        window.localStorage.setItem(draftKey, activeCode);
        startTransition(() => setAutosaveState("saved"));
      } catch {
        startTransition(() => setAutosaveState("idle"));
      }
    }, 2_000);
    return () => {
      if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);
    };
  }, [activeCode, draftKey]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(`opensolve:workspace:${problem.id}`);
    const notify = (type: "join" | "leave") =>
      channel.postMessage({
        type,
        id: clientId,
        userId,
        language: activeLanguage,
        timestamp: Date.now(),
      } satisfies PresenceSignal & { type: "join" | "leave" });
    notify("join");
    channel.onmessage = (event) => {
      const payload = event.data as PresenceSignal & { type: string };
      if (payload.id === clientId) return;
      if (payload.type === "join") {
        setPresenceWarning(true);
      } else if (payload.type === "leave") {
        setPresenceWarning(false);
      }
    };
    return () => {
      notify("leave");
      channel.close();
    };
  }, [problem.id, clientId, userId, activeLanguage]);

  useEffect(() => {
    analytics.registerEditorOpen();
    editorOpenedAtRef.current = timestamp();
  }, [analytics]);

  useEffect(() => {
    lastHeartbeatAtRef.current = timestamp();
    const id = setInterval(() => {
      const nowTs = timestamp();
      const lastActive = lastActivityAtRef.current ?? editorOpenedAtRef.current;
      const idleMs = Math.max(0, nowTs - lastActive);
      const elapsed = nowTs - lastHeartbeatAtRef.current;
      const activeMs = Math.max(0, elapsed - idleMs);
      trackAnalyticsEvent(
        "editor.activity_heartbeat",
        {
          activeMs: Math.max(0, Math.round(activeMs)),
          idleMs: Math.max(0, Math.round(idleMs)),
        },
        { ...baseAnalyticsContext, languageCode: activeLanguage },
      );
      lastHeartbeatAtRef.current = nowTs;
    }, 30000);
    return () => clearInterval(id);
  }, [activeLanguage, baseAnalyticsContext]);

  const draftsQuery = trpc.submissions.getDrafts.useQuery(
    { problemId: problem.id, languageCode: activeLanguage },
    {
      enabled: Boolean(session?.user),
      ...submissionDraftQueryOptions,
    },
  );

  const historyQuery = trpc.submissions.listMine.useQuery(
    { problemId: problem.id, limit: 15 },
    {
      enabled: Boolean(session?.user),
      ...submissionHistoryQueryOptions,
    },
  );

  const submissionDetailQuery = trpc.submissions.get.useQuery(
    { submissionId: currentSubmissionId ?? "" },
    {
      enabled: Boolean(currentSubmissionId),
      refetchInterval: false,
      refetchOnWindowFocus: false,
    },
  );

  const currentSubmissionResult = submissionDetailQuery.data
    ? ({ ...submissionDetailQuery.data, kind: "submission" } as WorkspaceResult)
    : null;

  const runSample = trpc.submissions.runSample.useMutation({
    onSuccess: (data) => {
      const enriched: WorkspaceResult = { ...data, kind: "sample" };
      setSampleResult(enriched);
      setViewMode("run");
      setConsoleLines(data.console);
    },
    onError: (error) => {
      toast.error(error.message || "Unable to run samples");
    },
  });

  const createSubmission = trpc.submissions.create.useMutation({
    onSuccess: ({ submissionId }) => {
      setCurrentSubmissionId(submissionId);
      setViewMode("submission");
      const intro = manualOnly
        ? ["Submission queued for manual review.", "A curator will respond once it is scored."]
        : requiresManualReview
          ? ["Auto judge running…", "Manual review will follow once auto checks finish."]
          : ["Submission queued…", "Judge will update shortly."];
      setConsoleLines(intro);
      invalidateTags(queryClient, ["submissions"]);
    },
    onError: (error) => {
      toast.error(error.message || "Submit failed");
    },
  });

  const saveDraftMutation = trpc.submissions.saveDraft.useMutation({
    onSuccess: () => {
      draftsQuery.refetch();
      toast.success("Draft synced");
      trackAnalyticsEvent(
        "editor.draft_saved",
        {},
        { ...baseAnalyticsContext, languageCode: activeLanguage },
      );
      invalidateTags(queryClient, ["submissionDrafts"]);
    },
    onError: (error) => {
      toast.error(error.message || "Unable to save draft");
    },
  });

  useEffect(() => {
    if (!submissionDetailQuery.data) return;
    const payload: WorkspaceResult = { ...submissionDetailQuery.data, kind: "submission" };
    startTransition(() => setConsoleLines(payload.console));
    const finalVerdict = payload.verdictCode ?? payload.summary?.verdictCode;
    if (finalVerdict === "AC" || finalVerdict === "MANUAL_ACCEPTED") {
      maybeCelebrate(userId, problem.id, historyQuery.data?.entries ?? []);
      analytics.markAccepted(payload.languageCode ?? activeLanguage);
    }
    const pendingStatuses = ["QUEUED", "RUNNING", "RETRYING", "MANUAL_PENDING"];
    if (!pendingStatuses.includes(payload.status)) {
      startTransition(() => setLastSubmission(payload));
    }
  }, [
    analytics,
    activeLanguage,
    submissionDetailQuery.data,
    historyQuery.data,
    problem.id,
    userId,
  ]);

  const handleLanguageChange = useCallback(
    (next: SupportedLanguage) => {
      if (next === activeLanguage) return;
      trackAnalyticsEvent(
        "editor.language_switch",
        {
          fromLanguageCode: activeLanguage,
          toLanguageCode: next,
        },
        baseAnalyticsContext,
      );
      setActiveLanguage(next);
    },
    [activeLanguage, baseAnalyticsContext],
  );

  const handleRun = useCallback(() => {
    if (!activeLanguage) return;
    touchActivity();
    analytics.incrementRunCount();
    runCounterRef.current += 1;
    const timeSinceOpen = Math.round(timestamp() - editorOpenedAtRef.current);
    trackAnalyticsEvent(
      "editor.run_clicked",
      {
        runIndex: runCounterRef.current,
        timeSinceEditorOpenMs: timeSinceOpen,
      },
      { ...baseAnalyticsContext, languageCode: activeLanguage },
    );
    if (isOffline) {
      const offlineResult = simulateSampleRun({
        problemId: problem.id,
        languageCode: activeLanguage,
        sourceCode: activeCode,
        stdin: customInput,
        testCases: problem.content.sampleTestCases.map((sample) => ({
          ordinal: sample.ordinal,
          input: sample.input,
          output: sample.output,
          kind: "SAMPLE",
        })),
        mode: "sample",
      });
      const enriched: WorkspaceResult = { ...offlineResult, kind: "sample" };
      setSampleResult(enriched);
      setViewMode("run");
      setConsoleLines(["Offline mode enabled — using local simulator.", ...offlineResult.console]);
      return;
    }
    runSample.mutate({
      problemId: problem.id,
      languageCode: activeLanguage,
      sourceCode: activeCode,
      stdin: customInput,
    });
  }, [
    activeLanguage,
    analytics,
    touchActivity,
    isOffline,
    runSample,
    problem.id,
    activeCode,
    customInput,
    problem.content.sampleTestCases,
    baseAnalyticsContext,
  ]);

  const handleSubmit = useCallback(() => {
    if (!activeLanguage) return;
    if (!session?.user) {
      toast.error("Sign in to submit solutions");
      return;
    }
    if (contestGuard.disqualified) {
      toast.error("You have been disqualified from this contest.");
      return;
    }
    touchActivity();
    analytics.incrementSubmitCount();
    submitCounterRef.current += 1;
    trackAnalyticsEvent(
      "editor.submit_clicked",
      {
        attemptNumber: submitCounterRef.current,
        timeSinceFirstViewMs: analytics.getTimeSinceEnterMs(),
      },
      { ...baseAnalyticsContext, languageCode: activeLanguage },
    );
    createSubmission.mutate({
      problemId: problem.id,
      contestId: contestContext?.contestId,
      languageCode: activeLanguage,
      sourceCode: activeCode,
      stdin: customInput,
    });
  }, [
    activeLanguage,
    session,
    touchActivity,
    analytics,
    createSubmission,
    problem.id,
    activeCode,
    customInput,
    contestContext?.contestId,
    contestGuard.disqualified,
    baseAnalyticsContext,
  ]);

  const handleReset = () => {
    setCodeByLanguage((prev) => ({
      ...prev,
      [activeLanguage]: getDefaultCodeStub(activeLanguage),
    }));
    toast.message("Stub restored");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeCode);
      toast.success("Code copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleSaveDraft = useCallback(
    (savedVia: "autosave" | "manual") => {
      if (!session?.user) {
        toast.info("Sign in to sync drafts");
        return;
      }
      touchActivity();
      saveDraftMutation.mutate({
        problemId: problem.id,
        languageCode: activeLanguage,
        sourceCode: activeCode,
        cursorOffset: 0,
        savedVia,
      });
    },
    [session?.user, touchActivity, saveDraftMutation, problem.id, activeLanguage, activeCode],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleSaveDraft("manual");
      } else if (event.key === "Enter" && event.shiftKey) {
        event.preventDefault();
        handleSubmit();
      } else if (event.key === "Enter") {
        event.preventDefault();
        handleRun();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleRun, handleSubmit, handleSaveDraft]);

  const activeResult =
    viewMode === "run" ? sampleResult : (currentSubmissionResult ?? lastSubmission);

  return (
    <TooltipProvider>
      {/* Mobile Warning Banner - Shows on screens < 768px (iPad portrait) */}
      <div className="block border-2 border-warning/50 bg-warning/10 p-6 md:hidden">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-none border-2 border-warning bg-warning/20">
            <Alert01Icon className="h-6 w-6 text-warning" strokeWidth={2} />
          </div>
          <div className="space-y-2">
            <h3 className="bg-linear-to-br from-foreground via-foreground to-foreground/70 bg-clip-text font-mono text-xl font-black text-transparent">
              Device Not Supported
            </h3>
            <p className="font-mono text-sm text-muted-foreground">
              The code editor requires a larger screen. Please use a laptop, desktop, or tablet (iPad
              or larger) to solve problems.
            </p>
          </div>
          <div className="flex flex-col gap-2 font-mono text-xs text-muted-foreground">
            <p>✓ Laptops & Desktops</p>
            <p>✓ Tablets (iPad & larger)</p>
            <p>✗ Mobile phones</p>
          </div>
        </div>
      </div>

      <section
        id="editor"
        className={cn("hidden border-2 border-border bg-background p-4 md:block md:p-6", examModeClass)}
      >
        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <div className="flex-1 min-w-[200px]">
            <p className="font-mono text-xs text-muted-foreground">Ready to solve</p>
            <h2 className="bg-linear-to-br from-foreground via-foreground to-foreground/70 bg-clip-text font-mono text-xl font-black text-transparent md:text-2xl">
              {problem.title}
            </h2>
          </div>
          <Badge
            variant="outline"
            className="rounded-none border font-mono text-xs font-bold uppercase"
          >
            {problem.difficulty ?? "Unrated"}
          </Badge>
          <div className="flex w-full items-center gap-2 md:ml-auto md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDrawerOpen(true)}
              className="h-9 flex-1 gap-2 rounded-none border-2 border-border font-mono text-sm hover:border-primary/50 hover:bg-accent md:flex-initial"
            >
              <BookOpen01Icon className="h-4 w-4" strokeWidth={2} />
              <span className="md:inline">Statement</span>
            </Button>
            <PreferencesMenu preferences={preferences} onChange={setPreferences} />
          </div>
        </div>

        {presenceWarning ? (
          <div className="mt-4 flex items-center gap-2 border-2 border-warning/50 bg-warning/10 px-4 py-3 font-mono text-sm text-warning">
            <Alert01Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
            Another tab is editing this problem. To avoid overwriting drafts, close other sessions.
          </div>
        ) : null}
        {isOffline ? (
          <div className="mt-4 flex items-center gap-2 border-2 border-info/40 bg-info/10 px-4 py-3 font-mono text-sm text-info">
            <CircleArrowReload01Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
            Offline mode — drafts stay local and sample runs fall back to the local simulator.
          </div>
        ) : null}
        {requiresManualReview ? (
          <div className="mt-4 flex items-center gap-2 border-2 border-primary/40 bg-primary/10 px-4 py-3 font-mono text-sm text-foreground">
            <Legal01Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
            {manualOnly
              ? "This problem is reviewed manually. Expect longer turnaround while a curator scores your submission."
              : "Hybrid judging enabled — the auto judge runs first, followed by a manual reviewer."}
          </div>
        ) : null}
        {contestGuard.enabled ? (
          <div className="mt-4 border-2 border-info/60 bg-info/10 px-4 py-3 font-mono text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Shield className="h-4 w-4 text-info" />
              <span className="font-mono text-sm font-bold text-foreground">
                Anti-cheat guard active
              </span>
              {contestGuard.status ? (
                <Badge
                  variant="outline"
                  className="rounded-none border border-info/40 font-mono text-[10px] uppercase text-info"
                >
                  {contestGuard.status.toLowerCase()}
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {contestContext?.antiCheat.warnings.reminderCopy ??
                "Tab switches, large pastes, and multi-device logins trigger reviews."}
            </p>
            {contestGuard.warnings.length ? (
              <ul className="mt-2 space-y-1 font-mono text-xs text-warning">
                {contestGuard.warnings.map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {contestGuard.disqualified ? (
          <div className="mt-4 border-2 border-destructive/50 bg-destructive/10 px-4 py-3 font-mono text-sm text-destructive">
            You have been disqualified from this contest. Submissions are blocked for this window.
          </div>
        ) : null}

        <div className="mt-4 md:mt-6">
          {/* Desktop & Large Tablets: Horizontal split with resizable panels */}
          <div className="hidden lg:block">
            <ResizablePanelGroup direction="horizontal" className="h-full min-h-[560px]">
              <ResizablePanel defaultSize={65} minSize={55} className="pr-3">
                <EditorColumn
                  activeLanguage={activeLanguage}
                  languageOptions={languageOptions}
                  onLanguageChange={handleLanguageChange}
                  code={activeCode}
                  onChange={(next) => {
                    touchActivity();
                    setCodeByLanguage((prev) => ({ ...prev, [activeLanguage]: next }));
                  }}
                  onCopy={handleCopy}
                  onReset={handleReset}
                  onSave={() => handleSaveDraft("manual")}
                  appearance={editorTheme === "dark" ? "dark" : "light"}
                  preferences={preferences}
                  customInput={customInput}
                  onInputChange={(value) => {
                    touchActivity();
                    setCustomInput(value);
                  }}
                  onPaste={contestGuard.recordPaste}
                  autosaveState={autosaveState}
                  runInProgress={runSample.isPending}
                  submitInProgress={createSubmission.isPending}
                  onRun={handleRun}
                  onSubmit={handleSubmit}
                  consoleLines={consoleLines}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={35} minSize={30} className="pl-3">
                <SidePanel
                  problem={problem}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  result={activeResult}
                  submissionHistory={historyQuery.data?.entries ?? []}
                  onSelectSubmission={(submissionId) => {
                    trackAnalyticsEvent(
                      "submission.timeline_open",
                      { submissionId },
                      baseAnalyticsContext,
                    );
                    setCurrentSubmissionId(submissionId);
                    setViewMode("submission");
                  }}
                  drafts={draftsQuery.data ?? []}
                  onRestoreDraft={(source) =>
                    setCodeByLanguage((prev) => ({ ...prev, [activeLanguage]: source }))
                  }
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>

          {/* iPad Portrait: Stacked vertical layout without resizable */}
          <div className="block space-y-4 lg:hidden">
            <EditorColumn
              activeLanguage={activeLanguage}
              languageOptions={languageOptions}
              onLanguageChange={handleLanguageChange}
              code={activeCode}
              onChange={(next) => {
                touchActivity();
                setCodeByLanguage((prev) => ({ ...prev, [activeLanguage]: next }));
              }}
              onCopy={handleCopy}
              onReset={handleReset}
              onSave={() => handleSaveDraft("manual")}
              appearance={editorTheme === "dark" ? "dark" : "light"}
              preferences={preferences}
              customInput={customInput}
              onInputChange={(value) => {
                touchActivity();
                setCustomInput(value);
              }}
              onPaste={contestGuard.recordPaste}
              autosaveState={autosaveState}
              runInProgress={runSample.isPending}
              submitInProgress={createSubmission.isPending}
              onRun={handleRun}
              onSubmit={handleSubmit}
              consoleLines={consoleLines}
            />
            <SidePanel
              problem={problem}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              result={activeResult}
              submissionHistory={historyQuery.data?.entries ?? []}
              onSelectSubmission={(submissionId) => {
                trackAnalyticsEvent(
                  "submission.timeline_open",
                  { submissionId },
                  baseAnalyticsContext,
                );
                setCurrentSubmissionId(submissionId);
                setViewMode("submission");
              }}
              drafts={draftsQuery.data ?? []}
              onRestoreDraft={(source) =>
                setCodeByLanguage((prev) => ({ ...prev, [activeLanguage]: source }))
              }
            />
          </div>
        </div>
      </section>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="rounded-none border-t-2 border-border bg-background">
          <DrawerHeader className="px-4 md:px-6">
            <DrawerTitle className="font-mono text-lg font-bold md:text-xl">{problem.title}</DrawerTitle>
            <DrawerDescription className="font-mono text-xs text-muted-foreground md:text-sm">
              Quick reference of the statement without leaving the editor.
            </DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="max-h-[60vh] px-4 pb-6 md:max-h-[70vh] md:px-6">
            <article className="prose prose-sm font-mono dark:prose-invert">
              <pre className="whitespace-pre-wrap font-mono text-xs md:text-sm">{problem.content.statement}</pre>
            </article>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    </TooltipProvider>
  );
}

function EditorColumn(props: {
  activeLanguage: SupportedLanguage;
  languageOptions: Array<{
    code: SupportedLanguage;
    displayName: string;
    fileExtension: string | null;
  }>;
  onLanguageChange: (language: SupportedLanguage) => void;
  code: string;
  onChange: (value: string) => void;
  onCopy: () => void;
  onReset: () => void;
  onSave: () => void;
  appearance: "light" | "dark";
  preferences: WorkspacePreferences;
  customInput: string;
  onInputChange: (value: string) => void;
  onPaste: (length: number) => void;
  autosaveState: "idle" | "saving" | "saved";
  runInProgress: boolean;
  submitInProgress: boolean;
  onRun: () => void;
  onSubmit: () => void;
  consoleLines: string[];
}) {
  const {
    activeLanguage,
    languageOptions,
    onLanguageChange,
    code,
    onChange,
    onCopy,
    onReset,
    onSave,
    appearance,
    preferences,
    customInput,
    onInputChange,
    onPaste,
    autosaveState,
    runInProgress,
    submitInProgress,
    onRun,
    onSubmit,
    consoleLines,
  } = props;
  return (
    <div className="flex h-full flex-col gap-3 md:gap-4">
      <div className="border-2 border-border bg-background p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <Select
            value={activeLanguage}
            onValueChange={(value) => onLanguageChange(value as SupportedLanguage)}
          >
            <SelectTrigger className="w-full rounded-none border-2 border-border font-mono text-sm md:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none border-2 border-border font-mono text-sm">
              {languageOptions.map((language) => (
                <SelectItem key={language.code} value={language.code}>
                  {language.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex w-full flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground md:ml-auto md:w-auto">
            <span
              className={cn(
                "flex items-center gap-1 px-2 py-1 transition md:px-3",
                autosaveState === "saving"
                  ? "text-warning"
                  : autosaveState === "saved"
                    ? "text-success"
                    : "text-muted-foreground",
              )}
            >
              <span className="h-2 w-2 rounded-none bg-current" />
              <span className="hidden md:inline">{autosaveState === "saving" ? "Saving…" : "Saved"}</span>
              <span className="md:hidden">{autosaveState === "saving" ? "…" : "✓"}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-8 rounded-none font-mono text-xs md:text-sm"
            >
              <span className="md:inline">Reset</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopy}
              className="h-8 gap-1 rounded-none font-mono text-xs md:gap-2 md:text-sm"
            >
              <Copy01Icon className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={2} />
              <span className="hidden md:inline">Copy</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSave}
              className="h-8 gap-1 rounded-none font-mono text-xs md:gap-2 md:text-sm"
            >
              <SaveEnergy01Icon className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={2} />
              <span className="hidden md:inline">Save</span>
            </Button>
          </div>
        </div>
        <div className="mt-3 border-2 border-border bg-background md:mt-4">
          <CodeEditor
            value={code}
            onChange={onChange}
            onPaste={onPaste}
            language={activeLanguage}
            minHeight={320}
            appearance={appearance}
            fontSize={preferences.fontSize}
            wrapLines={preferences.wrapLines}
            showMinimap={preferences.showMinimap}
            ariaLabel="In-browser code editor"
          />
        </div>
        <div className="mt-3 grid gap-3 md:mt-4 md:grid-cols-2">
          <div>
            <label className="font-mono text-xs font-bold uppercase text-muted-foreground">
              Custom Input
            </label>
            <Textarea
              value={customInput}
              onChange={(event) => onInputChange(event.target.value)}
              className="mt-1 h-20 resize-none rounded-none border-2 border-border font-mono text-sm md:h-24"
              placeholder="stdin sent to the runner"
            />
          </div>
          <div className="flex flex-col gap-2 md:items-end md:justify-end">
            <Button
              variant="outline"
              className="h-10 w-full gap-2 rounded-none border-2 border-border font-mono text-sm hover:border-primary/50 hover:bg-accent md:w-auto"
              onClick={onRun}
              disabled={runInProgress}
            >
              {runInProgress ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <PlayIcon className="h-4 w-4" strokeWidth={2} />
              )}
              Run Samples
            </Button>
            <Button
              className="h-10 w-full gap-2 rounded-none border-2 border-primary bg-primary font-mono text-sm font-bold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:shadow-md hover:shadow-primary/30 md:w-auto"
              onClick={onSubmit}
              disabled={submitInProgress}
            >
              {submitInProgress ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <SentIcon className="h-4 w-4" strokeWidth={2} />
              )}
              Submit
            </Button>
          </div>
        </div>
      </div>
      <ConsolePanel lines={consoleLines} />
    </div>
  );
}

function ConsolePanel({ lines }: { lines: string[] }) {
  if (lines.length === 0) {
    return (
      <div className="border-2 border-border bg-background p-3 font-mono text-xs text-muted-foreground md:p-4 md:text-sm">
        <div className="flex items-center gap-2">
          <Train01Icon className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={2} />
          Console output will appear here.
        </div>
      </div>
    );
  }
  return (
    <div className="border-2 border-border bg-background p-3 font-mono text-xs text-muted-foreground md:p-4 md:text-sm">
      <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wide text-primary/80">
        <Train01Icon className="h-3.5 w-3.5" strokeWidth={2} />
        Console
      </div>
      <div className="mt-2 max-h-32 space-y-1 overflow-auto md:mt-3 md:max-h-40">
        {lines.map((line, index) => (
          <p key={`${line}-${index}`} className="whitespace-pre-wrap font-mono text-foreground/80">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

function SidePanel(props: {
  problem: ProblemDetailPayload;
  viewMode: "run" | "submission";
  onViewModeChange: (mode: "run" | "submission") => void;
  result: WorkspaceResult | null;
  submissionHistory: SubmissionHistoryEntry[];
  onSelectSubmission: (id: string) => void;
  drafts: Array<{ id: string; updatedAt: Date; sourceCode: string; savedVia: string }>;
  onRestoreDraft: (code: string) => void;
}) {
  const {
    problem,
    viewMode,
    onViewModeChange,
    result,
    submissionHistory,
    onSelectSubmission,
    drafts,
    onRestoreDraft,
  } = props;
  return (
    <div className="flex h-full flex-col gap-3 md:gap-4">
      <Tabs
        value={viewMode}
        onValueChange={(value) => onViewModeChange(value as "run" | "submission")}
      >
        <TabsList className="grid h-9 w-full grid-cols-2 rounded-none border-2 border-border bg-background p-0 font-mono text-xs md:h-10 md:text-sm">
          <TabsTrigger
            value="run"
            className="rounded-none border-r border-border data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <span className="hidden md:inline">Run output</span>
            <span className="md:hidden">Run</span>
          </TabsTrigger>
          <TabsTrigger
            value="submission"
            className="rounded-none data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            Judge
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="border-2 border-border bg-background p-3 md:p-4">
        <ResultPanel result={result} />
      </div>
      <Tabs defaultValue="description" className="flex-1">
        <TabsList className="grid h-9 w-full grid-cols-4 rounded-none border-2 border-border bg-background p-0 font-mono text-[10px] md:h-10 md:text-xs">
          <TabsTrigger
            value="description"
            className="rounded-none border-r text-xs border-border data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <span className="hidden md:inline">Description</span>
            <span className="md:hidden">Desc</span>
          </TabsTrigger>
          <TabsTrigger
            value="editorial"
            disabled={!problem.editorialIsReleased}
            className="rounded-none border-r text-xs border-border data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <span className="hidden md:inline">Editorial</span>
            <span className="md:hidden">Edit</span>
          </TabsTrigger>
          <TabsTrigger
            value="submissions"
            className="rounded-none border-r text-xs border-border data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <span className="hidden md:inline">Submissions</span>
            <span className="md:hidden">Subs</span>
          </TabsTrigger>
          <TabsTrigger
            value="drafts"
            className="rounded-none text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <span className="hidden md:inline">My Code</span>
            <span className="md:hidden">Code</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="description"
          className="border-2 border-border bg-background p-3 font-mono text-xs text-muted-foreground md:p-4 md:text-sm"
        >
          <ScrollArea className="h-48 md:h-64">
            <p className="whitespace-pre-line font-mono text-foreground">
              {problem.content.statement}
            </p>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="editorial" className="border-2 border-border bg-background p-3 md:p-4">
          {problem.editorialIsReleased && problem.content.editorial ? (
            <ScrollArea className="h-48 font-mono text-xs text-foreground md:h-64 md:text-sm">
              <p className="whitespace-pre-line">{problem.content.editorial}</p>
            </ScrollArea>
          ) : (
            <p className="font-mono text-xs text-muted-foreground md:text-sm">
              Editorial locked
              {problem.editorialReleaseAt
                ? ` until ${format(new Date(problem.editorialReleaseAt), "PPP p")}`
                : ""}
              . View the full write-up once it is released.
            </p>
          )}
        </TabsContent>
        <TabsContent value="submissions">
          <div className="h-48 space-y-2 overflow-auto border-2 border-border bg-background p-3 font-mono text-xs md:h-64 md:space-y-3 md:p-4 md:text-sm">
            {submissionHistory.length === 0 ? (
              <p className="text-muted-foreground">No submissions yet.</p>
            ) : (
              submissionHistory.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onSelectSubmission(entry.id)}
                  className="w-full border-2 border-border bg-background px-2 py-2 text-left transition hover:border-primary/40 md:px-3"
                >
                  <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground md:text-xs">
                    <span className="truncate">{new Date(entry.createdAt).toLocaleString()}</span>
                    <SubmissionStatusBadge
                      verdict={entry.verdictCode}
                      status={entry.status}
                      size="sm"
                    />
                  </div>
                  <p className="mt-1 truncate font-mono text-xs font-medium text-foreground md:text-sm">
                    {entry.verdictCode ?? "Pending"} • {entry.languageCode.toUpperCase()}
                  </p>
                </button>
              ))
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start rounded-none font-mono text-xs md:text-sm"
              asChild
            >
              <Link href={`/problems/${problem.slug}/submissions`}>View history</Link>
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="drafts">
          <div className="h-48 space-y-2 overflow-auto border-2 border-border bg-background p-3 font-mono text-xs md:h-64 md:space-y-3 md:p-4 md:text-sm">
            {drafts.length === 0 ? (
              <p className="text-muted-foreground">No cloud drafts yet.</p>
            ) : (
              drafts.map((draft) => (
                <div key={draft.id} className="border-2 border-border bg-background p-2 text-left md:p-3">
                  <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground md:text-xs">
                    <span className="truncate">{new Date(draft.updatedAt).toLocaleString()}</span>
                    <Badge
                      variant="outline"
                      className="ml-2 rounded-none border font-mono text-[10px] font-bold uppercase md:text-xs"
                    >
                      {draft.savedVia}
                    </Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 whitespace-pre-wrap font-mono text-[10px] text-foreground/80 md:text-xs">
                    {draft.sourceCode}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 gap-1 rounded-none font-mono text-xs md:h-8 md:gap-2 md:text-sm"
                    onClick={() => onRestoreDraft(draft.sourceCode)}
                  >
                    <TimeScheduleIcon className="h-3 w-3 md:h-4 md:w-4" strokeWidth={2} />
                    Restore
                  </Button>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ResultPanel({ result }: { result: WorkspaceResult | null }) {
  if (!result) {
    return (
      <div className="font-mono text-xs text-muted-foreground md:text-sm">
        Run samples or submit to see verdicts.
      </div>
    );
  }

  const summary = result.summary;
  const variant = result.kind === "sample" ? "Samples" : "Judge";
  if (!summary) {
    return (
      <div className="border-2 border-primary/40 bg-primary/5 p-3 font-mono text-xs text-foreground md:p-4 md:text-sm">
        Manual review pending — we&apos;ll update this panel once a reviewer posts a verdict.
      </div>
    );
  }
  const verdict = summary.verdictCode ?? "WA";
  const statusLabel = result.kind === "sample" ? "SUCCEEDED" : result.status;
  return (
    <div className="space-y-3 md:space-y-4">
      <div className="border-2 border-border bg-background p-3 md:p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] text-muted-foreground md:text-xs">{variant}</p>
            <p className="font-mono text-base font-bold text-foreground md:text-lg">{verdict}</p>
          </div>
          <SubmissionStatusBadge verdict={summary.verdictCode ?? null} status={statusLabel} />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[10px] text-muted-foreground md:mt-3 md:gap-4 md:text-xs">
          <div>
            <p>Passed</p>
            <p className="font-mono text-sm font-medium text-foreground md:text-base">
              {summary?.passed ?? 0}
            </p>
          </div>
          <div>
            <p>Failed</p>
            <p className="font-mono text-sm font-medium text-foreground md:text-base">
              {summary?.failed ?? 0}
            </p>
          </div>
          <div>
            <p>Runtime</p>
            <p className="truncate font-mono text-sm font-medium text-foreground md:text-base">
              {summary?.runtimeMs ? `${summary.runtimeMs} ms` : "—"}
            </p>
          </div>
        </div>
      </div>
      <div>
        {result.cases.length === 0 ? (
          <p className="font-mono text-[10px] text-muted-foreground md:text-xs">No per-test details yet.</p>
        ) : (
          <div className="max-h-64 space-y-2 overflow-auto md:max-h-80">
            {result.cases.map((test) => (
              <motion.div
                key={`${test.ordinal}-${test.verdictCode}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-2 border-border bg-background p-2 font-mono text-[10px] md:p-3 md:text-xs"
              >
                <div className="flex items-center justify-between">
                  <p className="font-mono font-medium text-foreground">Test #{test.ordinal}</p>
                  <SubmissionStatusBadge
                    verdict={test.verdictCode}
                    status={test.status}
                    size="sm"
                  />
                </div>
                {test.inputPreview && (
                  <p className="mt-1 truncate font-mono text-muted-foreground md:mt-2">
                    <span className="font-bold text-foreground">In:</span> {test.inputPreview}
                  </p>
                )}
                {test.actualOutput && (
                  <p className="mt-1 truncate font-mono text-muted-foreground">
                    <span className="font-bold text-foreground">Out:</span> {test.actualOutput}
                  </p>
                )}
                {test.stderr ? (
                  <p className="mt-1 truncate font-mono text-destructive">stderr: {test.stderr}</p>
                ) : null}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PreferencesMenu({
  preferences,
  onChange,
}: {
  preferences: WorkspacePreferences;
  onChange: (prefs: WorkspacePreferences) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 flex-1 gap-2 rounded-none border-2 border-border font-mono text-sm hover:border-primary/50 hover:bg-accent md:flex-initial"
        >
          <Settings02Icon className="h-4 w-4" strokeWidth={2} />
          <span className="hidden md:inline">Preferences</span>
          <span className="md:hidden">Prefs</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 space-y-2 rounded-none border-2 border-border bg-background p-3 font-mono text-xs md:w-60 md:text-sm"
      >
        <DropdownMenuLabel className="font-mono text-[10px] font-bold uppercase md:text-xs">
          Editor theme
        </DropdownMenuLabel>
        <div className="flex gap-2">
          {(["system", "light", "dark"] as const).map((theme) => (
            <Button
              key={theme}
              variant={preferences.theme === theme ? "default" : "outline"}
              size="sm"
              className="flex-1 rounded-none border-2 font-mono text-[10px] md:text-xs"
              onClick={() => onChange({ ...preferences, theme })}
            >
              {theme}
            </Button>
          ))}
        </div>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuLabel className="font-mono text-[10px] font-bold uppercase md:text-xs">
          Font size
        </DropdownMenuLabel>
        <Input
          type="range"
          min={12}
          max={20}
          value={preferences.fontSize}
          onChange={(event) => onChange({ ...preferences, fontSize: Number(event.target.value) })}
          className="rounded-none border-2 border-border"
        />
        <DropdownMenuSeparator className="bg-border" />
        <div className="flex items-center justify-between font-mono text-[10px] md:text-xs">
          <span>Wrap lines</span>
          <Switch
            checked={preferences.wrapLines}
            onCheckedChange={(checked) => onChange({ ...preferences, wrapLines: checked })}
            className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground"
          />
        </div>
        <div className="flex items-center justify-between font-mono text-[10px] md:text-xs">
          <span>Show minimap</span>
          <Switch
            checked={preferences.showMinimap}
            onCheckedChange={(checked) => onChange({ ...preferences, showMinimap: checked })}
            className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground"
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function maybeCelebrate(
  userId: string | null,
  problemId: string,
  history: SubmissionHistoryEntry[],
) {
  if (!userId) return;
  const storageKey = `celebrate:${userId}:${problemId}`;
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(storageKey)) return;
  const hasPreviousAc = history.some((entry) => entry.verdictCode === "AC");
  if (hasPreviousAc) return;
  window.localStorage.setItem(storageKey, "true");
  void import("canvas-confetti").then((module) => {
    module.default?.({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.7 },
    });
  });
}

function createClientId() {
  if (typeof globalThis !== "undefined") {
    const cryptoObj = globalThis.crypto;
    if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
      return cryptoObj.randomUUID();
    }
    if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
      const bytes = cryptoObj.getRandomValues(new Uint8Array(16));
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
  }
  return `client-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function timestamp() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}
