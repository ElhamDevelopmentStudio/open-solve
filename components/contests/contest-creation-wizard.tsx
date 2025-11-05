"use client";

import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Layers,
  Shield,
  Sparkles,
  Trash2,
} from "@/components/icons";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogTrigger,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@/components/ui";
import {
  DataTable,
  DataTableColumnHeader,
  type DataTableColumn,
} from "@/components/ui/data-table";
import {
  contestBuilderSchema,
  contestProblemSettingsSchema,
} from "@/lib/contests/schema";
import { defaultContestSettings } from "@/lib/contests/settings";
import { trpc } from "@/lib/trpc/client";
import type { AppRouter } from "@/lib/trpc/router";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { ContestRuleset, ContestType, ContestVisibility } from "@prisma/client";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useForm, useWatch, type FieldErrors } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const WIZARD_STEPS = [
  { key: "basics", label: "Briefing", description: "Identity & pitch", icon: Sparkles },
  { key: "schedule", label: "Window", description: "Timeline & gates", icon: CalendarDays },
  { key: "problems", label: "Problem set", description: "Lock the pool", icon: Layers },
  { key: "policies", label: "Safeguards", description: "Scoring & anti-cheat", icon: Shield },
  { key: "review", label: "Launch", description: "Final audit", icon: ClipboardCheck },
] as const;

const STEP_VALIDATION_FIELDS: Record<number, (keyof BuilderFormValues)[]> = {
  0: ["name", "slug"],
  1: ["startsAt", "endsAt"],
};

const FRIENDLY_ERROR_MESSAGES: Partial<Record<keyof BuilderFormValues, string>> = {
  name: "Contest name cannot be empty",
  slug: "Provide a slug using lowercase letters, digits, or hyphens",
  startsAt: "Set the contest start time",
  endsAt: "Set when the contest ends",
};

const cloneDefaultSettings = () => structuredClone(defaultContestSettings);

const builderFormSchema = z.object({
  name: z.string().min(6).max(120),
  slug: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, digits, and hyphens allowed"),
  description: z.string().max(2000).nullable().optional(),
  type: z.nativeEnum(ContestType),
  visibility: z.nativeEnum(ContestVisibility),
  rules: z.nativeEnum(ContestRuleset),
  isRated: z.boolean(),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  freezeAt: z.string().nullable().optional(),
});

type BuilderFormValues = z.infer<typeof builderFormSchema>;

type SelectedProblem = {
  problemId: string;
  slug: string;
  title: string;
  difficulty?: string | null;
  label: string;
  order: number;
  points: number;
  settings: z.infer<typeof contestProblemSettingsSchema>;
};

type RouterOutputs = inferRouterOutputs<AppRouter>;
type ProblemCatalogEntry = RouterOutputs["staff"]["contests"]["problemCatalog"][number];

const ERROR_PRIORITY: (keyof BuilderFormValues)[] = ["name", "slug", "startsAt", "endsAt"];

function extractErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === "string") {
    return error;
  }
  if (Array.isArray(error)) {
    for (const item of error) {
      const message = extractErrorMessage(item);
      if (message) {
        return message;
      }
    }
    return null;
  }
  if (typeof error === "object") {
    if ("message" in error && typeof (error as { message?: unknown }).message === "string") {
      return (error as { message?: string }).message ?? null;
    }
    for (const value of Object.values(error as Record<string, unknown>)) {
      const message = extractErrorMessage(value);
      if (message) {
        return message;
      }
    }
  }
  return null;
}

function resolveFriendlyErrorMessage(errors: FieldErrors<BuilderFormValues>) {
  for (const field of ERROR_PRIORITY) {
    const message = extractErrorMessage(errors[field]);
    if (message) {
      return message;
    }
    if (errors[field] && FRIENDLY_ERROR_MESSAGES[field]) {
      return FRIENDLY_ERROR_MESSAGES[field] ?? null;
    }
  }
  const [firstKey, firstError] = Object.entries(errors)[0] ?? [];
  if (firstError) {
    return extractErrorMessage(firstError) ?? FRIENDLY_ERROR_MESSAGES[firstKey as keyof BuilderFormValues] ?? null;
  }
  return null;
}

function resolveMessageForFields(
  errors: FieldErrors<BuilderFormValues>,
  fields: (keyof BuilderFormValues)[],
) {
  for (const field of fields) {
    const message = extractErrorMessage(errors[field]);
    if (message) {
      return message;
    }
    if (errors[field] && FRIENDLY_ERROR_MESSAGES[field]) {
      return FRIENDLY_ERROR_MESSAGES[field] ?? null;
    }
  }
  return null;
}

