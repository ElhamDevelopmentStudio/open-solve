"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  Copy,
  Gavel,
  History,
  Play,
  Save,
  Send,
  Settings,
  Terminal,
  TimerReset,
} from "lucide-react";
import { ProblemDetailPayload } from "@/lib/trpc/router/problems";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/constants";
import { getDefaultCodeStub } from "@/lib/problems/editor-presets";
import { CodeEditor } from "@/components/code/code-editor";
import { trpc } from "@/lib/trpc/client";
import {
  sessionQueryOptions,
  submissionDraftQueryOptions,
  submissionHistoryQueryOptions,
} from "@/lib/react-query/policies";
import { invalidateTags } from "@/lib/react-query/invalidation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { trackEvent } from "@/lib/telemetry/client";
import { simulateSampleRun } from "@/lib/submissions/simulator";
import type { SampleRunResult, SubmissionDetailPayload, SubmissionHistoryEntry } from "@/lib/submissions/types";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { SubmissionStatusBadge } from "@/components/submissions/status-badge";
import { useSubmissionRealtime } from "@/hooks/use-submission-realtime";
import { format } from "date-fns";

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

export function ProblemWorkspace({ problem }: { problem: ProblemDetailPayload }) {
  const { resolvedTheme } = useTheme();
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const { data: session } = trpc.auth.getSession.useQuery(undefined, sessionQueryOptions);
  const userId = session?.user?.id ?? null;
  const manualOnly = problem.judgeMode === "MANUAL";
  const requiresManualReview = problem.judgeMode !== "AUTO";

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
  useSubmissionRealtime({
    submissionId: currentSubmissionId,
    onUpdate: realtimeHandler,
  });

  const activeCode = codeByLanguage[activeLanguage] ?? getDefaultCodeStub(activeLanguage);
  const editorTheme =
    preferences.theme === "system"
      ? (resolvedTheme === "dark" ? "dark" : "light")
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
      setCodeByLanguage((prev) => ({ ...prev, [activeLanguage]: stored }));
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
    setAutosaveState("saving");
    autosaveTimeout.current = setTimeout(() => {
      try {
        window.localStorage.setItem(draftKey, activeCode);
        setAutosaveState("saved");
      } catch {
        setAutosaveState("idle");
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
  });

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
      trackEvent("submission.runSample", { problemId: problem.id, language: activeLanguage });
    },
    onError: (error) => {
      toast.error(error.message || "Unable to run samples");
    },
  });

  const createSubmission = trpc.submissions.create.useMutation({
    onSuccess: ({ submissionId }) => {
      setCurrentSubmissionId(submissionId);
      setViewMode("submission");
      const intro =
        manualOnly
          ? ["Submission queued for manual review.", "A curator will respond once it is scored."]
          : requiresManualReview
            ? ["Auto judge running…", "Manual review will follow once auto checks finish."]
            : ["Submission queued…", "Judge will update shortly."];
      setConsoleLines(intro);
      trackEvent("submission.create", { problemId: problem.id, language: activeLanguage });
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
      trackEvent("submission.draft.saved", { problemId: problem.id, language: activeLanguage });
      invalidateTags(queryClient, ["submissionDrafts"]);
    },
    onError: (error) => {
      toast.error(error.message || "Unable to save draft");
    },
  });

  useEffect(() => {
    if (!submissionDetailQuery.data) return;
    const payload: WorkspaceResult = { ...submissionDetailQuery.data, kind: "submission" };
    setConsoleLines(payload.console);
    const finalVerdict = payload.verdictCode ?? payload.summary?.verdictCode;
    if (finalVerdict === "AC" || finalVerdict === "MANUAL_ACCEPTED") {
      maybeCelebrate(userId, problem.id, historyQuery.data?.entries ?? []);
    }
    const pendingStatuses = ["QUEUED", "RUNNING", "RETRYING", "MANUAL_PENDING"];
    if (!pendingStatuses.includes(payload.status)) {
      setLastSubmission(payload);
    }
  }, [submissionDetailQuery.data, historyQuery.data, problem.id, userId]);

  const handleRun = useCallback(() => {
    if (!activeLanguage) return;
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
      setConsoleLines([
        "Offline mode enabled — using local simulator.",
        ...offlineResult.console,
      ]);
      return;
    }
    runSample.mutate({
      problemId: problem.id,
      languageCode: activeLanguage,
      sourceCode: activeCode,
      stdin: customInput,
    });
  }, [activeLanguage, isOffline, runSample, problem.id, activeCode, customInput, problem.content.sampleTestCases]);

  const handleSubmit = useCallback(() => {
    if (!activeLanguage) return;
    if (!session?.user) {
      toast.error("Sign in to submit solutions");
      return;
    }
    createSubmission.mutate({
      problemId: problem.id,
      languageCode: activeLanguage,
      sourceCode: activeCode,
      stdin: customInput,
    });
  }, [activeLanguage, session, createSubmission, problem.id, activeCode, customInput]);

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
      saveDraftMutation.mutate({
        problemId: problem.id,
        languageCode: activeLanguage,
        sourceCode: activeCode,
        cursorOffset: 0,
        savedVia,
      });
    },
    [session?.user, saveDraftMutation, problem.id, activeLanguage, activeCode],
  );

  const activeResult =
    viewMode === "run"
      ? sampleResult
      : currentSubmissionResult ?? lastSubmission;

  return (
    <TooltipProvider>
      <section
        id="editor"
        className="rounded-3xl border border-dashed border-primary/40 bg-card/80 p-6 shadow-lg shadow-primary/5"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Ready to solve</p>
            <h2 className="text-2xl font-semibold tracking-tight">{problem.title}</h2>
          </div>
          <Badge variant="outline" className="rounded-full">
            {problem.difficulty ?? "Unrated"}
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDrawerOpen(true)}
              className="gap-2"
            >
              <BookOpen className="h-4 w-4" />
              Statement
            </Button>
            <PreferencesMenu
              preferences={preferences}
              onChange={setPreferences}
            />
          </div>
        </div>

        {presenceWarning ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-400/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Another tab is editing this problem. To avoid overwriting drafts, close other sessions.
          </div>
        ) : null}
        {isOffline ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-sky-400/40 bg-sky-500/10 px-4 py-3 text-sm text-sky-700 dark:text-sky-200">
            <TimerReset className="h-4 w-4 shrink-0" />
            Offline mode — drafts stay local and sample runs fall back to the local simulator.
          </div>
        ) : null}
        {requiresManualReview ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-purple-400/40 bg-purple-500/10 px-4 py-3 text-sm text-purple-800 dark:text-purple-200">
            <Gavel className="h-4 w-4 shrink-0" />
            {manualOnly
              ? "This problem is reviewed manually. Expect longer turnaround while a curator scores your submission."
              : "Hybrid judging enabled — the auto judge runs first, followed by a manual reviewer."}
          </div>
        ) : null}

        <div className="mt-6">
          <ResizablePanelGroup direction="horizontal" className="h-full min-h-[560px]">
            <ResizablePanel defaultSize={65} minSize={55} className="pr-3">
              <EditorColumn
                activeLanguage={activeLanguage}
                languageOptions={languageOptions}
                onLanguageChange={setActiveLanguage}
                code={activeCode}
                onChange={(next) =>
                  setCodeByLanguage((prev) => ({ ...prev, [activeLanguage]: next }))
                }
                onCopy={handleCopy}
                onReset={handleReset}
                onSave={() => handleSaveDraft("manual")}
                appearance={editorTheme === "dark" ? "dark" : "light"}
                preferences={preferences}
                customInput={customInput}
                onInputChange={setCustomInput}
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
                  trackEvent("submission.timeline.open", {
                    problemId: problem.id,
                    submissionId,
                  });
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
      </section>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{problem.title}</DrawerTitle>
            <DrawerDescription>
              Quick reference of the statement without leaving the editor.
            </DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="max-h-[70vh] px-6 pb-6">
            <article className="prose prose-sm dark:prose-invert">
              <pre>{problem.content.statement}</pre>
            </article>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    </TooltipProvider>
  );
}


