"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export function ProposalList() {
  const { data } = trpc.proposals.listMine.useQuery();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Your proposals</p>
          <CardTitle>Community queue</CardTitle>
        </div>
        <Button asChild>
          <Link href="/proposals/new">Submit new</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {data?.length ? (
          data.map((proposal) => (
            <div key={proposal.id} className="rounded-xl border border-white/5 bg-muted/10 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{proposal.title}</p>
                  <p className="text-xs text-muted-foreground">{proposal.intendedDifficulty}</p>
                </div>
                <Badge variant="outline">{proposal.status.toLowerCase()}</Badge>
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">{proposal.statement}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No proposals yet. Share your idea!</p>
        )}
      </CardContent>
    </Card>
  );
}