const buildTimingDefaults = () => {
  const now = Date.now();
  return {
    startsAt: format(new Date(now + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
    endsAt: format(new Date(now + 2 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
    freezeAt: null as string | null,
  };
};

export function ContestCreationWizard({
  canCreate = true,
  onCreated,
  variant = "dialog",
}: {
  canCreate?: boolean;
  onCreated?: () => void;
  variant?: "dialog" | "page";
}) {
  const isPageVariant = variant === "page";
  const [open, setOpen] = useState(isPageVariant);
  const [stepIndex, setStepIndex] = useState(0);
  const [settings, setSettings] = useState(() => cloneDefaultSettings());
  const [selectedProblems, setSelectedProblems] = useState<SelectedProblem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearch = useDeferredValue(searchTerm);
  const problemCatalog = trpc.staff.contests.problemCatalog.useQuery(
    { query: deferredSearch },
    { enabled: isPageVariant || open },
  );
  const form = useForm<BuilderFormValues>({
    resolver: zodResolver(builderFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      type: "COMPETITIVE",
      visibility: "PUBLIC",
      rules: "ICPC",
      isRated: true,
      ...buildTimingDefaults(),
    },
  });

  const resetBuilder = useCallback(() => {
    setStepIndex(0);
    setSettings(cloneDefaultSettings());
    setSelectedProblems([]);
    setSearchTerm("");
    form.reset({
      name: "",
      slug: "",
      description: "",
      type: "COMPETITIVE",
      visibility: "PUBLIC",
      rules: "ICPC",
      isRated: true,
      ...buildTimingDefaults(),
    });
  }, [form]);

  useEffect(() => {
    if (isPageVariant) {
      resetBuilder();
    }
  }, [isPageVariant, resetBuilder]);

  useEffect(() => {
    if (!isPageVariant && open) {
      resetBuilder();
    }
  }, [isPageVariant, open, resetBuilder]);

  const routerUtils = trpc.useUtils();
  const createContest = trpc.staff.contests.create.useMutation({
    onSuccess: async () => {
      toast.success("Contest scheduled", {
        description: "Quality gate passed and the control room synced.",
      });
      resetBuilder();
      if (isPageVariant) {
        routerUtils.staff.contests.list.invalidate().catch(() => {});
      } else {
        setOpen(false);
      }
      onCreated?.();
    },
    onError: (error) =>
      toast.error("Unable to launch contest", {
        description: error.message,
      }),
  });

  const goToStep = (next: number) =>
    setStepIndex(Math.max(0, Math.min(WIZARD_STEPS.length - 1, next)));

  const handleProblemSelect = (problem: ProblemCatalogEntry) => {
    setSelectedProblems((prev) => {
      if (prev.some((entry) => entry.problemId === problem.id)) {
        return prev;
      }
      const label = String.fromCharCode(65 + prev.length);
      return [
        ...prev,
        {
          problemId: problem.id,
          slug: problem.slug,
          title: problem.currentVersion?.title ?? problem.slug,
          difficulty: problem.difficulty?.code ?? null,
          label,
          order: prev.length + 1,
          points: 100,
          settings: contestProblemSettingsSchema.parse({}),
        },
      ];
    });
  };

  const updateProblem = (problemId: string, patch: Partial<SelectedProblem>) => {
    setSelectedProblems((prev) =>
      prev.map((problem) => (problem.problemId === problemId ? { ...problem, ...patch } : problem)),
    );
  };

  const removeProblem = (problemId: string) => {
    setSelectedProblems((prev) => prev.filter((problem) => problem.problemId !== problemId));
  };

  const updateSettings = useCallback(
    (updater: (current: typeof settings) => typeof settings) => {
      setSettings((current) => updater(current));
    },
    [],
  );

  const validateCurrentStep = useCallback(async () => {
    const fields = STEP_VALIDATION_FIELDS[stepIndex];
    if (!fields) return true;
    const isValid = await form.trigger(fields, { shouldFocus: true });
    if (!isValid) {
      const message =
        resolveMessageForFields(form.formState.errors, fields) ??
        resolveFriendlyErrorMessage(form.formState.errors);
      if (message) {
        toast.warning(message);
      }
    }
    return isValid;
  }, [form, stepIndex]);

  const handleNextStep = async () => {
    const isValid = await validateCurrentStep();
    if (!isValid) return;
    goToStep(stepIndex + 1);
  };

  const handleSubmit = form.handleSubmit(
    (values) => {
      if (selectedProblems.length === 0) {
        toast.warning("Add at least one problem before launching.");
        setStepIndex(2);
        return;
      }
      const payload = contestBuilderSchema.parse({
        ...values,
        startsAt: new Date(values.startsAt),
        endsAt: new Date(values.endsAt),
        freezeAt: values.freezeAt ? new Date(values.freezeAt) : undefined,
        settings,
        problems: selectedProblems.map((problem, index) => ({
          problemId: problem.problemId,
          label: problem.label,
          order: index + 1,
          points: problem.points,
          settings: contestProblemSettingsSchema.parse(problem.settings ?? {}),
        })),
      });
      createContest.mutate(payload);
    },
    (errors) => {
      const message = resolveFriendlyErrorMessage(errors);
      if (message) {
        toast.warning(message);
      }
    },
  );

  const disableNext = stepIndex === 2 && selectedProblems.length === 0;
  const stepProgress = ((stepIndex + 1) / WIZARD_STEPS.length) * 100;
  const currentStep = WIZARD_STEPS[stepIndex];
  const formValues = useWatch({ control: form.control }) as BuilderFormValues;
  const readiness = useMemo(
    () =>
      buildReadinessChecklist({
        formValues,
        selectedProblems,
        settings,
      }),
    [formValues, selectedProblems, settings],
  );

  const builderMarkup = (
    <div className="space-y-6 p-4 sm:p-6">
      <BuilderHero
        stepProgress={stepProgress}
        stepLabel={`${stepIndex + 1}/${WIZARD_STEPS.length}`}
        onReset={() => {
          resetBuilder();
          toast.info("Builder reset", {
            description: "All fields reverted to defaults.",
          });
        }}
      />
      <div className="grid gap-6 xl:grid-cols-[250px_minmax(0,1fr)_320px]">
        <StepRail stepIndex={stepIndex} onNavigate={goToStep} />
        <Card className="border-border/60 bg-card/95 shadow-xl">
          <CardHeader className="border-b border-border/60">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-xl font-semibold">{currentStep.label}</CardTitle>
              <CardDescription>{currentStep.description}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Form {...form}>
              <form onSubmit={handleSubmit} className="flex flex-col">
                <div className="space-y-6 p-6">
                  {currentStep.key === "basics" ? <BasicsStep form={form} /> : null}
                  {currentStep.key === "schedule" ? (
                    <ScheduleStep form={form} settings={settings} updateSettings={updateSettings} />
                  ) : null}
                  {currentStep.key === "problems" ? (
                    <ProblemsStep
                      loading={problemCatalog.isLoading}
                      error={problemCatalog.error?.message}
                      catalog={problemCatalog.data ?? []}
                      selected={selectedProblems}
                      onSelect={handleProblemSelect}
                      onUpdate={updateProblem}
                      onRemove={removeProblem}
                      searchTerm={searchTerm}
                      onSearchChange={setSearchTerm}
                    />
                  ) : null}
                  {currentStep.key === "policies" ? (
                    <PoliciesStep settings={settings} updateSettings={updateSettings} />
                  ) : null}
                  {currentStep.key === "review" ? (
                    <ReviewStep
                      formValues={formValues}
                      selectedProblems={selectedProblems}
                      settings={settings}
                    />
                  ) : null}
                </div>
                <WizardActionBar
                  stepIndex={stepIndex}
                  onBack={() => goToStep(stepIndex - 1)}
                  onNext={handleNextStep}
                  isLastStep={stepIndex === WIZARD_STEPS.length - 1}
                  disableNext={disableNext}
                  submitting={createContest.isPending}
                  disableSubmit={!canCreate}
                />
              </form>
            </Form>
          </CardContent>
        </Card>
        <SummaryRail
          readiness={readiness}
          formValues={formValues}
          selectedProblems={selectedProblems}
          settings={settings}
        />
      </div>
    </div>
  );

  if (isPageVariant) {
    return (
      <section className="rounded-3xl border border-border/70 bg-background/80 text-card-foreground shadow-[0_30px_120px_rgba(15,23,42,0.12)]">
        {builderMarkup}
      </section>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          disabled={!canCreate}
          className="rounded-full bg-gradient-to-r from-primary to-primary/70 px-6 text-primary-foreground shadow-lg"
        >
          <Sparkles className="mr-2 h-4 w-4" /> Plan contest
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl border-0 bg-transparent p-0 shadow-none">
        <div className="rounded-3xl border border-border/80 bg-card/95">{builderMarkup}</div>
      </DialogContent>
    </Dialog>
  );
}

function BuilderHero({
  stepProgress,
  stepLabel,
  onReset,
}: {
  stepProgress: number;
  stepLabel: string;
  onReset: () => void;
}) {
  return (
    <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card/80 to-primary/10 p-6 shadow-[0_20px_90px_rgba(15,23,42,0.15)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Contest Fabricator</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">Quality gate for new contests</h2>
          <p className="text-sm text-muted-foreground">
            Ship contests with observability, safeguards, and anonymization baked in.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
            Phase 13 ready
          </Badge>
          <Button variant="ghost" className="rounded-full" type="button" onClick={onReset}>
            Reset builder
          </Button>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-border/60">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${stepProgress}%` }} />
        </div>
        <p className="text-xs font-medium text-muted-foreground">Step {stepLabel}</p>
      </div>
    </div>
  );
}

function StepRail({ stepIndex, onNavigate }: { stepIndex: number; onNavigate: (index: number) => void }) {
  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Workflow</CardTitle>
        <CardDescription>All steps must pass the Phase 13 checklist.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {WIZARD_STEPS.map((step, index) => {
          const status = index < stepIndex ? "complete" : index === stepIndex ? "active" : "upcoming";
          const Icon = step.icon;
          return (
            <button
              type="button"
              key={step.key}
              disabled={index > stepIndex}
              onClick={() => onNavigate(index)}
              className={cn(
                "w-full rounded-2xl border px-3 py-3 text-left transition",
                status === "complete" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
                status === "active" && "border-primary text-foreground shadow-lg",
                status === "upcoming" && "border-border/60 text-muted-foreground",
                index > stepIndex && "cursor-not-allowed opacity-60",
              )}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold">
                  {status === "complete" ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

function WizardActionBar({
  stepIndex,
  onBack,
  onNext,
  isLastStep,
  disableNext,
  submitting,
  disableSubmit,
}: {
  stepIndex: number;
  onBack: () => void;
  onNext: () => void;
  isLastStep: boolean;
  disableNext: boolean;
  submitting: boolean;
  disableSubmit: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border/60 bg-muted/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{WIZARD_STEPS[stepIndex].label}</span> • Step {stepIndex + 1} of {" "}
        {WIZARD_STEPS.length}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" className="rounded-full" disabled={stepIndex === 0} onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {!isLastStep ? (
          <Button type="button" className="rounded-full" disabled={disableNext} onClick={onNext}>
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            className="rounded-full bg-gradient-to-r from-primary to-primary/80"
            disabled={submitting || disableSubmit}
          >
            {submitting ? "Launching…" : "Launch contest"}
          </Button>
        )}
      </div>
    </div>
  );
}

function BasicsStep({ form }: { form: ReturnType<typeof useForm<BuilderFormValues>> }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Identity</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contest name</FormLabel>
                <FormControl>
                  <Input placeholder="Spring Championship" className="rounded-2xl" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slug</FormLabel>
                <FormControl>
                  <Input placeholder="spring-championship" className="rounded-2xl" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="mt-4">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="One line teaser, duration, or ops copy."
                    className="rounded-2xl"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="rounded-2xl border border-border/60 bg-card/80 p-4">
              <FormLabel>Mode</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="COMPETITIVE">Competitive</SelectItem>
                  <SelectItem value="EDUCATIONAL">Educational</SelectItem>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="visibility"
          render={({ field }) => (
            <FormItem className="rounded-2xl border border-border/60 bg-card/80 p-4">
              <FormLabel>Visibility</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue placeholder="Choose visibility" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rules"
          render={({ field }) => (
            <FormItem className="rounded-2xl border border-border/60 bg-card/80 p-4">
              <FormLabel>Ruleset</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue placeholder="Pick rules" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.values(ContestRuleset).map((ruleset) => (
                    <SelectItem key={ruleset} value={ruleset}>
                      {ruleset}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Rated contest</p>
            <p className="text-xs text-muted-foreground">Enable rating delta tracking and AC celebration.</p>
          </div>
          <FormField
            control={form.control}
            name="isRated"
            render={({ field }) => (
              <FormItem className="mb-0 flex items-center space-x-2">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}

function ScheduleStep({
  form,
  settings,
  updateSettings,
}: {
  form: ReturnType<typeof useForm<BuilderFormValues>>;
  settings: typeof defaultContestSettings;
  updateSettings: (updater: (current: typeof defaultContestSettings) => typeof defaultContestSettings) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Timeline</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="startsAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Starts</FormLabel>
                <FormControl>
                  <Input type="datetime-local" className="rounded-2xl" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endsAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ends</FormLabel>
                <FormControl>
                  <Input type="datetime-local" className="rounded-2xl" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <div className="mt-4">
          <FormField
            control={form.control}
            name="freezeAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Freeze at (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    className="rounded-2xl"
                    value={field.value ?? ""}
                    onChange={(event) => field.onChange(event.target.value || null)}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Registration mode</p>
          <div className="mt-4 space-y-4">
            <div className="grid gap-1">
              <Label className="text-xs uppercase">Mode</Label>
              <Select
                value={settings.registration.mode}
                onValueChange={(value) =>
                  updateSettings((current) => ({
                    ...current,
                    registration: { ...current.registration, mode: value as typeof current.registration.mode },
                  }))
                }
              >
                <SelectTrigger className="rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="invite">Invite-only</SelectItem>
                  <SelectItem value="password">Access code</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs uppercase">Capacity</Label>
              <Input
                type="number"
                placeholder="Unlimited"
                value={settings.registration.capacity ?? ""}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    registration: {
                      ...current.registration,
                      capacity: event.target.value ? Number(event.target.value) : null,
                    },
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Require verified email</p>
              <Switch
                checked={settings.registration.requireVerifiedEmail}
                onCheckedChange={(value) =>
                  updateSettings((current) => ({
                    ...current,
                    registration: { ...current.registration, requireVerifiedEmail: value },
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Allow virtual replay</p>
              <Switch
                checked={settings.registration.allowVirtual}
                onCheckedChange={(value) =>
                  updateSettings((current) => ({
                    ...current,
                    registration: { ...current.registration, allowVirtual: value },
                  }))
                }
              />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Timing controls</p>
          <div className="mt-4 grid gap-4">
            <div className="grid gap-1">
              <Label className="text-xs uppercase">Grace minutes</Label>
              <Input
                type="number"
                value={settings.schedule.graceMinutes}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    schedule: { ...current.schedule, graceMinutes: Number(event.target.value) || 0 },
                  }))
                }
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs uppercase">Late join cutoff (minutes)</Label>
              <Input
                type="number"
                value={settings.schedule.lateJoinCutoffMinutes ?? ""}
                placeholder="Use grace"
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    schedule: {
                      ...current.schedule,
                      lateJoinCutoffMinutes: event.target.value ? Number(event.target.value) : null,
                    },
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Allow late join</p>
              <Switch
                checked={settings.schedule.allowLateJoin}
                onCheckedChange={(value) =>
                  updateSettings((current) => ({
                    ...current,
                    schedule: { ...current.schedule, allowLateJoin: value },
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Per-user timer</p>
              <Switch
                checked={settings.schedule.perUserTimer}
                onCheckedChange={(value) =>
                  updateSettings((current) => ({
                    ...current,
                    schedule: { ...current.schedule, perUserTimer: value },
                  }))
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type ProblemsProps = {
  catalog: ProblemCatalogEntry[];
  loading: boolean;
  error?: string;
  selected: SelectedProblem[];
  onSelect: (problem: ProblemCatalogEntry) => void;
  onUpdate: (problemId: string, patch: Partial<SelectedProblem>) => void;
  onRemove: (problemId: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
};

function ProblemsStep({
  catalog,
  loading,
  error,
  selected,
  onSelect,
  onUpdate,
  onRemove,
  searchTerm,
  onSearchChange,
}: ProblemsProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleAdvanced = (problemId: string) =>
    setExpanded((current) => ({
      ...current,
      [problemId]: !current[problemId],
    }));

  const rows = useMemo(() =>
    catalog.map((problem) => ({
      ...problem,
      searchText: `${problem.currentVersion?.title ?? problem.slug} ${problem.slug}`,
      tagsList: problem.tags?.map((tag) => tag.tag.name).join(", ") ?? "—",
    })), [catalog]);

  type CatalogRow = (typeof rows)[number];

  const columns = useMemo<DataTableColumn<CatalogRow>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Problem" />,
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-semibold">{row.original.currentVersion?.title ?? row.original.slug}</p>
            <p className="text-xs text-muted-foreground">/{row.original.slug}</p>
          </div>
        ),
      },
      {
        accessorKey: "difficulty",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Difficulty" />,
        cell: ({ row }) => (
          <Badge variant="outline" className="uppercase text-[11px]">
            {row.original.difficulty?.code ?? "?"}
          </Badge>
        ),
      },
      {
        accessorKey: "tags",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Tags" />,
        cell: ({ row }) => <p className="text-xs text-muted-foreground">{row.original.tagsList}</p>,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const alreadySelected = selected.some((entry) => entry.problemId === row.original.id);
          return (
            <Button
              type="button"
              variant={alreadySelected ? "secondary" : "outline"}
              size="sm"
              className="rounded-full"
              disabled={alreadySelected}
              onClick={() => onSelect(row.original)}
            >
              {alreadySelected ? "Added" : "Add"}
            </Button>
          );
        },
      },
    ],
    [onSelect, selected],
  );

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/80">
        <CardHeader className="pb-4">
          <CardTitle>Curate from published problems</CardTitle>
          <CardDescription>Only published problems appear in this catalog.</CardDescription>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Input
                value={searchTerm}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search slug or title"
                className="rounded-2xl pl-10"
              />
              <Layers className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            <div className="text-xs text-muted-foreground">
              {selected.length} locked · server search runs automatically
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load catalog</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
              No published problems match the search. Adjust filters or publish some problems first.
            </div>
          ) : (
            <DataTable columns={columns} data={rows} enableColumnVisibility={false} enablePagination={false} enableSorting={false} />
          )}
        </CardContent>
      </Card>
      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle>Selected problems</CardTitle>
          <CardDescription>
            Labels update instantly and map directly to scoreboard columns.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selected.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              Select at least one published problem to continue.
            </div>
          ) : (
            selected.map((problem, index) => (
              <div key={problem.problemId} className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      {problem.label}. {problem.title}
                    </p>
                    <p className="text-xs text-muted-foreground">/{problem.slug}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <Label className="text-xs uppercase">Label</Label>
                      <Input
                        className="w-20"
                        value={problem.label}
                        onChange={(event) =>
                          onUpdate(problem.problemId, { label: event.target.value.toUpperCase().slice(0, 3) })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs uppercase">Points</Label>
                      <Input
                        type="number"
                        className="w-24"
                        value={problem.points}
                        onChange={(event) =>
                          onUpdate(problem.problemId, { points: Number(event.target.value) || 0 })
                        }
                      />
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => toggleAdvanced(problem.problemId)}>
                      {expanded[problem.problemId] ? "Hide settings" : "Advanced"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemove(problem.problemId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {expanded[problem.problemId] ? (
                  <div className="mt-4 space-y-4 border-t border-dashed border-border/60 pt-4 text-sm">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="grid gap-1">
                        <Label className="text-xs uppercase">Attempts limit</Label>
                        <Input
                          type="number"
                          value={problem.settings.attemptsLimit ?? ""}
                          onChange={(event) =>
                            onUpdate(problem.problemId, {
                              settings: {
                                ...problem.settings,
                                attemptsLimit: event.target.value ? Number(event.target.value) : null,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs uppercase">Scoring weight</Label>
                        <Input
                          type="number"
                          value={problem.settings.scoringWeight}
                          onChange={(event) =>
                            onUpdate(problem.problemId, {
                              settings: {
                                ...problem.settings,
                                scoringWeight: Number(event.target.value) || 1,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs uppercase">Visibility</Label>
                        <Select
                          value={problem.settings.visibility}
                          onValueChange={(value) =>
                            onUpdate(problem.problemId, {
                              settings: {
                                ...problem.settings,
                                visibility: value as typeof problem.settings.visibility,
                              },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default</SelectItem>
                            <SelectItem value="hidden">Hidden</SelectItem>
                            <SelectItem value="locked">Locked</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs uppercase">Allowed languages</Label>
                      <Input
                        placeholder="cpp17,python3"
                        value={problem.settings.allowedLanguages.join(", ")}
                        onChange={(event) =>
                          onUpdate(problem.problemId, {
                            settings: {
                              ...problem.settings,
                              allowedLanguages: event.target.value
                                .split(",")
                                .map((token) => token.trim())
                                .filter(Boolean),
                            },
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">Leave blank to inherit contest defaults.</p>
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs uppercase">Notes</Label>
                      <Textarea
                        rows={2}
                        value={problem.settings.notes ?? ""}
                        onChange={(event) =>
                          onUpdate(problem.problemId, {
                            settings: {
                              ...problem.settings,
                              notes: event.target.value || undefined,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  Problem #{index + 1} · currently {problem.difficulty ?? "unknown"}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type PoliciesProps = {
  settings: typeof defaultContestSettings;
  updateSettings: (updater: (current: typeof defaultContestSettings) => typeof defaultContestSettings) => void;
};

function PoliciesStep({ settings, updateSettings }: PoliciesProps) {
  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Scoring rules</CardTitle>
          <CardDescription>Every mode still respects the Quality & Security guardrails.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs
            value={settings.scoring.mode}
            onValueChange={(value) =>
              updateSettings((current) => ({
                ...current,
                scoring: { ...current.scoring, mode: value as typeof current.scoring.mode },
              }))
            }
          >
            <TabsList className="grid grid-cols-4 rounded-3xl border border-border/60 bg-muted/30">
              <TabsTrigger value="ICPC">ICPC</TabsTrigger>
              <TabsTrigger value="CF">Codeforces</TabsTrigger>
              <TabsTrigger value="ATCODER">AtCoder</TabsTrigger>
              <TabsTrigger value="CUSTOM">Custom</TabsTrigger>
            </TabsList>
            <TabsContent value="ICPC" className="pt-4">
              <Label className="text-xs uppercase">Penalty minutes</Label>
              <Input
                type="number"
                value={settings.scoring.icpcPenaltyMinutes}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    scoring: { ...current.scoring, icpcPenaltyMinutes: Number(event.target.value) },
                  }))
                }
              />
            </TabsContent>
            <TabsContent value="CF" className="grid gap-4 pt-4 md:grid-cols-2">
              <div>
                <Label className="text-xs uppercase">Wrong attempt penalty (%)</Label>
                <Input
                  type="number"
                  value={settings.scoring.cfPenalty}
                  onChange={(event) =>
                    updateSettings((current) => ({
                      ...current,
                      scoring: { ...current.scoring, cfPenalty: Number(event.target.value) },
                    }))
                  }
                />
              </div>
              <div>
                <Label className="text-xs uppercase">Time decay</Label>
                <Input
                  type="number"
                  value={settings.scoring.cfTimeDecay}
                  onChange={(event) =>
                    updateSettings((current) => ({
                      ...current,
                      scoring: { ...current.scoring, cfTimeDecay: Number(event.target.value) },
                    }))
                  }
                />
              </div>
            </TabsContent>
            <TabsContent value="CUSTOM" className="grid gap-4 pt-4 md:grid-cols-3">
              <div>
                <Label className="text-xs uppercase">Base points</Label>
                <Input
                  type="number"
                  value={settings.scoring.customBasePoints}
                  onChange={(event) =>
                    updateSettings((current) => ({
                      ...current,
                      scoring: { ...current.scoring, customBasePoints: Number(event.target.value) },
                    }))
                  }
                />
              </div>
              <div>
                <Label className="text-xs uppercase">Attempt penalty</Label>
                <Input
                  type="number"
                  value={settings.scoring.customAttemptPenalty}
                  onChange={(event) =>
                    updateSettings((current) => ({
                      ...current,
                      scoring: { ...current.scoring, customAttemptPenalty: Number(event.target.value) },
                    }))
                  }
                />
              </div>
              <div>
                <Label className="text-xs uppercase">Time decay</Label>
                <Input
                  type="number"
                  value={settings.scoring.customTimeDecay}
                  onChange={(event) =>
                    updateSettings((current) => ({
                      ...current,
                      scoring: { ...current.scoring, customTimeDecay: Number(event.target.value) },
                    }))
                  }
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Scoreboard & freeze</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-1">
              <Label className="text-xs uppercase">Visibility</Label>
              <Select
                value={settings.scoreboard.visibility}
                onValueChange={(value) =>
                  updateSettings((current) => ({
                    ...current,
                    scoreboard: { ...current.scoreboard, visibility: value as typeof current.scoreboard.visibility },
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full</SelectItem>
                  <SelectItem value="top">Top only</SelectItem>
                  <SelectItem value="self">Self</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs uppercase">Refresh interval (sec)</Label>
              <Input
                type="number"
                value={settings.scoreboard.refreshIntervalSec}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    scoreboard: {
                      ...current.scoreboard,
                      refreshIntervalSec: Number(event.target.value) || 15,
                    },
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Show penalty column</p>
              <Switch
                checked={settings.scoreboard.showPenaltyColumn}
                onCheckedChange={(value) =>
                  updateSettings((current) => ({
                    ...current,
                    scoreboard: { ...current.scoreboard, showPenaltyColumn: value },
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Show self during freeze</p>
              <Switch
                checked={settings.freeze.showSelfDuringFreeze}
                onCheckedChange={(value) =>
                  updateSettings((current) => ({
                    ...current,
                    freeze: { ...current.freeze, showSelfDuringFreeze: value },
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Anti-cheat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {[
              {
                label: "Lock discussions",
                field: "lockDiscussions" as const,
              },
              {
                label: "Lock profiles",
                field: "lockProfiles" as const,
              },
              {
                label: "Lock Trails",
                field: "lockTrails" as const,
              },
              {
                label: "Enforce IP consistency",
                field: "enforceIp" as const,
              },
              {
                label: "Similarity review",
                field: "similarityReview" as const,
              },
            ].map((option) => (
              <div key={option.field} className="flex items-center justify-between">
                <p className="text-sm font-medium">{option.label}</p>
                <Switch
                  checked={settings.antiCheat[option.field]}
                  onCheckedChange={(value) =>
                    updateSettings((current) => ({
                      ...current,
                      antiCheat: { ...current.antiCheat, [option.field]: value },
                    }))
                  }
                />
              </div>
            ))}
            <div className="grid gap-1">
              <Label className="text-xs uppercase">Submission throttle / minute</Label>
              <Input
                type="number"
                value={settings.antiCheat.throttlePerMinute}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    antiCheat: { ...current.antiCheat, throttlePerMinute: Number(event.target.value) || 3 },
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReviewStep({
  formValues,
  selectedProblems,
  settings,
}: {
  formValues: BuilderFormValues;
  selectedProblems: SelectedProblem[];
  settings: typeof defaultContestSettings;
}) {
  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle>Launch summary</CardTitle>
          <CardDescription>Final glance at timing, format, and safeguards.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <SummaryItem label="Window">
            {format(new Date(formValues.startsAt), "PPPpp")} → {format(new Date(formValues.endsAt), "PPPpp")}
          </SummaryItem>
          <SummaryItem label="Mode">
            {formValues.type} · {formValues.visibility}
          </SummaryItem>
          <SummaryItem label="Problems locked">{selectedProblems.length}</SummaryItem>
          <SummaryItem label="Scoring">{settings.scoring.mode}</SummaryItem>
        </CardContent>
      </Card>
      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle>Problem set</CardTitle>
          <CardDescription>Order dictates scoreboard columns.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {selectedProblems.map((problem) => (
            <div key={problem.problemId} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <Badge variant="outline">{problem.label}</Badge>
                <span>{problem.title}</span>
              </div>
              <span className="text-muted-foreground">{problem.points} pts</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{children}</p>
    </div>
  );
}

function SummaryRail({
  readiness,
  formValues,
  selectedProblems,
  settings,
}: {
  readiness: ReadinessItem[];
  formValues: BuilderFormValues;
  selectedProblems: SelectedProblem[];
  settings: typeof defaultContestSettings;
}) {
  const totalPoints = selectedProblems.reduce((sum, problem) => sum + problem.points, 0);
  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Readiness checklist</CardTitle>
          <CardDescription>Every row maps to a Quality & Security milestone.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {readiness.map((item) => (
            <div key={item.label} className="flex items-start gap-3 rounded-2xl border border-border/50 p-3">
              {item.state === "ready" ? (
                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <Check className="h-4 w-4" />
                </span>
              ) : item.state === "warning" ? (
                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                </span>
              ) : (
                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/60 text-muted-foreground">
                  •
                </span>
              )}
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Live preview</CardTitle>
          <CardDescription>Everything shown here stays in sync.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="uppercase text-[11px]">
              {formValues.type}
            </Badge>
            <Badge variant="secondary" className="uppercase text-[11px]">
              {formValues.visibility}
            </Badge>
            <Badge variant="secondary" className="uppercase text-[11px]">
              {settings.scoring.mode}
            </Badge>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
            <p className="text-xs uppercase text-muted-foreground">Window</p>
            <p className="text-sm font-medium">
              {format(new Date(formValues.startsAt), "MMM d, HH:mm")} → {format(new Date(formValues.endsAt), "MMM d, HH:mm")}
            </p>
            <p className="text-xs text-muted-foreground">
              {selectedProblems.length} problems · {totalPoints} pts
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
            <p className="text-xs uppercase text-muted-foreground">Safeguards</p>
            <p className="text-sm font-medium">
              Discussions locked: {settings.antiCheat.lockDiscussions ? "yes" : "no"}
            </p>
            <p className="text-xs text-muted-foreground">
              Similarity review {settings.antiCheat.similarityReview ? "enabled" : "disabled"} · throttle {settings.antiCheat.throttlePerMinute}/min
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type ReadinessItem = {
  label: string;
  detail: string;
  state: "ready" | "todo" | "warning";
};

function buildReadinessChecklist({
  formValues,
  selectedProblems,
  settings,
}: {
  formValues: BuilderFormValues;
  selectedProblems: SelectedProblem[];
  settings: typeof defaultContestSettings;
}): ReadinessItem[] {
  return [
    {
      label: "Contest identity",
      detail: formValues.name ? `/${formValues.slug}` : "Name + slug still required",
      state: formValues.name && formValues.slug ? "ready" : "warning",
    },
    {
      label: "Reliable window",
      detail: formValues.startsAt && formValues.endsAt ? "Schedule locked" : "Start/end missing",
      state: formValues.startsAt && formValues.endsAt ? "ready" : "warning",
    },
    {
      label: "Problem set locked",
      detail: `${selectedProblems.length} selected` + (selectedProblems.length === 0 ? " — minimum one" : ""),
      state: selectedProblems.length > 0 ? "ready" : "warning",
    },
    {
      label: "Anti-cheat",
      detail: settings.antiCheat.lockDiscussions ? "Discussions locked" : "Enable lock for Phase 13",
      state: settings.antiCheat.lockDiscussions ? "ready" : "todo",
    },
    {
      label: "Scoreboard",
      detail: `Mode ${settings.scoreboard.visibility}`,
      state: "ready",
    },
  ];
}
