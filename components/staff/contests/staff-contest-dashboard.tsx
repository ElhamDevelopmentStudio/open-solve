"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { trpc } from "@/lib/trpc/client";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "@/components/ui";
import { Loader2, Sparkles, Trophy } from "lucide-react";
import { ClarificationStatus, ClarificationVisibility } from "@prisma/client";
import { toast } from "sonner";

export function StaffContestDashboard() {
  const { data, isLoading } = trpc.staff.contests.list.useQuery();
  const utils = trpc.useUtils();
  const [activeContestId, setActiveContestId] = useState<string | undefined>(undefined);
  const [respondingTo, setRespondingTo] = useState<
    { id: string; question: string; problem?: { label?: string | null } | null } | null
  >(null);
  const [responseText, setResponseText] = useState("");
  const [responseVisibility, setResponseVisibility] = useState<ClarificationVisibility>("PRIVATE");
  const [responseStatus, setResponseStatus] = useState<ClarificationStatus>("ANSWERED");

  const contestIdForQuery = activeContestId ?? data?.[0]?.id;
  const clarifications = trpc.staff.contests.clarifications.useQuery(
    { contestId: contestIdForQuery ?? "" },
    { enabled: Boolean(contestIdForQuery) },
  );
  const answerMutation = trpc.staff.contests.answerClarification.useMutation({
    onSuccess: () => {
      if (contestIdForQuery) {
        utils.staff.contests.clarifications.invalidate({ contestId: contestIdForQuery });
      }
      toast.success("Clarification updated");
      setRespondingTo(null);
      setResponseText("");
    },
    onError: (error) => toast.error(error.message),
  });
  const clarificationList = clarifications.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Admin only</p>
          <h1 className="text-2xl font-semibold">Contest control room</h1>
        </div>
        <Button asChild>
          <Link href="/staff/contests/new" className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Launch contest
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Scheduled contests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : data && data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Registrations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((contest) => (
                  <TableRow key={contest.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{contest.name}</p>
                        <p className="text-xs text-muted-foreground">/{contest.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(contest.startsAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{contest.type.toLowerCase()}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge>{contest.state.toLowerCase()}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/contests?slug=${contest.slug}`} className="inline-flex items-center gap-1 text-sm text-primary">
                        <Trophy className="h-4 w-4" /> View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No contests scheduled yet.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Clarifications</CardTitle>
          <CardDescription>Monitor questions and broadcast answers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data && data.length > 0 ? (
            <>
              <div className="grid gap-2">
                <Label className="text-xs uppercase">Contest</Label>
                <Select value={contestIdForQuery ?? ""} onValueChange={(value) => setActiveContestId(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select contest" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.map((contest) => (
                      <SelectItem key={contest.id} value={contest.id}>
                        {contest.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                {clarifications.isLoading ? (
                  <Skeleton className="h-32 w-full rounded-xl" />
                ) : clarificationList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No clarifications for this contest yet.
                  </p>
                ) : (
                  clarificationList.map((item) => (
                    <div key={item.id} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{item.problem?.label ?? "General"}</Badge>
                          {item.visibility === "PUBLIC" ? <Badge variant="secondary">Public</Badge> : null}
                          <span>by {item.author.handle ?? item.author.name ?? "User"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                          <Badge variant={item.status === "OPEN" ? "secondary" : "outline"}>
                            {item.status.toLowerCase()}
                          </Badge>
                        </div>
                      </div>
                      <p className="mt-2 text-sm font-medium">{item.question}</p>
                      {item.answer ? (
                        <div className="mt-2 rounded-md border bg-muted/40 p-2 text-sm">
                          <p className="text-xs uppercase text-muted-foreground">Answer</p>
                          <p>{item.answer}</p>
                        </div>
                      ) : null}
                      <div className="mt-3 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setRespondingTo({ id: item.id, question: item.question, problem: item.problem });
                            setResponseText(item.answer ?? "");
                            setResponseVisibility(item.visibility);
                            setResponseStatus(item.status);
                          }}
                        >
                          Respond
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Create a contest to moderate clarifications.</p>
          )}
        </CardContent>
      </Card>
      <Dialog
        open={Boolean(respondingTo)}
        onOpenChange={(open) => {
          if (!open) {
            setRespondingTo(null);
            setResponseText("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to clarification</DialogTitle>
            <DialogDescription>{respondingTo?.question}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-1">
              <Label className="text-xs uppercase">Visibility</Label>
              <Select
                value={responseVisibility}
                onValueChange={(value) => setResponseVisibility(value as ClarificationVisibility)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                  <SelectItem value="PUBLIC">Broadcast</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs uppercase">Status</Label>
              <Select
                value={responseStatus}
                onValueChange={(value) => setResponseStatus(value as ClarificationStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="ANSWERED">Answered</SelectItem>
                  <SelectItem value="ANNOUNCED">Announced</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs uppercase">Answer</Label>
              <Textarea
                rows={4}
                value={responseText}
                onChange={(event) => setResponseText(event.target.value)}
                placeholder="Write a concise response."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRespondingTo(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!responseText.trim() || answerMutation.isPending || !respondingTo || !contestIdForQuery}
              onClick={() => {
                if (!respondingTo || !contestIdForQuery) return;
                answerMutation.mutate({
                  contestId: contestIdForQuery,
                  clarificationId: respondingTo.id,
                  answer: responseText,
                  visibility: responseVisibility,
                  status: responseStatus,
                });
              }}
            >
              {answerMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
