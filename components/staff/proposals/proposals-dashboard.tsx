"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

const STATUSES = [
  "SUBMITTED",
  "PRESCREEN",
  "IN_REVIEW",
  "ACCEPTED",
  "CHANGES_REQUESTED",
  "REJECTED",
] as const;

export function StaffProposalsDashboard() {
  const router = useRouter();
  const [status, setStatus] = useState<string | undefined>(undefined);
  const { data } = trpc.proposals.staffList.useQuery({ status: status as any });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Community</p>
          <h1 className="text-2xl font-semibold">Proposals</h1>
        </div>
        <Select
          value={status ?? "ALL"}
          onValueChange={(value) => setStatus(value === "ALL" ? undefined : value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUSES.map((entry) => (
              <SelectItem key={entry} value={entry}>
                {entry.replace("_", " ").toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incoming proposals</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((proposal) => (
                <TableRow key={proposal.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{proposal.title}</p>
                      <p className="text-xs text-muted-foreground">{proposal.intendedDifficulty}</p>
                    </div>
                  </TableCell>
                  <TableCell>{proposal.author.handle ?? proposal.author.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{proposal.status.toLowerCase()}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      className="text-sm text-primary underline"
                      onClick={() => router.push(`/staff/proposals/${proposal.id}`)}
                    >
                      Review
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
