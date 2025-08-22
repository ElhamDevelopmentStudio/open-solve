"use client";

import { CodeEditor } from "@/components/code/code-editor";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import {
  Eye,
  FileText,
  Info,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "@/components/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { staffConfig } from "@/config/staff";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/constants";
import { getDefaultCodeStub } from "@/lib/problems/editor-presets";
import { invalidateTags } from "@/lib/react-query/invalidation";
import { uploadImageToMinio } from "@/lib/storage/minio-upload";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import type { ProblemVisibility, Tag } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { TagInput, type Tag as EmblorTag } from "emblor";
import { marked } from "marked";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import TurndownService from "turndown";

type TestCaseRow = {
  id?: string;
  ordinal: number;
  input: string;
  output: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  strength?: number | null;
  kind: "sample" | "hidden";
};

const turndownService = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});

marked.setOptions({ breaks: true, gfm: true });

const markdownToHtml = (value: string) =>
  (marked.parse(value ?? "", { async: false }) as string) || "";

const htmlToMarkdown = (value: string) => (value ? turndownService.turndown(value) : "");

const generateLocalId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const SUPPORTED_LANGUAGE_SET = new Set<SupportedLanguage>(SUPPORTED_LANGUAGES);
const isSupportedLanguage = (code: string): code is SupportedLanguage =>
  SUPPORTED_LANGUAGE_SET.has(code as SupportedLanguage);

type JudgeMode = "AUTO" | "MANUAL" | "HYBRID";

const JUDGE_MODE_OPTIONS: Array<{
  value: JudgeMode;
  title: string;
  description: string;
}> = [
  {
    value: "AUTO",
    title: "Auto judge",
    description: "Fully automated judging. Ideal for traditional algorithmic problems.",
  },
  {
    value: "HYBRID",
    title: "Hybrid",
    description: "Run automated checks first, then require a manual reviewer verdict.",
  },
  {
    value: "MANUAL",
    title: "Manual only",
    description: "Skip the worker entirely and queue every submission for a curator.",
  },
];

