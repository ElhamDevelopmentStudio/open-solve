"use client";

import { proposalsConfig } from "@/config/proposals";
import { trpc } from "@/lib/trpc/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "@/components/icons";
import { useRouter } from "next/navigation";

type Sample = { input: string; output: string };

export function ProposalForm() {
  const router = useRouter();
  const submit = trpc.proposals.submit.useMutation({
    onSuccess: () => {
      toast.success("Proposal submitted");
      router.push("/proposals");
    },
  });

  const [samples, setSamples] = useState<Sample[]>([{ input: "", output: "" }]);
  const [form, setForm] = useState({
    title: "",
    intendedDifficulty: "Medium",
    statement: "",
    originalityConfirmed: false,
  });

  const canSubmit =
    form.title.length >= proposalsConfig.form.requirements.titleMin &&
    form.statement.length >= proposalsConfig.form.requirements.statementMin &&
    samples.every((sample) => sample.input.trim() && sample.output.trim()) &&
    form.originalityConfirmed;

  return (
    <div className="space-y-10 font-mono text-foreground">
      <section className="border-2 border-border bg-card p-6 md:p-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary/70">
          {proposalsConfig.form.hero.marker}
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">
          {proposalsConfig.form.hero.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {proposalsConfig.form.hero.description}
        </p>
      </section>

      <section className="border-2 border-border bg-card p-6 space-y-6">
        <SectionHeader
          marker={proposalsConfig.form.sections.metadata.marker}
          title={proposalsConfig.form.sections.metadata.title}
          description={proposalsConfig.form.sections.metadata.description}
        />
        <Input
          placeholder="Problem title"
          value={form.title}
          onChange={(event) => setForm((state) => ({ ...state, title: event.target.value }))}
          className="border-2 border-border"
        />
        <Input
          placeholder="Intended difficulty"
          value={form.intendedDifficulty}
          onChange={(event) =>
            setForm((state) => ({ ...state, intendedDifficulty: event.target.value }))
          }
          className="border-2 border-border"
        />
      </section>

      <section className="border-2 border-border bg-card p-6 space-y-4">
        <SectionHeader
          marker={proposalsConfig.form.sections.statement.marker}
          title={proposalsConfig.form.sections.statement.title}
          description={proposalsConfig.form.sections.statement.description}
        />
        <Textarea
          placeholder="Statement (markdown supported)"
          value={form.statement}
          onChange={(event) => setForm((state) => ({ ...state, statement: event.target.value }))}
          rows={14}
          className="border-2 border-border"
        />
        <p className="text-xs text-muted-foreground">{proposalsConfig.form.helper.length}</p>
      </section>

      <section className="border-2 border-border bg-card p-6 space-y-4">
        <SectionHeader
          marker={proposalsConfig.form.sections.samples.marker}
          title={proposalsConfig.form.sections.samples.title}
          description={proposalsConfig.form.sections.samples.description}
        />
        <div className="space-y-4">
          {samples.map((sample, index) => (
            <div key={index} className="border border-border bg-background p-4 space-y-3">
              <Textarea
                placeholder="Input"
                value={sample.input}
                onChange={(event) => updateSample(index, { input: event.target.value })}
                rows={3}
                className="border border-border"
              />
              <Textarea
                placeholder="Output"
                value={sample.output}
                onChange={(event) => updateSample(index, { output: event.target.value })}
                rows={3}
                className="border border-border"
              />
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 border-2 border-border px-4 text-xs font-bold uppercase"
          onClick={() => setSamples((list) => [...list, { input: "", output: "" }])}
        >
          {proposalsConfig.form.sections.samples.addLabel}
        </Button>
        <p className="text-xs text-muted-foreground">{proposalsConfig.form.helper.samples}</p>
      </section>

      <section className="border-2 border-border bg-card p-6 space-y-4">
        <SectionHeader
          marker={proposalsConfig.form.sections.confirmation.marker}
          title={proposalsConfig.form.sections.confirmation.title}
          description={proposalsConfig.form.sections.confirmation.description}
        />
        <label className="flex items-start gap-3 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={form.originalityConfirmed}
            onChange={(event) =>
              setForm((state) => ({ ...state, originalityConfirmed: event.target.checked }))
            }
            className="mt-0.5 h-4 w-4 border-2 border-border bg-background"
          />
          {proposalsConfig.form.sections.confirmation.checkboxLabel}
        </label>
        <Button
          disabled={!canSubmit || submit.isPending}
          onClick={() =>
            submit.mutate({
              title: form.title,
              intendedDifficulty: form.intendedDifficulty,
              statement: form.statement,
              samples,
              originalityConfirmed: form.originalityConfirmed,
            })
          }
          className="h-11 px-6 text-xs font-bold uppercase"
        >
          {submit.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {proposalsConfig.form.pendingLabel}
            </>
          ) : (
            proposalsConfig.form.submitLabel
          )}
        </Button>
      </section>
    </div>
  );

  function updateSample(index: number, patch: Partial<Sample>) {
    setSamples((current) =>
      current.map((sample, idx) => (idx === index ? { ...sample, ...patch } : sample)),
    );
  }
}

function SectionHeader({
  marker,
  title,
  description,
}: {
  marker: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary/70">{marker}</p>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <h2 className="text-2xl font-black tracking-tight">{title}</h2>
        {description ? (
          <p className="text-xs text-muted-foreground lg:max-w-3xl">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
