"use client";

import { trpc } from "@/lib/trpc/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Save, Send, ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type SampleRow = {
  id?: string;
  ordinal: number;
  input: string;
  output: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  points?: number | null;
};

export function ProblemEditorShell({ problemId }: { problemId: string }) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.staff.problems.get.useQuery({ id: problemId });
  const { data: metadata } = trpc.problems.filterMetadata.useQuery();

  const saveContent = trpc.staff.problems.saveContent.useMutation({
    onSuccess: () => {
      utils.staff.problems.get.invalidate({ id: problemId });
      toast.success("Content saved");
    },
  });
  const saveMetadata = trpc.staff.problems.saveMetadata.useMutation({
    onSuccess: () => {
      utils.staff.problems.get.invalidate({ id: problemId });
      toast.success("Metadata saved");
    },
  });
  const saveTests = trpc.staff.problems.updateTests.useMutation({
    onSuccess: () => {
      utils.staff.problems.get.invalidate({ id: problemId });
      toast.success("Tests updated");
    },
  });
  const submitForReview = trpc.staff.problems.submitForReview.useMutation({
    onSuccess: () => {
      utils.staff.problems.get.invalidate({ id: problemId });
      toast.success("Sent to review");
    },
  });
  const requestChanges = trpc.staff.problems.requestChanges.useMutation({
    onSuccess: () => {
      utils.staff.problems.get.invalidate({ id: problemId });
      toast.success("Returned to draft");
    },
  });
  const approve = trpc.staff.problems.approve.useMutation({
    onSuccess: () => {
      utils.staff.problems.get.invalidate({ id: problemId });
      toast.success("Approved");
    },
  });
  const publish = trpc.staff.problems.publish.useMutation({
    onSuccess: () => {
      utils.staff.problems.get.invalidate({ id: problemId });
      toast.success("Published");
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
  const [metadataState, setMetadataState] = useState({
    slug: "",
    visibility: "INTERNAL",
    difficultyCode: "",
    tagsInput: "",
  });
  const [samples, setSamples] = useState<SampleRow[]>([]);
  const [hidden, setHidden] = useState<SampleRow[]>([]);

  useEffect(() => {
    if (data) {
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
        tagsInput: data.tags.map((tag) => tag.slug).join(","),
      });
      setSamples(
        data.tests.samples.length > 0
          ? data.tests.samples
          : [
              {
                ordinal: 1,
                input: "",
                output: "",
                timeLimitMs: 2000,
                memoryLimitMb: 256,
              },
            ],
      );
      setHidden(
        data.tests.hidden.length > 0
          ? data.tests.hidden
          : [
              {
                ordinal: 1,
                input: "",
                output: "",
                timeLimitMs: 2000,
                memoryLimitMb: 256,
              },
            ],
      );
    }
  }, [data]);

  const lintIssues = useMemo(() => {
    const issues: string[] = [];
    if (contentState.statement.length < 200) {
      issues.push("Statement should be at least 200 characters.");
    }
    if (contentState.samples.length === 0) {
      issues.push("Add at least one sample for the public statement.");
    }
    if (metadataState.tagsInput.split(",").filter(Boolean).length === 0) {
      issues.push("Add at least one tag.");
    }
    return issues;
  }, [contentState.statement.length, contentState.samples.length, metadataState.tagsInput]);

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
      tagSlugs: metadataState.tagsInput
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    });
  };

  const handleSaveTests = () => {
    saveTests.mutate({
      problemId,
      samples,
      hidden,
    });
  };

  const addSampleRow = (kind: "sample" | "hidden") => {
    const setter = kind === "sample" ? setSamples : setHidden;
    setter((rows) => [
      ...rows,
      {
        ordinal: rows.length + 1,
        input: "",
        output: "",
        timeLimitMs: 2000,
        memoryLimitMb: 256,
      },
    ]);
  };

  const updateRow = (
    kind: "sample" | "hidden",
    index: number,
    field: keyof SampleRow,
    value: string,
  ) => {
    const list = kind === "sample" ? samples : hidden;
    const setter = kind === "sample" ? setSamples : setHidden;
    setter((rows) =>
      rows.map((row, idx) =>
        idx === index
          ? {
              ...row,
              [field]:
                field === "ordinal" ||
                field === "timeLimitMs" ||
                field === "memoryLimitMb" ||
                field === "points"
                  ? Number(value)
                  : value,
            }
          : row,
      ),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-muted-foreground">{data.slug}</p>
          <h1 className="text-2xl font-semibold">{contentState.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{data.state.toLowerCase()}</Badge>
          <Badge variant="outline">{data.visibility.toLowerCase()}</Badge>
        </div>
      </div>

      <Tabs defaultValue="content" className="space-y-6">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Statement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={contentState.title}
                onChange={(event) =>
                  setContentState((state) => ({ ...state, title: event.target.value }))
                }
                placeholder="Problem title"
              />
              <Textarea
                value={contentState.statement}
                onChange={(event) =>
                  setContentState((state) => ({ ...state, statement: event.target.value }))
                }
                placeholder="Problem statement (supports Markdown + KaTeX)"
                rows={8}
              />
              <Textarea
                value={contentState.constraints}
                onChange={(event) =>
                  setContentState((state) => ({ ...state, constraints: event.target.value }))
                }
                placeholder="Constraints"
                rows={4}
              />
              <Textarea
                value={contentState.hints}
                onChange={(event) =>
                  setContentState((state) => ({ ...state, hints: event.target.value }))
                }
                placeholder="Notes & hints"
                rows={3}
              />
              <Textarea
                value={contentState.editorial}
                onChange={(event) =>
                  setContentState((state) => ({ ...state, editorial: event.target.value }))
                }
                placeholder="Editorial"
                rows={6}
              />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Public samples</p>
                  <p className="text-xs text-muted-foreground">
                    These show up in the reader immediately.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setContentState((state) => ({
                      ...state,
                      samples: [...state.samples, { input: "", output: "" }],
                    }))
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Add sample
                </Button>
              </div>
              {contentState.samples.map((sample, index) => (
                <div
                  key={index}
                  className="grid gap-2 rounded-xl border border-white/5 bg-muted/10 p-3 md:grid-cols-2"
                >
                  <Textarea
                    value={sample.input}
                    onChange={(event) => {
                      const next = [...contentState.samples];
                      next[index] = { ...next[index], input: event.target.value };
                      setContentState((state) => ({ ...state, samples: next }));
                    }}
                    placeholder="Input"
                  />
                  <Textarea
                    value={sample.output}
                    onChange={(event) => {
                      const next = [...contentState.samples];
                      next[index] = { ...next[index], output: event.target.value };
                      setContentState((state) => ({ ...state, samples: next }));
                    }}
                    placeholder="Output"
                  />
                </div>
              ))}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {lintIssues.length > 0 ? (
                    <div className="flex items-center gap-2 text-amber-500">
                      <ShieldAlert className="h-4 w-4" />
                      <span>{lintIssues.length} issue(s) detected.</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-500">
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

        <TabsContent value="metadata" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Slug</label>
                <Input
                  value={metadataState.slug}
                  onChange={(event) =>
                    setMetadataState((state) => ({ ...state, slug: event.target.value }))
                  }
                />
              </div>
              <Select
                value={metadataState.visibility}
                onValueChange={(value) =>
                  setMetadataState((state) => ({ ...state, visibility: value }))
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
              <div>
                <label className="text-sm font-medium">Tags</label>
                <Input
                  value={metadataState.tagsInput}
                  onChange={(event) =>
                    setMetadataState((state) => ({ ...state, tagsInput: event.target.value }))
                  }
                  placeholder="Comma separated tag slugs"
                />
              </div>
              <div className="flex items-center justify-end">
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
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sample tests</CardTitle>
                <p className="text-sm text-muted-foreground">Visible to users.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => addSampleRow("sample")}>
                <Plus className="mr-2 h-4 w-4" /> Add sample
              </Button>
            </CardHeader>
            <CardContent>
              <TestTable
                rows={samples}
                onChange={(index, field, value) => updateRow("sample", index, field, value)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Hidden tests</CardTitle>
                <p className="text-sm text-muted-foreground">Used by the judge.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => addSampleRow("hidden")}>
                <Plus className="mr-2 h-4 w-4" /> Add hidden case
              </Button>
            </CardHeader>
            <CardContent>
              <TestTable
                rows={hidden}
                onChange={(index, field, value) => updateRow("hidden", index, field, value)}
              />
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button onClick={handleSaveTests} disabled={saveTests.isPending}>
              {saveTests.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save tests
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="review">
          <Card>
            <CardHeader>
              <CardTitle>Review workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => submitForReview.mutate({ problemId })}
                  disabled={submitForReview.isPending || data.state === "REVIEW"}
                >
                  {submitForReview.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send to review
                </Button>
                <Button
                  variant="outline"
                  onClick={() => requestChanges.mutate({ problemId })}
                  disabled={requestChanges.isPending || data.state === "DRAFT"}
                >
                  Return to draft
                </Button>
                <Button
                  variant="outline"
                  onClick={() => approve.mutate({ problemId })}
                  disabled={approve.isPending}
                >
                  Approve
                </Button>
                <Button
                  variant="default"
                  onClick={() =>
                    publish.mutate({ problemId, visibility: metadataState.visibility as any })
                  }
                  disabled={publish.isPending}
                >
                  Publish
                </Button>
              </div>
              <div>
                <p className="text-sm font-medium">Recent review events</p>
                {data.reviews.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No reviews yet.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {data.reviews.map((review) => (
                      <li
                        key={review.id}
                        className="rounded-lg border border-white/5 bg-muted/10 p-2"
                      >
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
    </div>
  );
}

function TestTable({
  rows,
  onChange,
}: {
  rows: SampleRow[];
  onChange: (index: number, field: keyof SampleRow, value: string) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>Input</TableHead>
          <TableHead>Output</TableHead>
          <TableHead>Limits</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={index}>
            <TableCell>
              <Input
                type="number"
                min={1}
                value={row.ordinal}
                onChange={(event) => onChange(index, "ordinal", event.target.value)}
              />
            </TableCell>
            <TableCell>
              <Textarea
                value={row.input}
                onChange={(event) => onChange(index, "input", event.target.value)}
                rows={3}
              />
            </TableCell>
            <TableCell>
              <Textarea
                value={row.output}
                onChange={(event) => onChange(index, "output", event.target.value)}
                rows={3}
              />
            </TableCell>
            <TableCell>
              <div className="grid gap-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>Time (ms)</span>
                  <Input
                    type="number"
                    value={row.timeLimitMs}
                    onChange={(event) => onChange(index, "timeLimitMs", event.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span>Memory (MB)</span>
                  <Input
                    type="number"
                    value={row.memoryLimitMb}
                    onChange={(event) => onChange(index, "memoryLimitMb", event.target.value)}
                  />
                </div>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