export function ProblemEditorShell({ problemId }: { problemId: string }) {
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();
  const invalidateProblemQueries = useCallback(() => {
    void utils.staff.problems.list.invalidate();
    void utils.staff.problems.get.invalidate({ id: problemId });
    invalidateTags(queryClient, ["problems", "problemDetail", "tags", "staffProblems"]);
  }, [problemId, queryClient, utils]);
  const { data, isLoading } = trpc.staff.problems.get.useQuery({ id: problemId });
  const { data: metadata } = trpc.problems.filterMetadata.useQuery();
  const { data: languageCatalog } = trpc.staff.problems.languagesCatalog.useQuery();

  const saveContent = trpc.staff.problems.saveContent.useMutation({
    onSuccess: () => {
      invalidateProblemQueries();
      toast.success("Content saved");
    },
  });
  const saveMetadata = trpc.staff.problems.saveMetadata.useMutation({
    onSuccess: () => {
      invalidateProblemQueries();
      toast.success("Metadata saved");
    },
  });
  const saveTests = trpc.staff.problems.updateTests.useMutation({
    onSuccess: () => {
      invalidateProblemQueries();
      toast.success("Tests updated");
    },
  });
  const submitForReview = trpc.staff.problems.submitForReview.useMutation({
    onSuccess: () => {
      invalidateProblemQueries();
      toast.success("Sent to review");
    },
  });
  const requestChanges = trpc.staff.problems.requestChanges.useMutation({
    onSuccess: () => {
      invalidateProblemQueries();
      toast.success("Returned to draft");
    },
  });
  const approve = trpc.staff.problems.approve.useMutation({
    onSuccess: () => {
      invalidateProblemQueries();
      toast.success("Approved");
    },
  });
  const publish = trpc.staff.problems.publish.useMutation({
    onSuccess: () => {
      invalidateProblemQueries();
      toast.success("Published");
    },
  });
  const updateLanguagesMutation = trpc.staff.problems.updateLanguages.useMutation({
    onSuccess: () => {
      invalidateProblemQueries();
      toast.success("Languages saved");
    },
  });
  const addCurator = trpc.staff.problems.addCurator.useMutation({
    onSuccess: () => {
      invalidateProblemQueries();
      toast.success("Curator added");
    },
  });
  const removeCurator = trpc.staff.problems.removeCurator.useMutation({
    onSuccess: () => {
      invalidateProblemQueries();
      toast.success("Curator removed");
    },
  });

  const [contentState, setContentState] = useState({
    title: "",
    statement: "",
    constraints: "",
    hints: "",
    editorial: "",
    samples: [] as Array<{ input: string; output: string; explanation?: string | null }>,
  });
  const [metadataState, setMetadataState] = useState<{
    slug: string;
    visibility: ProblemVisibility;
    difficultyCode: string;
    judgeMode: JudgeMode;
  }>({
    slug: "",
    visibility: "INTERNAL",
    difficultyCode: "",
    judgeMode: "AUTO",
  });
  const [metadataTags, setMetadataTags] = useState<EmblorTag[]>([]);
  const [activeTagIndex, setActiveTagIndex] = useState<number | null>(null);
  const [testCases, setTestCases] = useState<TestCaseRow[]>([]);
  const [testCaseModalOpen, setTestCaseModalOpen] = useState(false);
  const [activeTestCase, setActiveTestCase] = useState<TestCaseRow | null>(null);
  const [languageState, setLanguageState] = useState<
    Record<string, { enabled: boolean; codeStub: string }>
  >({});
  const [newCuratorHandle, setNewCuratorHandle] = useState("");

  useEffect(() => {
    if (!data) return;
    startTransition(() => {
      setContentState({
        title: data.version.title,
        statement: data.version.statement,
        constraints: data.version.constraints,
        hints: data.version.hints ?? "",
        editorial: data.version.editorial ?? "",
        samples:
          (data.version.samples as Array<{
            input: string;
            output: string;
            explanation?: string | null;
          }>) ?? [],
      });
      setMetadataState({
        slug: data.slug,
        visibility: data.visibility,
        difficultyCode: data.difficulty ?? "",
        judgeMode: (data.judgeMode as JudgeMode) ?? "AUTO",
      });
      setMetadataTags(
        data.tags.map((tag: Tag) => ({
          id: tag.slug,
          text: tag.name ?? tag.slug,
        })),
      );
      const sampleRows =
        data.tests.samples.length > 0
          ? data.tests.samples.map((sample) => ({
              id: sample.id,
              ordinal: sample.ordinal,
              input: sample.input,
              output: sample.output,
              timeLimitMs: sample.timeLimitMs,
              memoryLimitMb: sample.memoryLimitMb,
              strength: 0,
              kind: "sample" as const,
            }))
          : [
              {
                id: generateLocalId(),
                ordinal: 1,
                input: "",
                output: "",
                timeLimitMs: 2000,
                memoryLimitMb: 256,
                strength: 0,
                kind: "sample" as const,
              },
            ];
      const hiddenRows =
        data.tests.hidden.length > 0
          ? data.tests.hidden.map((test) => ({
              id: test.id,
              ordinal: test.ordinal,
              input: test.input,
              output: test.output,
              timeLimitMs: test.timeLimitMs,
              memoryLimitMb: test.memoryLimitMb,
              strength: test.strength ?? 100,
              kind: "hidden" as const,
            }))
          : [
              {
                id: generateLocalId(),
                ordinal: 1,
                input: "",
                output: "",
                timeLimitMs: 2000,
                memoryLimitMb: 256,
                strength: 100,
                kind: "hidden" as const,
              },
            ];
      setTestCases([...sampleRows, ...hiddenRows]);
    });
  }, [data]);

  useEffect(() => {
    if (!data || !languageCatalog) {
      return;
    }
    const nextState: Record<string, { enabled: boolean; codeStub: string }> = {};
    languageCatalog.forEach((language) => {
      if (!isSupportedLanguage(language.code)) {
        return;
      }
      const assignment = data.languages.find((entry) => entry.code === language.code);
      nextState[language.code] = {
        enabled: Boolean(assignment),
        codeStub: assignment?.codeStub ?? getDefaultCodeStub(language.code),
      };
    });
    startTransition(() => setLanguageState(nextState));
  }, [data, languageCatalog]);

  const lintIssues = useMemo(() => {
    const issues: string[] = [];
    if (contentState.statement.length < 200) {
      issues.push("Statement should be at least 200 characters.");
    }
    if (contentState.samples.length === 0) {
      issues.push("Add at least one sample for the public statement.");
    }
    if (metadataTags.length === 0) {
      issues.push("Add at least one tag.");
    }
    return issues;
  }, [contentState.statement.length, contentState.samples.length, metadataTags.length]);

  const hiddenStrengthTotal = testCases
    .filter((row) => row.kind === "hidden")
    .reduce((sum, row) => sum + (row.strength ?? 0), 0);
  const sampleCount = useMemo(
    () => testCases.filter((row) => row.kind === "sample").length,
    [testCases],
  );
  const hiddenCount = useMemo(
    () => testCases.filter((row) => row.kind === "hidden").length,
    [testCases],
  );
  const orderedTestCases = useMemo(() => {
    return [...testCases].sort((a, b) => {
      if (a.ordinal === b.ordinal) {
        if (a.kind === b.kind) return 0;
        return a.kind === "sample" ? -1 : 1;
      }
      return a.ordinal - b.ordinal;
    });
  }, [testCases]);
  const tagSuggestions = useMemo(
    () =>
      metadata?.tags.map((tag) => ({
        id: tag.slug,
        text: `${tag.name} (${tag.problemCount})`,
      })) ?? [],
    [metadata],
  );

  const enabledLanguageCount = Object.values(languageState).filter((entry) => entry.enabled).length;
  const languageEntries =
    languageCatalog?.filter((language) => isSupportedLanguage(language.code)) ?? [];
  const statementImageUpload = useCallback(async (file: File) => uploadImageToMinio(file), []);
  const getNextOrdinal = useCallback(() => {
    if (testCases.length === 0) {
      return 1;
    }
    return Math.max(...testCases.map((test) => test.ordinal)) + 1;
  }, [testCases]);

  const openTestCaseModal = useCallback(
    (test?: TestCaseRow) => {
      if (test) {
        setActiveTestCase(test);
      } else {
        setActiveTestCase({
          ordinal: getNextOrdinal(),
          input: "",
          output: "",
          timeLimitMs: 2000,
          memoryLimitMb: 256,
          strength: 100,
          kind: "hidden",
        });
      }
      setTestCaseModalOpen(true);
    },
    [getNextOrdinal],
  );

  const addPublicSample = () => {
    setContentState((state) => ({
      ...state,
      samples: [...state.samples, { input: "", output: "" }],
    }));
  };

  const removePublicSample = (index: number) => {
    setContentState((state) => ({
      ...state,
      samples: state.samples.filter((_, idx) => idx !== index),
    }));
  };

  const updateSampleField = (index: number, field: "input" | "output", html: string) => {
    setContentState((state) => {
      const next = [...state.samples];
      next[index] = { ...next[index], [field]: htmlToMarkdown(html) };
      return { ...state, samples: next };
    });
  };

  const summarizeTestValue = (value: string) => {
    if (!value) return "Empty";
    if (value.startsWith("inline://")) return value;
    const plain = value
      .replace(/[`*_>#]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!plain) return "Empty";
    return plain.length > 80 ? `${plain.slice(0, 80)}…` : plain;
  };

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleSaveContent = () => {
    saveContent.mutate({
      problemId,
      title: contentState.title,
      statement: contentState.statement,
      constraints: contentState.constraints,
      hints: contentState.hints || null,
      editorial: contentState.editorial || null,
      samples: contentState.samples,
    });
  };

  const handleSaveMetadata = () => {
    saveMetadata.mutate({
      problemId,
      slug: metadataState.slug,
      visibility: metadataState.visibility as typeof data.visibility,
      difficultyCode: metadataState.difficultyCode || null,
      tagSlugs: metadataTags.map((tag) => tag.id),
      judgeMode: metadataState.judgeMode,
    });
  };

  const serializeTestCase = (test: TestCaseRow) => {
    const { id: unusedId, kind: unusedKind, ...payload } = test;
    void unusedId;
    void unusedKind;
    return payload;
  };

  const handleSaveTests = () => {
    const sampleCases = testCases.filter((test) => test.kind === "sample");
    const hiddenCases = testCases.filter((test) => test.kind === "hidden");
    saveTests.mutate({
      problemId,
      samples: sampleCases.map((sample) => ({ ...serializeTestCase(sample), strength: 0 })),
      hidden: hiddenCases.map((test) => ({
        ...serializeTestCase(test),
        strength: test.strength ?? 0,
      })),
    });
  };

  const handlePersistTestCase = (draft: TestCaseRow) => {
    setTestCases((prev) => {
      const identifier = draft.id ?? generateLocalId();
      const nextEntry = { ...draft, id: identifier };
      const existingIndex = prev.findIndex((entry) => entry.id === identifier);
      if (existingIndex === -1) {
        return [...prev, nextEntry];
      }
      return prev.map((entry) => (entry.id === identifier ? nextEntry : entry));
    });
    setActiveTestCase(null);
    setTestCaseModalOpen(false);
  };

  const handleDeleteTestCase = (id?: string) => {
    if (!id) return;
    setTestCases((prev) => prev.filter((test) => test.id !== id));
    setActiveTestCase((prev) => (prev && prev.id === id ? null : prev));
    setTestCaseModalOpen(false);
  };

  const handleTestModalToggle = (open: boolean) => {
    setTestCaseModalOpen(open);
    if (!open) {
      setActiveTestCase(null);
    }
  };

  const toggleLanguage = (code: SupportedLanguage, enabled: boolean) => {
    setLanguageState((state) => ({
      ...state,
      [code]: {
        enabled,
        codeStub: state[code]?.codeStub ?? getDefaultCodeStub(code),
      },
    }));
  };

  const updateLanguageStub = (code: SupportedLanguage, value: string) => {
    setLanguageState((state) => ({
      ...state,
      [code]: {
        enabled: state[code]?.enabled ?? true,
        codeStub: value,
      },
    }));
  };

  const resetLanguageStub = (code: SupportedLanguage) => {
    setLanguageState((state) => ({
      ...state,
      [code]: {
        enabled: state[code]?.enabled ?? true,
        codeStub: getDefaultCodeStub(code),
      },
    }));
  };

  const handleSaveLanguages = () => {
    const payload = Object.entries(languageState)
      .filter(([code, config]) => config.enabled && isSupportedLanguage(code))
      .map(([code, config]) => ({
        code,
        codeStub: config.codeStub ?? getDefaultCodeStub(code as SupportedLanguage),
      }));
    if (payload.length === 0) {
      toast.error("Select at least one language.");
      return;
    }
    updateLanguagesMutation.mutate({
      problemId,
      languages: payload,
    });
  };

  const handleAddCurator = () => {
    const trimmed = newCuratorHandle.trim();
    if (!trimmed) {
      toast.error("Enter a handle.");
      return;
    }
    addCurator.mutate(
      { problemId, handle: trimmed },
      {
        onSuccess: () => setNewCuratorHandle(""),
      },
    );
  };

  const handleRemoveCurator = (userId: string) => {
    removeCurator.mutate({ problemId, userId });
  };

  return (
    <div className="mx-auto max-w-screen-2xl space-y-8 px-4 pb-10 pt-2 font-mono text-foreground lg:px-10">
      <section className="border-2 border-border bg-background p-6 shadow-sm shadow-primary/20 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-primary/80">
              {staffConfig.problems.editor.marker}
              <Badge className="rounded-none border-2 border-primary/40 bg-background px-3 py-1 text-[10px] tracking-[0.2em] text-muted-foreground">
                {staffConfig.problems.badge}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase text-muted-foreground">{data.slug}</p>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                {contentState.title || data.version.title}
              </h1>
              <p className="max-w-3xl text-sm text-muted-foreground">
                {staffConfig.problems.editor.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-2 uppercase">
                {data.state.toLowerCase()}
              </Badge>
              <Badge variant="outline" className="border-2 uppercase">
                {data.visibility.toLowerCase()}
              </Badge>
              {metadataState.difficultyCode ? (
                <Badge variant="secondary" className="border-2 border-border uppercase">
                  {metadataState.difficultyCode.toLowerCase()}
                </Badge>
              ) : (
                <Badge variant="secondary" className="border-2 border-border uppercase">
                  unrated
                </Badge>
              )}
            </div>
          </div>
          <div className="grid h-full w-full gap-px bg-border/50 sm:grid-cols-2 lg:w-[420px]">
            <div className="bg-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80">
                Tests
              </p>
              <p className="text-2xl font-black">{orderedTestCases.length}</p>
              <p className="text-xs text-muted-foreground">
                {sampleCount} samples · {hiddenCount} hidden
              </p>
            </div>
            <div className="bg-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80">
                Languages
              </p>
              <p className="text-2xl font-black">{enabledLanguageCount}</p>
              <p className="text-xs text-muted-foreground">workspace ready</p>
            </div>
            <div className="bg-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80">
                Lint
              </p>
              <p className="text-2xl font-black">{lintIssues.length}</p>
              <p className="text-xs text-muted-foreground">issues to resolve</p>
            </div>
            <div className="bg-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80">
                Reviews
              </p>
              <p className="text-2xl font-black">{data.reviews.length}</p>
              <p className="text-xs text-muted-foreground">recent decisions logged</p>
            </div>
          </div>
        </div>
      </section>

      <Tabs defaultValue="content" className="space-y-6">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
          <TabsTrigger value="access">Access</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Statement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <FieldLabel label="Problem title" htmlFor="problem-title" />
                <Input
                  id="problem-title"
                  value={contentState.title}
                  onChange={(event) =>
                    setContentState((state) => ({ ...state, title: event.target.value }))
                  }
                  placeholder="e.g. Interval Maestro"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel
                  label="Statement"
                  htmlFor="problem-statement"
                  tooltip="Supports Markdown, KaTeX, links, and inline imagery."
                />
                <RichTextEditor
                  className="min-h-80"
                  content={markdownToHtml(contentState.statement)}
                  onChange={(html) =>
                    setContentState((state) => ({ ...state, statement: htmlToMarkdown(html) }))
                  }
                  placeholder="Describe the full problem statement..."
                  enableImages
                  onImageUpload={statementImageUpload}
                />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel
                    label="Constraints"
                    htmlFor="problem-constraints"
                    tooltip="Highlight limits, ranges, and invariants readers should consider."
                  />
                  <RichTextEditor
                    content={markdownToHtml(contentState.constraints)}
                    onChange={(html) =>
                      setContentState((state) => ({ ...state, constraints: htmlToMarkdown(html) }))
                    }
                    placeholder="N ≤ 2 · 10^5, edges ≤ 3 · 10^5..."
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel
                    label="Hints"
                    htmlFor="problem-hints"
                    tooltip="Share optional nudges or clarifications for the audience."
                  />
                  <RichTextEditor
                    content={markdownToHtml(contentState.hints)}
                    onChange={(html) =>
                      setContentState((state) => ({ ...state, hints: htmlToMarkdown(html) }))
                    }
                    placeholder="Try sorting intervals before sweeping..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <FieldLabel
                  label="Editorial"
                  htmlFor="problem-editorial"
                  tooltip="Internal draft for the walkthrough; rich formatting coming soon."
                />
                <Textarea
                  id="problem-editorial"
                  value={contentState.editorial}
                  onChange={(event) =>
                    setContentState((state) => ({ ...state, editorial: event.target.value }))
                  }
                  placeholder="Explain the intended solution and key observations."
                  rows={6}
                />
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Public samples</p>
                    <p className="text-xs text-muted-foreground">
                      These run in the reader before submission.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={addPublicSample}>
                    <Plus className="mr-2 h-4 w-4" /> Add sample
                  </Button>
                </div>
                <div className="space-y-4">
                  {contentState.samples.map((sample, index) => (
                    <div
                      key={`sample-${index}`}
                      className="space-y-4 border-2 border-border bg-accent/30 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">Sample #{index + 1}</p>
                        {contentState.samples.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removePublicSample(index)}
                            className="text-muted-foreground"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="sr-only">Remove sample</span>
                          </Button>
                        ) : null}
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <FieldLabel label="Input" htmlFor={`sample-input-${index}`} />
                          <RichTextEditor
                            content={markdownToHtml(sample.input)}
                            onChange={(html) => updateSampleField(index, "input", html)}
                            placeholder="Input shown to solvers"
                          />
                        </div>
                        <div className="space-y-2">
                          <FieldLabel label="Output" htmlFor={`sample-output-${index}`} />
                          <RichTextEditor
                            content={markdownToHtml(sample.output)}
                            onChange={(html) => updateSampleField(index, "output", html)}
                            placeholder="Expected output"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {lintIssues.length > 0 ? (
                    <div className="flex items-center gap-2 text-warning">
                      <ShieldAlert className="h-4 w-4" />
                      <span>{lintIssues.length} issue(s) detected.</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-success">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Structure looks solid.</span>
                    </div>
                  )}
                </div>
                <Button onClick={handleSaveContent} disabled={saveContent.isPending}>
                  {saveContent.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save content
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="access" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Collaborators</CardTitle>
              <p className="text-sm text-muted-foreground">
                Only the author or an admin can manage curator access.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {data.curators.map((curator) => (
                  <div
                    key={curator.userId}
                    className="flex items-center justify-between border-2 border-border bg-accent/20 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">
                        {curator.handle ?? curator.name ?? curator.userId.slice(0, 6)}
                      </p>
                      <p className="text-xs uppercase text-muted-foreground">
                        {curator.isOwner ? "Owner" : "Curator"}
                      </p>
                    </div>
                    {!curator.isOwner ? (
                      <ConfirmDialog
                        variant="warning"
                        title={staffConfig.problems.editor.confirm.removeCurator}
                        confirmLabel={staffConfig.problems.editor.actions.removeCurator}
                        onConfirm={() => handleRemoveCurator(curator.userId)}
                        loading={removeCurator.isPending}
                        trigger={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={removeCurator.isPending}
                          >
                            {removeCurator.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            <span className="sr-only">Remove curator</span>
                          </Button>
                        }
                      />
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-3 md:flex-row">
                <Input
                  value={newCuratorHandle}
                  onChange={(event) => setNewCuratorHandle(event.target.value)}
                  placeholder="Enter curator handle"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddCurator();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={handleAddCurator}
                  disabled={addCurator.isPending}
                  className="md:w-40"
                >
                  {addCurator.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  Add curator
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Languages & code stubs</CardTitle>
              <p className="text-sm text-muted-foreground">
                Control which runtimes appear in the solver and ship curated boilerplate for each.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {!languageCatalog ? (
                <p className="text-sm text-muted-foreground">Loading languages…</p>
              ) : languageEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No runtimes configured.</p>
              ) : (
                languageEntries.map((language) => {
                  const state = languageState[language.code] ?? {
                    enabled: false,
                    codeStub: getDefaultCodeStub(language.code as SupportedLanguage),
                  };
                  const typedCode = language.code as SupportedLanguage;
                  return (
                    <div
                      key={language.code}
                      className="border-2 border-border bg-card/50 p-4 shadow-inner shadow-primary/10"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{language.displayName}</p>
                          <p className="text-xs uppercase text-muted-foreground">{language.code}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`language-${language.code}`} className="text-xs">
                            Enabled
                          </Label>
                          <Switch
                            id={`language-${language.code}`}
                            checked={state.enabled}
                            onCheckedChange={(checked) => toggleLanguage(typedCode, checked)}
                          />
                        </div>
                      </div>
                      {state.enabled ? (
                        <div className="mt-4 space-y-3">
                          <CodeEditor
                            value={state.codeStub}
                            language={typedCode}
                            minHeight={260}
                            ariaLabel={`${language.displayName} stub`}
                            onChange={(value) => updateLanguageStub(typedCode, value)}
                          />
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => resetLanguageStub(typedCode)}
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Reset stub
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2 border-t-2 border-border pt-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
              <span>{enabledLanguageCount} language(s) selected</span>
              <Button
                type="button"
                onClick={handleSaveLanguages}
                disabled={updateLanguagesMutation.isPending || enabledLanguageCount === 0}
              >
                {updateLanguagesMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save workspace
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="metadata" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel
                    label="Slug"
                    htmlFor="problem-slug"
                    tooltip="Used in URLs and API identifiers. Stick to lowercase letters, numbers, and hyphens."
                  />
                  <Input
                    id="problem-slug"
                    value={metadataState.slug}
                    onChange={(event) =>
                      setMetadataState((state) => ({ ...state, slug: event.target.value }))
                    }
                    placeholder="interval-maestro"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel
                    label="Visibility"
                    tooltip="Controls whether the problem is internal, unlisted, or visible to everyone."
                  />
                  <Select
                    value={metadataState.visibility}
                    onValueChange={(value) =>
                      setMetadataState((state) => ({
                        ...state,
                        visibility: value as "PUBLIC" | "UNLISTED" | "INTERNAL",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUBLIC">Public</SelectItem>
                      <SelectItem value="UNLISTED">Unlisted</SelectItem>
                      <SelectItem value="INTERNAL">Internal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <FieldLabel
                    label="Difficulty"
                    tooltip="Appears on the reader page and in search filters."
                  />
                  <Select
                    value={metadataState.difficultyCode || "UNRATED"}
                    onValueChange={(value) =>
                      setMetadataState((state) => ({
                        ...state,
                        difficultyCode: value === "UNRATED" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNRATED">Unrated</SelectItem>
                      {metadata?.difficulties.map((difficulty) => (
                        <SelectItem key={difficulty} value={difficulty}>
                          {difficulty.charAt(0) + difficulty.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-3">
                <FieldLabel
                  label="Judge mode"
                  tooltip="Control how this problem's submissions are evaluated."
                />
                <RadioGroup
                  value={metadataState.judgeMode}
                  onValueChange={(value) =>
                    setMetadataState((state) => ({
                      ...state,
                      judgeMode: value as JudgeMode,
                    }))
                  }
                  className="grid gap-3 md:grid-cols-3"
                >
                  {JUDGE_MODE_OPTIONS.map((option) => {
                    const id = `judge-mode-${option.value.toLowerCase()}`;
                    const isActive = metadataState.judgeMode === option.value;
                    return (
                      <Label
                        key={option.value}
                        htmlFor={id}
                        className={cn(
                          "cursor-pointer border bg-card/50 p-3 text-left transition hover:border-primary/60",
                          isActive ? "border-primary shadow-sm" : "border-border/60",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <RadioGroupItem id={id} value={option.value} />
                          <div>
                            <p className="font-medium text-foreground">{option.title}</p>
                            <p className="text-xs text-muted-foreground">{option.description}</p>
                          </div>
                        </div>
                      </Label>
                    );
                  })}
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <FieldLabel
                  label="Tags"
                  tooltip="Tag the key topics or companies this problem relates to. Minimum one tag."
                />
                <TagInput
                  placeholder="Add a topic"
                  tags={metadataTags}
                  setTags={setMetadataTags}
                  autocompleteOptions={tagSuggestions}
                  activeTagIndex={activeTagIndex}
                  setActiveTagIndex={setActiveTagIndex}
                  styleClasses={{
                    input: "w-full",
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Need inspiration? Start typing to search across {tagSuggestions.length} curated
                  tags.
                </p>
              </div>
              <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>{metadataTags.length} tag(s) selected</span>
                <Button onClick={handleSaveMetadata} disabled={saveMetadata.isPending}>
                  {saveMetadata.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save metadata
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Judge test cases</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Maintain both public samples and hidden cases from a single table.
                </p>
              </div>
              <Button onClick={() => openTestCaseModal()}>
                <Plus className="mr-2 h-4 w-4" /> Add test case
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertTitle>Inline storage references</AlertTitle>
                <AlertDescription>
                  Values such as <code>inline://interval-maestro/v1/case-1.in</code> reference blobs
                  uploaded to storage. You can keep the pointer or replace it with raw text directly
                  in the modal below.
                </AlertDescription>
              </Alert>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <Badge variant="secondary">Samples · {sampleCount}</Badge>
                <Badge variant="outline">Hidden · {hiddenCount}</Badge>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Input / Output</TableHead>
                      <TableHead>Limits</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderedTestCases.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-10 text-center text-sm text-muted-foreground"
                        >
                          No test cases yet. Start by adding a public sample.
                        </TableCell>
                      </TableRow>
                    ) : (
                      orderedTestCases.map((test) => (
                        <TableRow key={test.id ?? `${test.kind}-${test.ordinal}`}>
                          <TableCell className="font-medium">#{test.ordinal}</TableCell>
                          <TableCell className="space-y-1">
                            <Badge variant={test.kind === "sample" ? "outline" : "secondary"}>
                              {test.kind === "sample" ? "Sample" : "Hidden"}
                            </Badge>
                            {test.kind === "hidden" && typeof test.strength === "number" ? (
                              <p className="text-xs text-muted-foreground">
                                Strength {test.strength}
                              </p>
                            ) : null}
                          </TableCell>
                          <TableCell className="space-y-2 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">Input</p>
                              <p>{summarizeTestValue(test.input)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Output</p>
                              <p>{summarizeTestValue(test.output)}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <p className="font-medium">{test.timeLimitMs} ms</p>
                            <p className="text-xs text-muted-foreground">{test.memoryLimitMb} MB</p>
                          </TableCell>
                          <TableCell className="space-x-1 text-right">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openTestCaseModal(test)}
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View test case</span>
                            </Button>
                            <ConfirmDialog
                              variant="destructive"
                              title={staffConfig.problems.editor.confirm.deleteTestCase}
                              description={
                                staffConfig.problems.editor.confirmDetails.deleteTestCase
                              }
                              confirmLabel="Delete case"
                              onConfirm={() => handleDeleteTestCase(test.id)}
                              trigger={
                                <Button variant="ghost" size="icon-sm">
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Remove test case</span>
                                </Button>
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 border-t-2 border-border pt-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-foreground">{hiddenCount} hidden case(s)</p>
                <p>Strength budget: {hiddenStrengthTotal}</p>
              </div>
              <Button onClick={handleSaveTests} disabled={saveTests.isPending}>
                {saveTests.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save tests
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="review">
          <Card>
            <CardHeader>
              <CardTitle>Review workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <ConfirmDialog
                  variant="warning"
                  title={staffConfig.problems.editor.confirm.submit}
                  description={staffConfig.problems.editor.confirmDetails.submit}
                  confirmLabel={staffConfig.problems.editor.actions.submit}
                  loading={submitForReview.isPending}
                  onConfirm={() => submitForReview.mutate({ problemId })}
                  trigger={
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={submitForReview.isPending || data.state === "REVIEW"}
                    >
                      {submitForReview.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      {staffConfig.problems.editor.actions.submit}
                    </Button>
                  }
                />
                <ConfirmDialog
                  variant="warning"
                  title={staffConfig.problems.editor.confirm.requestChanges}
                  description={staffConfig.problems.editor.confirmDetails.requestChanges}
                  confirmLabel={staffConfig.problems.editor.actions.requestChanges}
                  loading={requestChanges.isPending}
                  onConfirm={() => requestChanges.mutate({ problemId })}
                  trigger={
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={requestChanges.isPending || data.state === "DRAFT"}
                    >
                      {staffConfig.problems.editor.actions.requestChanges}
                    </Button>
                  }
                />
                <ConfirmDialog
                  title={staffConfig.problems.editor.confirm.approve}
                  description={staffConfig.problems.editor.confirmDetails.approve}
                  confirmLabel={staffConfig.problems.editor.actions.approve}
                  loading={approve.isPending}
                  onConfirm={() => approve.mutate({ problemId })}
                  trigger={
                    <Button variant="outline" className="w-full" disabled={approve.isPending}>
                      {staffConfig.problems.editor.actions.approve}
                    </Button>
                  }
                />
                <ConfirmDialog
                  variant="warning"
                  title={staffConfig.problems.editor.confirm.publish}
                  description={
                    staffConfig.problems.editor.confirmDetails.publish +
                    ` (${metadataState.visibility.toLowerCase()})`
                  }
                  confirmLabel={staffConfig.problems.editor.actions.publish}
                  loading={publish.isPending}
                  onConfirm={() =>
                    publish.mutate({ problemId, visibility: metadataState.visibility })
                  }
                  trigger={
                    <Button variant="default" className="w-full" disabled={publish.isPending}>
                      {staffConfig.problems.editor.actions.publish}
                    </Button>
                  }
                />
              </div>
              <div>
                <p className="text-sm font-medium">Recent review events</p>
                {data.reviews.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No reviews yet.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {data.reviews.map((review) => (
                      <li key={review.id} className="border-2 border-border bg-accent/20 p-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {review.reviewer.name ?? review.reviewer.handle}
                          </span>
                          <Badge variant="outline">{review.decision.toLowerCase()}</Badge>
                        </div>
                        {review.notes ? (
                          <p className="text-xs text-muted-foreground">{review.notes}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <TestCaseModal
        open={testCaseModalOpen}
        onOpenChange={handleTestModalToggle}
        testCase={activeTestCase}
        onSave={handlePersistTestCase}
        onDelete={handleDeleteTestCase}
      />
    </div>
  );
}

type TestCaseModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testCase: TestCaseRow | null;
  onSave: (draft: TestCaseRow) => void;
  onDelete: (id?: string) => void;
};

const defaultTestCasePayload: TestCaseRow = {
  ordinal: 1,
  input: "",
  output: "",
  timeLimitMs: 2000,
  memoryLimitMb: 256,
  strength: 100,
  kind: "hidden",
};

function TestCaseModal({ open, onOpenChange, testCase, onSave, onDelete }: TestCaseModalProps) {
  const [draft, setDraft] = useState<TestCaseRow>(testCase ?? { ...defaultTestCasePayload });

  useEffect(() => {
    if (open) {
      startTransition(() => setDraft(testCase ?? { ...defaultTestCasePayload }));
    }
  }, [open, testCase]);

  const handleNumberChange = (
    field: keyof Pick<TestCaseRow, "ordinal" | "timeLimitMs" | "memoryLimitMb" | "strength">,
    value: number,
  ) => {
    setDraft((prev) => {
      const previousValue = prev[field];
      const fallback =
        typeof previousValue === "number" && Number.isFinite(previousValue) ? previousValue : 0;
      return {
        ...prev,
        [field]: Number.isFinite(value) ? value : fallback,
      };
    });
  };

  const handleKindChange = (value: string) => {
    const nextKind = value === "sample" ? "sample" : "hidden";
    setDraft((prev) => ({
      ...prev,
      kind: nextKind,
      strength: nextKind === "sample" ? 0 : (prev.strength ?? 100),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{draft.id ? `Edit test #${draft.ordinal}` : "Add test case"}</DialogTitle>
          <DialogDescription>
            Detailed view of the input, output, and guardrails for this case.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-6">
          <div className="space-y-6 py-2">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <FieldLabel label="Ordinal" htmlFor="test-ordinal" />
                <Input
                  id="test-ordinal"
                  type="number"
                  min={1}
                  value={draft.ordinal}
                  onChange={(event) => handleNumberChange("ordinal", Number(event.target.value))}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel label="Time limit (ms)" htmlFor="test-time" />
                <Input
                  id="test-time"
                  type="number"
                  min={100}
                  value={draft.timeLimitMs}
                  onChange={(event) =>
                    handleNumberChange("timeLimitMs", Number(event.target.value))
                  }
                />
              </div>
              <div className="space-y-2">
                <FieldLabel label="Memory limit (MB)" htmlFor="test-memory" />
                <Input
                  id="test-memory"
                  type="number"
                  min={32}
                  value={draft.memoryLimitMb}
                  onChange={(event) =>
                    handleNumberChange("memoryLimitMb", Number(event.target.value))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <FieldLabel label="Input" tooltip="Provide the exact stdin fed to the judge." />
              <Textarea
                value={draft.input}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    input: event.target.value,
                  }))
                }
                placeholder="Paste the judge input or link to an inline blob."
                rows={6}
              />
              {draft.input.startsWith("inline://") ? (
                <p className="text-xs text-muted-foreground">
                  Editing this field replaces the blob reference with the new content.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <FieldLabel label="Output" />
              <Textarea
                value={draft.output}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    output: event.target.value,
                  }))
                }
                placeholder="Expected output for the case."
                rows={4}
              />
              {draft.output.startsWith("inline://") ? (
                <p className="text-xs text-muted-foreground">
                  Editing this field replaces the blob reference with the new content.
                </p>
              ) : null}
            </div>
            <div className="space-y-3">
              <FieldLabel
                label="Visibility"
                tooltip="Samples are public. Hidden cases run privately and can carry strength for partial scoring."
              />
              <RadioGroup
                value={draft.kind}
                onValueChange={handleKindChange}
                className="grid gap-3 md:grid-cols-2"
              >
                <div className="flex items-start gap-2 border border-border/60 p-3">
                  <RadioGroupItem value="sample" id="case-kind-sample" />
                  <div>
                    <Label htmlFor="case-kind-sample" className="font-medium">
                      Sample (public)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Appears in the reader alongside the statement.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 border border-border/60 p-3">
                  <RadioGroupItem value="hidden" id="case-kind-hidden" />
                  <div>
                    <Label htmlFor="case-kind-hidden" className="font-medium">
                      Hidden
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Judge-only case that contributes to overall strength.
                    </p>
                  </div>
                </div>
              </RadioGroup>
              {draft.kind === "hidden" ? (
                <div className="space-y-2">
                  <FieldLabel
                    label="Strength"
                    tooltip="Used for partial scoring and prioritisation in the judge."
                  />
                  <Input
                    type="number"
                    min={0}
                    value={draft.strength ?? 0}
                    onChange={(event) => handleNumberChange("strength", Number(event.target.value))}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {draft.id ? (
            <ConfirmDialog
              variant="destructive"
              title={staffConfig.problems.editor.confirm.deleteTestCase}
              description={staffConfig.problems.editor.confirmDetails.deleteTestCase}
              confirmLabel="Delete case"
              onConfirm={() => onDelete(draft.id)}
              trigger={
                <Button type="button" variant="ghost" className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete case
                </Button>
              }
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              New cases default to hidden until published.
            </p>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => onSave(draft)}>
              Save case
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldLabel({
  label,
  htmlFor,
  tooltip,
}: {
  label: string;
  htmlFor?: string;
  tooltip?: string;
}) {
  return (
    <div className="flex items-center gap-1 text-sm font-medium text-foreground">
      <Label htmlFor={htmlFor}>{label}</Label>
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground transition hover:text-foreground"
              aria-label={`${label} info`}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
