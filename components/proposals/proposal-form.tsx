"use client";

import { trpc } from "@/lib/trpc/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function ProposalForm() {
  const router = useRouter();
  const submit = trpc.proposals.submit.useMutation({
    onSuccess: () => {
      toast.success("Proposal submitted");
      router.push("/proposals");
    },
  });

  const [samples, setSamples] = useState([{ input: "", output: "" }]);
  const [form, setForm] = useState({
    title: "",
    intendedDifficulty: "Medium",
    statement: "",
    originalityConfirmed: false,
  });

  const canSubmit =
    form.title.length >= 8 &&
    form.statement.length >= 200 &&
    samples.every((sample) => sample.input && sample.output) &&
    form.originalityConfirmed;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit a proposal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Title"
          value={form.title}
          onChange={(event) => setForm((state) => ({ ...state, title: event.target.value }))}
        />
        <Input
          placeholder="Intended difficulty"
          value={form.intendedDifficulty}
          onChange={(event) =>
            setForm((state) => ({ ...state, intendedDifficulty: event.target.value }))
          }
        />
        <Textarea
          placeholder="Statement (Markdown supported)"
          value={form.statement}
          onChange={(event) => setForm((state) => ({ ...state, statement: event.target.value }))}
          rows={12}
        />
        <div>
          <p className="text-sm font-medium">Samples</p>
          <div className="space-y-3">
            {samples.map((sample, index) => (
              <div key={index} className="rounded-xl border border-white/5 bg-muted/10 p-3">
                <Textarea
                  placeholder="Input"
                  value={sample.input}
                  onChange={(event) => {
                    const next = [...samples];
                    next[index] = { ...next[index], input: event.target.value };
                    setSamples(next);
                  }}
                  rows={3}
                />
                <Textarea
                  placeholder="Output"
                  className="mt-2"
                  value={sample.output}
                  onChange={(event) => {
                    const next = [...samples];
                    next[index] = { ...next[index], output: event.target.value };
                    setSamples(next);
                  }}
                  rows={3}
                />
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setSamples((list) => [...list, { input: "", output: "" }])}
          >
            Add sample
          </Button>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={form.originalityConfirmed}
            onChange={(event) =>
              setForm((state) => ({ ...state, originalityConfirmed: event.target.checked }))
            }
          />
          I confirm this problem idea is original.
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
        >
          {submit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Submit proposal
        </Button>
      </CardContent>
    </Card>
  );
}