function EditorColumn(props: {
  activeLanguage: SupportedLanguage;
  languageOptions: Array<{ code: SupportedLanguage; displayName: string; fileExtension: string | null }>;
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
    autosaveState,
    runInProgress,
    submitInProgress,
    onRun,
    onSubmit,
    consoleLines,
  } = props;
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="rounded-2xl border border-white/10 bg-background/80 p-4 shadow-inner shadow-black/5">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={activeLanguage} onValueChange={(value) => onLanguageChange(value as SupportedLanguage)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languageOptions.map((language) => (
                <SelectItem key={language.code} value={language.code}>
                  {language.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-3 py-1 transition",
                autosaveState === "saving"
                  ? "text-amber-500"
                  : autosaveState === "saved"
                    ? "text-emerald-500"
                    : "text-muted-foreground",
              )}
            >
              <span className="h-2 w-2 rounded-full bg-current" />
              {autosaveState === "saving" ? "Saving…" : "Saved"}
            </span>
            <Button variant="ghost" size="sm" onClick={onReset}>
              Reset
            </Button>
            <Button variant="ghost" size="sm" onClick={onCopy} className="gap-2">
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            <Button variant="ghost" size="sm" onClick={onSave} className="gap-2">
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-white/5 bg-black/20">
          <CodeEditor
            value={code}
            onChange={onChange}
            language={activeLanguage}
            minHeight={420}
            appearance={appearance}
            fontSize={preferences.fontSize}
            wrapLines={preferences.wrapLines}
            showMinimap={preferences.showMinimap}
            ariaLabel="In-browser code editor"
          />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Custom Input</label>
            <Textarea
              value={customInput}
              onChange={(event) => onInputChange(event.target.value)}
              className="mt-1 h-24 resize-none"
              placeholder="stdin sent to the runner"
            />
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-end">
            <Button variant="outline" className="gap-2" onClick={onRun} disabled={runInProgress}>
              {runInProgress ? <Spinner className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              Run Samples
            </Button>
            <Button className="gap-2" onClick={onSubmit} disabled={submitInProgress}>
              {submitInProgress ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
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
      <div className="rounded-2xl border border-white/5 bg-black/20 p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          Console output will appear here.
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-white/5 bg-black/30 p-4 font-mono text-sm text-muted-foreground">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground/80">
        <Terminal className="h-3.5 w-3.5" />
        Console
      </div>
      <div className="mt-3 space-y-1 overflow-auto">
        {lines.map((line, index) => (
          <p key={`${line}-${index}`} className="whitespace-pre-wrap text-foreground/80">
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
    <div className="flex h-full flex-col gap-4">
      <Tabs value={viewMode} onValueChange={(value) => onViewModeChange(value as "run" | "submission")}>
        <TabsList className="w-full justify-between">
          <TabsTrigger value="run">Run output</TabsTrigger>
          <TabsTrigger value="submission">Judge</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="rounded-2xl border border-white/5 bg-background/80 p-4">
        <ResultPanel result={result} />
      </div>
      <Tabs defaultValue="description" className="flex-1">
        <TabsList className="w-full justify-around">
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="editorial" disabled={!problem.editorialIsReleased}>
            Editorial
          </TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="drafts">My Code</TabsTrigger>
        </TabsList>
        <TabsContent value="description" className="rounded-2xl border border-white/5 bg-background/60 p-4 text-sm text-muted-foreground">
          <ScrollArea className="h-64">
            <p className="whitespace-pre-line text-foreground">{problem.content.statement}</p>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="editorial" className="rounded-2xl border border-white/5 bg-background/60 p-4">
          {problem.editorialIsReleased && problem.content.editorial ? (
            <ScrollArea className="h-64 text-sm text-foreground">
              <p className="whitespace-pre-line">{problem.content.editorial}</p>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground">
              Editorial locked{problem.editorialReleaseAt ? ` until ${format(new Date(problem.editorialReleaseAt), "PPP p")}` : ""}. View the full write-up once it is released.
            </p>
          )}
        </TabsContent>
        <TabsContent value="submissions">
          <div className="h-64 space-y-3 overflow-auto rounded-2xl border border-white/5 bg-background/80 p-4 text-sm">
            {submissionHistory.length === 0 ? (
              <p className="text-muted-foreground">No submissions yet.</p>
            ) : (
              submissionHistory.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onSelectSubmission(entry.id)}
                  className="w-full rounded-xl border border-white/5 bg-card/70 px-3 py-2 text-left transition hover:border-primary/40"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(entry.createdAt).toLocaleString()}</span>
                    <SubmissionStatusBadge
                      verdict={entry.verdictCode}
                      status={entry.status}
                      size="sm"
                    />
                  </div>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {entry.verdictCode ?? "Pending"} • {entry.languageCode.toUpperCase()}
                  </p>
                </button>
              ))
            )}
            <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
              <Link href={`/problems/${problem.slug}/submissions`}>View history</Link>
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="drafts">
          <div className="h-64 space-y-3 overflow-auto rounded-2xl border border-white/5 bg-background/80 p-4 text-sm">
            {drafts.length === 0 ? (
              <p className="text-muted-foreground">No cloud drafts yet.</p>
            ) : (
              drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="rounded-xl border border-white/5 bg-card/70 p-3 text-left"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(draft.updatedAt).toLocaleString()}</span>
                    <Badge variant="outline">{draft.savedVia}</Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 whitespace-pre-wrap font-mono text-xs text-foreground/80">
                    {draft.sourceCode}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 gap-2"
                    onClick={() => onRestoreDraft(draft.sourceCode)}
                  >
                    <History className="h-4 w-4" />
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
      <div className="text-sm text-muted-foreground">
        Run samples or submit to see verdicts.
      </div>
    );
  }

  const summary = result.summary;
  const variant = result.kind === "sample" ? "Samples" : "Judge";
  if (!summary) {
    return (
      <div className="rounded-xl border border-dashed border-purple-400/40 bg-purple-500/5 p-4 text-sm text-purple-900 dark:text-purple-100">
        Manual review pending — we'll update this panel once a reviewer posts a verdict.
      </div>
    );
  }
  const verdict = summary.verdictCode ?? "WA";
  const statusLabel = result.kind === "sample" ? "SUCCEEDED" : result.status;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-card/80 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{variant}</p>
            <p className="text-lg font-semibold text-foreground">{verdict}</p>
          </div>
          <SubmissionStatusBadge verdict={summary.verdictCode ?? null} status={statusLabel} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-4 text-xs text-muted-foreground">
          <div>
            <p>Passed</p>
            <p className="text-base font-medium text-foreground">{summary?.passed ?? 0}</p>
          </div>
          <div>
            <p>Failed</p>
            <p className="text-base font-medium text-foreground">{summary?.failed ?? 0}</p>
          </div>
          <div>
            <p>Runtime</p>
            <p className="text-base font-medium text-foreground">
              {summary?.runtimeMs ? `${summary.runtimeMs} ms` : "—"}
            </p>
          </div>
        </div>
      </div>
      <div>
        {result.cases.length === 0 ? (
          <p className="text-xs text-muted-foreground">No per-test details yet.</p>
        ) : (
          <div className="space-y-2">
            {result.cases.map((test) => (
              <motion.div
                key={`${test.ordinal}-${test.verdictCode}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-white/5 bg-background/60 p-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">Test #{test.ordinal}</p>
                <SubmissionStatusBadge verdict={test.verdictCode} status={test.status} size="sm" />
                </div>
                {test.inputPreview && (
                  <p className="mt-2 text-muted-foreground">
                    <span className="font-semibold text-foreground">In:</span> {test.inputPreview}
                  </p>
                )}
                {test.actualOutput && (
                  <p className="mt-1 text-muted-foreground">
                    <span className="font-semibold text-foreground">Out:</span>{" "}
                    {test.actualOutput}
                  </p>
                )}
                {test.stderr ? (
                  <p className="mt-1 text-rose-400">stderr: {test.stderr}</p>
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
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Preferences
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 space-y-2 p-3 text-sm">
        <DropdownMenuLabel>Editor theme</DropdownMenuLabel>
        <div className="flex gap-2">
          {(["system", "light", "dark"] as const).map((theme) => (
            <Button
              key={theme}
              variant={preferences.theme === theme ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => onChange({ ...preferences, theme })}
            >
              {theme}
            </Button>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Font size</DropdownMenuLabel>
        <Input
          type="range"
          min={12}
          max={20}
          value={preferences.fontSize}
          onChange={(event) =>
            onChange({ ...preferences, fontSize: Number(event.target.value) })
          }
        />
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between text-xs">
          <span>Wrap lines</span>
          <Switch
            checked={preferences.wrapLines}
            onCheckedChange={(checked) => onChange({ ...preferences, wrapLines: checked })}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span>Show minimap</span>
          <Switch
            checked={preferences.showMinimap}
            onCheckedChange={(checked) => onChange({ ...preferences, showMinimap: checked })}
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
