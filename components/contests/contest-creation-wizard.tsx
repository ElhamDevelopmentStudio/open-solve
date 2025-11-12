"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea
} from "@/components/ui";
import { contestBuilderSchema, contestProblemSettingsSchema } from "@/lib/contests/schema";
import { defaultContestSettings } from "@/lib/contests/settings";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { ContestRuleset, ContestType, ContestVisibility } from "@prisma/client";
import { format } from "date-fns";
import { CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardCheck, Layers, Plus, Search, Shield, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const STEP_LABELS = ["Basics", "Schedule", "Problems", "Rules", "Review"] as const;
const STEP_META = [
  { label: "Basics", description: "Identity, copy, and format.", icon: Sparkles },
  { label: "Schedule", description: "Window, grace, and access.", icon: CalendarDays },
  { label: "Problems", description: "Curate the exact set.", icon: Layers },
  { label: "Rules", description: "Scoring, freeze, anti-cheat.", icon: Shield },
  { label: "Review", description: "Final audit before launch.", icon: ClipboardCheck },
] as const;
const STEP_VALIDATION_FIELDS: Record<number, (keyof BuilderFormValues)[]> = {
  0: ["name", "slug"],
  1: ["startsAt", "endsAt"],
};
const FRIENDLY_ERROR_MESSAGES: Partial<Record<keyof BuilderFormValues, string>> = {
  name: "You can't leave contest name empty",
  slug: "Provide a slug using lowercase letters, digits, or hyphens",
  startsAt: "Set the contest start time",
  endsAt: "Set when the contest ends",
};

const cloneDefaultSettings = () => structuredClone(defaultContestSettings);

type ContestCreationWizardProps = {
  canCreate?: boolean;
  onCreated?: () => void;
  variant?: "dialog" | "page";
};

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

const ERROR_PRIORITY: (keyof BuilderFormValues)[] = ["name", "slug", "startsAt", "endsAt"];

function extractErrorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }
  if (typeof error === "string") {
    return error;
  }
  if (Array.isArray(error)) {
    for (const entry of error) {
      const message = extractErrorMessage(entry);
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

function resolveFriendlyErrorMessage(errors: FieldErrors<BuilderFormValues>): string | null {
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
): string | null {
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

export function ContestCreationWizard({ canCreate = true, onCreated, variant = "dialog" }: ContestCreationWizardProps) {
  const isPageVariant = variant === "page";
  const router = useRouter();
  const [open, setOpen] = useState(isPageVariant);
  const [step, setStep] = useState(0);
  const [settings, setSettings] = useState(() => cloneDefaultSettings());
  const [selectedProblems, setSelectedProblems] = useState<SelectedProblem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const problemCatalog = trpc.staff.contests.problemCatalog.useQuery(
    { query: searchTerm },
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
    setStep(0);
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
  const createContest = trpc.staff.contests.create.useMutation({
    onSuccess: () => {
      toast.success("Contest created");
      resetBuilder();
      if (isPageVariant) {
        router.push("/staff/contests");
      } else {
        setOpen(false);
      }
      onCreated?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const disableNext = step === 2 && selectedProblems.length === 0;
  const goToStep = (next: number) => setStep(Math.max(0, Math.min(STEP_LABELS.length - 1, next)));
  const handleProblemSelect = (problem: {
    id: string;
    slug: string;
    currentVersion?: { title: string | null } | null;
    difficulty?: { code: string | null } | null;
  }) => {
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
    setSelectedProblems((prev) => prev.map((problem) => (problem.problemId === problemId ? { ...problem, ...patch } : problem)));
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
    const fields = STEP_VALIDATION_FIELDS[step];
    if (!fields) {
      return true;
    }
    const isValid = await form.trigger(fields, { shouldFocus: true });
    if (!isValid) {
      const message =
        resolveMessageForFields(form.formState.errors, fields) ?? resolveFriendlyErrorMessage(form.formState.errors);
      if (message) {
        toast.warning(message);
      }
    }
    return isValid;
  }, [form, step]);
  const handleNextStep = async () => {
    const isValid = await validateCurrentStep();
    if (!isValid) {
      return;
    }
    goToStep(step + 1);
  };
  const handleSubmit = form.handleSubmit(
    (values) => {
      if (selectedProblems.length === 0) {
        toast.warning("Add at least one problem before launching.");
        setStep(2);
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
  const stepProgress = ((step + 1) / STEP_LABELS.length) * 100;
  const handleResetClick = () => {
    resetBuilder();
    toast.info("Builder reset", {
      description: "All inputs returned to their defaults.",
    });
  };
  const builderMarkup = (
    <div className="space-y-8 p-6 sm:p-8">
      <div className="rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card/80 to-accent/30 p-6 shadow-[0_30px_120px_rgba(15,23,42,0.12)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Contest Builder</p>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Launch a new contest</h2>
              <p className="text-sm text-muted-foreground">Five precise passes cover everything from copy to anti-cheat.</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Step <span className="font-semibold text-foreground">{step + 1}</span> / {STEP_LABELS.length}
          </div>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-border/60">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${stepProgress}%` }} />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-3xl border border-border/70 bg-card/90 p-4">
          {STEP_META.map((meta, index) => {
            const status = index < step ? "complete" : index === step ? "active" : "upcoming";
            const Icon = meta.icon;
            return (
              <button
                key={meta.label}
                type="button"
                disabled={index > step}
                onClick={() => goToStep(index)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition",
                  status === "complete"
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : status === "active"
                      ? "border-foreground/20 bg-card text-foreground shadow-lg"
                      : "border-border/60 text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold",
                    status === "complete"
                      ? "border-primary bg-primary text-primary-foreground"
                      : status === "active"
                        ? "border-foreground text-foreground"
                        : "border-border text-muted-foreground",
                  )}
                >
                  {status === "complete" ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{meta.label}</p>
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                </div>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </button>
            );
          })}
        </aside>
        <div className="rounded-3xl border border-border/80 bg-card/95 p-4 sm:p-6">
          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-8">
              {step === 0 ? <BasicsStep form={form} /> : null}
              {step === 1 ? <ScheduleStep form={form} settings={settings} updateSettings={updateSettings} /> : null}
              {step === 2 ? (
                <ProblemsStep
                  loading={problemCatalog.isLoading}
                  catalog={problemCatalog.data ?? []}
                  selected={selectedProblems}
                  onSelect={handleProblemSelect}
                  onUpdate={updateProblem}
                  onRemove={removeProblem}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                />
              ) : null}
              {step === 3 ? <RulesStep settings={settings} updateSettings={updateSettings} /> : null}
              {step === 4 ? (
                <ReviewStep formValues={form.watch()} selectedProblems={selectedProblems} settings={settings} />
              ) : null}
              <div className="flex flex-col gap-3 border-t border-dashed border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{STEP_LABELS[step]}</span> · Step {step + 1} of {STEP_LABELS.length}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="ghost" className="rounded-full" onClick={handleResetClick}>
                    Reset
                  </Button>
                  <Button type="button" variant="ghost" className="rounded-full" disabled={step === 0} onClick={() => goToStep(step - 1)}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  {step < STEP_LABELS.length - 1 ? (
                    <Button type="button" className="rounded-full" disabled={disableNext} onClick={handleNextStep}>
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="submit" className="rounded-full bg-gradient-to-r from-primary to-primary/80" disabled={createContest.isPending}>
                      {createContest.isPending ? "Launching…" : "Launch contest"}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
  if (isPageVariant) {
    return (
      <section className="rounded-3xl border border-border/80 bg-card/95 text-card-foreground shadow-[0_30px_120px_rgba(15,23,42,0.08)]">
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
          <Sparkles className="mr-2 h-4 w-4" />
          Plan contest
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl border-0 bg-transparent p-0 shadow-none">
        <div className="rounded-3xl border border-border/80 bg-card/95">{builderMarkup}</div>
      </DialogContent>
    </Dialog>
  );
}

function BasicsStep({ form }: { form: ReturnType<typeof useForm<BuilderFormValues>> }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
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
                    placeholder="One line teaser, duration, or format."
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
        <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
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
        </div>
        <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
          <FormField
            control={form.control}
            name="visibility"
            render={({ field }) => (
              <FormItem>
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
        </div>
        <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
          <FormField
            control={form.control}
            name="rules"
            render={({ field }) => (
              <FormItem>
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
      </div>
      <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Rated contest</p>
            <p className="text-xs text-muted-foreground">Enable delta tracking and leaderboard badges.</p>
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
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="startsAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Starts</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
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
                <Input type="datetime-local" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="freezeAt"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Freeze at (optional)</FormLabel>
            <FormControl>
              <Input type="datetime-local" value={field.value ?? ""} onChange={(event) => field.onChange(event.target.value || null)} />
            </FormControl>
          </FormItem>
        )}
      />
      <div className="grid gap-4 md:grid-cols-2">
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
          <Label className="text-xs uppercase">Late join cutoff</Label>
          <Input
            type="number"
            value={settings.schedule.lateJoinCutoffMinutes ?? ""}
            placeholder="Use grace minutes"
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
          <div>
            <p className="text-sm font-medium">Allow late join</p>
            <p className="text-xs text-muted-foreground">Respect cutoff above.</p>
          </div>
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
          <div>
            <p className="text-sm font-medium">Per-user timer</p>
            <p className="text-xs text-muted-foreground">Start countdown on registration.</p>
          </div>
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
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registration & access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
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
                <SelectTrigger>
                  <SelectValue placeholder="Open" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="password">Password protected</SelectItem>
                  <SelectItem value="invite">Invite only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {settings.registration.mode === "password" ? (
              <div className="grid gap-1">
                <Label className="text-xs uppercase">Access code</Label>
                <Input
                  type="password"
                  value={settings.registration.accessCodeHash ?? ""}
                  onChange={(event) =>
                    updateSettings((current) => ({
                      ...current,
                      registration: {
                        ...current.registration,
                        accessCodeHash: event.target.value || null,
                      },
                    }))
                  }
                />
              </div>
            ) : null}
            <div className="grid gap-1">
              <Label className="text-xs uppercase">Capacity</Label>
              <Input
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
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Waitlist enabled</span>
                <Switch
                  checked={settings.registration.waitlistEnabled}
                  onCheckedChange={(value) =>
                    updateSettings((current) => ({
                      ...current,
                      registration: { ...current.registration, waitlistEnabled: value },
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Require verified email</p>
                <p className="text-xs text-muted-foreground">Keeps burners out of rated events.</p>
              </div>
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
            <div className="grid gap-1">
              <Label className="text-xs uppercase">Allowed countries</Label>
              <Textarea
                placeholder="US,CA,IN"
                rows={2}
                value={settings.registration.allowedCountries.join(", ")}
                onChange={(event) => {
                  const tokens = event.target.value
                    .split(",")
                    .map((token) => token.trim().toUpperCase())
                    .filter(Boolean);
                  updateSettings((current) => ({
                    ...current,
                    registration: { ...current.registration, allowedCountries: tokens },
                  }));
                }}
              />
              <p className="text-xs text-muted-foreground">Use ISO country codes, comma separated.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Virtual slots</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Allow virtual mode</p>
                <p className="text-xs text-muted-foreground">Let users replay archived rounds.</p>
              </div>
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
            <div className="grid gap-1">
              <Label className="text-xs uppercase">Cooldown hours</Label>
              <Input
                type="number"
                value={settings.virtual.cooldownHours}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    virtual: { ...current.virtual, cooldownHours: Number(event.target.value) || 0 },
                  }))
                }
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs uppercase">Max concurrent</Label>
              <Input
                type="number"
                value={settings.virtual.maxConcurrent}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    virtual: { ...current.virtual, maxConcurrent: Number(event.target.value) || 1 },
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

type ProblemsProps = {
  catalog: Array<{ id: string; slug: string; currentVersion?: { title: string | null } | null; difficulty?: { code: string | null } | null }>;
  loading: boolean;
  selected: SelectedProblem[];
  onSelect: (problem: { id: string; slug: string; currentVersion?: { title: string | null } | null; difficulty?: { code: string | null } | null }) => void;
  onUpdate: (problemId: string, patch: Partial<SelectedProblem>) => void;
  onRemove: (problemId: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
};

function ProblemsStep({ catalog, loading, selected, onSelect, onUpdate, onRemove, searchTerm, onSearchChange }: ProblemsProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleAdvanced = (problemId: string) =>
    setExpanded((current) => ({
      ...current,
      [problemId]: !current[problemId],
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Lock the exact pool that will appear in the round.</p>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary">
              <Plus className="mr-2 h-4 w-4" /> Add problem
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[420px] p-0" align="end">
            <div className="border-b px-3 py-2">
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={searchTerm}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Search published problems"
                  className="flex-1 border-0 bg-transparent p-1 text-sm outline-none"
                />
              </div>
            </div>
            <ScrollArea className="h-64">
              {loading ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">Loading catalog…</p>
              ) : catalog.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">No matches yet.</p>
              ) : (
                <ul className="divide-y">
                  {catalog.map((problem) => (
                    <li key={problem.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted"
                        onClick={() => onSelect(problem)}
                      >
                        <div>
                          <p className="text-sm font-medium">{problem.currentVersion?.title ?? problem.slug}</p>
                          <p className="text-xs text-muted-foreground">{problem.slug}</p>
                        </div>
                        <Badge variant="outline">{problem.difficulty?.code ?? "?"}</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>
      <div className="space-y-4">
        {selected.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Select at least one published problem to continue.
            </CardContent>
          </Card>
        ) : (
          selected.map((problem) => (
            <Card key={problem.problemId}>
              <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <p className="text-sm font-semibold">{problem.title}</p>
                  <p className="text-xs text-muted-foreground">{problem.slug}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <Label className="text-xs uppercase">Label</Label>
                    <Input
                      className="w-16"
                      value={problem.label}
                      onChange={(event) => onUpdate(problem.problemId, { label: event.target.value.toUpperCase() })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase">Points</Label>
                    <Input
                      type="number"
                      className="w-20"
                      value={problem.points}
                      onChange={(event) => onUpdate(problem.problemId, { points: Number(event.target.value) || 0 })}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => toggleAdvanced(problem.problemId)}>
                    {expanded[problem.problemId] ? "Hide settings" : "Advanced"}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onRemove(problem.problemId)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
              {expanded[problem.problemId] ? (
                <CardContent className="space-y-4 border-t bg-muted/30">
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
                            settings: { ...problem.settings, visibility: value as typeof problem.settings.visibility },
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
                </CardContent>
              ) : null}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

type RulesProps = {
  settings: typeof defaultContestSettings;
  updateSettings: (updater: (current: typeof defaultContestSettings) => typeof defaultContestSettings) => void;
};

function RulesStep({ settings, updateSettings }: RulesProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scoring</CardTitle>
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
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="ICPC">ICPC</TabsTrigger>
              <TabsTrigger value="CF">CF</TabsTrigger>
              <TabsTrigger value="ATCODER">AtCoder</TabsTrigger>
              <TabsTrigger value="CUSTOM">Custom</TabsTrigger>
            </TabsList>
            <TabsContent value="ICPC" className="space-y-3 pt-3">
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
            <TabsContent value="CF" className="grid gap-3 pt-3 md:grid-cols-2">
              <div>
                <Label className="text-xs uppercase">Wrong attempt penalty</Label>
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
            <TabsContent value="CUSTOM" className="grid gap-3 pt-3 md:grid-cols-3">
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scoreboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                <SelectItem value="top">Top N</SelectItem>
                <SelectItem value="self">Self only</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs uppercase">Refresh interval (seconds)</Label>
            <Input
              type="number"
              value={settings.scoreboard.refreshIntervalSec}
              onChange={(event) =>
                updateSettings((current) => ({
                  ...current,
                  scoreboard: { ...current.scoreboard, refreshIntervalSec: Number(event.target.value) || 15 },
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm">Highlight first solve</p>
            <Switch
              checked={settings.scoreboard.highlightFirstSolve}
              onCheckedChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  scoreboard: { ...current.scoreboard, highlightFirstSolve: value },
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm">Show penalty column</p>
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
            <p className="text-sm">Badge virtual participants</p>
            <Switch
              checked={settings.scoreboard.showVirtualBadge}
              onCheckedChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  scoreboard: { ...current.scoreboard, showVirtualBadge: value },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feedback & judging</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1">
            <Label className="text-xs uppercase">Visibility during contest</Label>
            <Select
              value={settings.feedback.visibility}
              onValueChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  feedback: { ...current.feedback, visibility: value as typeof current.feedback.visibility },
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hidden">Hidden</SelectItem>
                <SelectItem value="status">Status only</SelectItem>
                <SelectItem value="full">Full details</SelectItem>
                <SelectItem value="post">Post-contest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm">Show runtime</p>
            <Switch
              checked={settings.feedback.showRuntime}
              onCheckedChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  feedback: { ...current.feedback, showRuntime: value },
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm">Show memory</p>
            <Switch
              checked={settings.feedback.showMemory}
              onCheckedChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  feedback: { ...current.feedback, showMemory: value },
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm">Unlock after upsolve</p>
            <Switch
              checked={settings.feedback.unlockOnUpsolve}
              onCheckedChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  feedback: { ...current.feedback, unlockOnUpsolve: value },
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm">Hide failing cases</p>
            <Switch
              checked={settings.feedback.hideFailedCaseDetails}
              onCheckedChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  feedback: { ...current.feedback, hideFailedCaseDetails: value },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integrity & freeze</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable freeze</p>
              <p className="text-xs text-muted-foreground">Hide scoreboard deltas near the finish line.</p>
            </div>
            <Switch
              checked={settings.freeze.enabled}
              onCheckedChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  freeze: { ...current.freeze, enabled: value },
                }))
              }
            />
          </div>
          {settings.freeze.enabled ? (
            <div className="grid gap-2">
              <Label className="text-xs uppercase">Offset minutes</Label>
              <Input
                type="number"
                value={settings.freeze.offsetMinutes}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    freeze: { ...current.freeze, offsetMinutes: Number(event.target.value) },
                  }))
                }
              />
            </div>
          ) : null}
          {[
            {
              label: "Lock discussions",
              key: "lockDiscussions" as const,
            },
            {
              label: "Lock profiles",
              key: "lockProfiles" as const,
            },
            {
              label: "Lock trails",
              key: "lockTrails" as const,
            },
          ].map((toggle) => (
            <div key={toggle.key} className="flex items-center justify-between">
              <p className="text-sm">{toggle.label}</p>
              <Switch
                checked={settings.antiCheat[toggle.key]}
                onCheckedChange={(value) =>
                  updateSettings((current) => ({
                    ...current,
                    antiCheat: { ...current.antiCheat, [toggle.key]: value },
                  }))
                }
              />
            </div>
          ))}
          <div className="flex items-center justify-between">
            <p className="text-sm">Enforce IP/device</p>
            <Switch
              checked={settings.antiCheat.enforceIp}
              onCheckedChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  antiCheat: { ...current.antiCheat, enforceIp: value },
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm">Similarity review</p>
            <Switch
              checked={settings.antiCheat.similarityReview}
              onCheckedChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  antiCheat: { ...current.antiCheat, similarityReview: value },
                }))
              }
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs uppercase">Submission throttle (per minute)</Label>
            <Input
              type="number"
              value={settings.antiCheat.throttlePerMinute}
              onChange={(event) =>
                updateSettings((current) => ({
                  ...current,
                  antiCheat: { ...current.antiCheat, throttlePerMinute: Number(event.target.value) || 1 },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Problem presentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm">Randomize order per user</p>
            <Switch
              checked={settings.problemSet.randomizeOrder}
              onCheckedChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  problemSet: { ...current.problemSet, randomizeOrder: value },
                }))
              }
            />
          </div>
          {[
            { label: "Show tags", key: "showTags" as const },
            { label: "Show difficulty", key: "showDifficulty" as const },
            { label: "Show acceptance rate", key: "showAcceptance" as const },
          ].map((toggle) => (
            <div key={toggle.key} className="flex items-center justify-between">
              <p className="text-sm">{toggle.label}</p>
              <Switch
                checked={settings.problemSet[toggle.key]}
                onCheckedChange={(value) =>
                  updateSettings((current) => ({
                    ...current,
                    problemSet: { ...current.problemSet, [toggle.key]: value },
                  }))
                }
              />
            </div>
          ))}
          <div className="grid gap-1">
            <Label className="text-xs uppercase">Default attempts</Label>
            <Input
              type="number"
              value={settings.problemSet.defaultAttempts ?? ""}
              onChange={(event) =>
                updateSettings((current) => ({
                  ...current,
                  problemSet: {
                    ...current.problemSet,
                    defaultAttempts: event.target.value ? Number(event.target.value) : null,
                  },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Post-contest</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Auto unfreeze scoreboard", key: "autoUnfreeze" as const },
            { label: "Release editorial automatically", key: "autoReleaseEditorial" as const },
            { label: "Enable upsolve mode", key: "enableUpsolve" as const },
            { label: "Unlock discussions", key: "unlockDiscussions" as const },
            { label: "Release hidden cases", key: "releaseHiddenCases" as const },
          ].map((toggle) => (
            <div key={toggle.key} className="flex items-center justify-between">
              <p className="text-sm">{toggle.label}</p>
              <Switch
                checked={settings.postContest[toggle.key]}
                onCheckedChange={(value) =>
                  updateSettings((current) => ({
                    ...current,
                    postContest: { ...current.postContest, [toggle.key]: value },
                  }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold">Window</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(formValues.startsAt), "PPPpp")} → {format(new Date(formValues.endsAt), "PPPpp")}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold">Mode</p>
            <p className="text-sm text-muted-foreground">
              {formValues.type} · {formValues.visibility}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold">Problems locked</p>
            <p className="text-sm text-muted-foreground">{selectedProblems.length}</p>
          </div>
          <div>
            <p className="text-sm font-semibold">Scoring</p>
            <p className="text-sm text-muted-foreground">{settings.scoring.mode}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Problem set</CardTitle>
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
