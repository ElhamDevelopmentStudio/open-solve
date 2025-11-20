"use client";

import { proposalsConfig } from "@/config/proposals";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export function ProposalList() {
  const { data = [] } = trpc.proposals.listMine.useQuery();
  const statusCount = data.reduce<Record<string, number>>((acc, proposal) => {
    acc[proposal.status] = (acc[proposal.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-10 font-mono text-foreground">
      <section className="border-2 border-border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.35em] text-primary/70">
              {proposalsConfig.listing.hero.marker}
              <span className="inline-flex items-center gap-2 border border-border px-3 py-1 text-[10px] tracking-[0.25em] text-muted-foreground">
                <span className="h-2 w-2 animate-pulse bg-primary" />
                {proposalsConfig.listing.hero.badge}
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              {proposalsConfig.listing.hero.headline.line1}
              <br />
              {proposalsConfig.listing.hero.headline.line2}
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                {proposalsConfig.listing.hero.headline.line3}
              </span>
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              {proposalsConfig.listing.hero.description}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="h-11 px-6 text-xs font-bold uppercase">
                <Link href={proposalsConfig.listing.hero.primaryCta.href}>
                  {proposalsConfig.listing.hero.primaryCta.label}
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 border-2 border-border px-6 text-xs font-bold uppercase"
              >
                <Link href={proposalsConfig.listing.hero.secondaryCta.href}>
                  {proposalsConfig.listing.hero.secondaryCta.label}
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-md">
            {Object.entries(proposalsConfig.listing.statusMap).map(([status, label]) => (
              <div key={status} className="border border-border bg-background px-4 py-3">
                <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
                <p className="text-2xl font-black">{statusCount[status] ?? 0}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          marker={proposalsConfig.listing.table.marker}
          title={proposalsConfig.listing.table.title}
          description={proposalsConfig.listing.table.description}
        />
        {data.length === 0 ? (
          <div className="border-2 border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm font-bold uppercase">{proposalsConfig.listing.empty.title}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {proposalsConfig.listing.empty.description}
            </p>
            <Button asChild variant="outline" className="mt-4 px-6 text-xs font-bold uppercase">
              <Link href="/proposals/new">{proposalsConfig.listing.empty.actionLabel}</Link>
            </Button>
          </div>
        ) : (
          <div className="border-2 border-border bg-card">
            <div className="grid grid-cols-[2fr,1fr,1fr,1fr] border-b border-border bg-muted/30 px-4 py-3 text-[11px] uppercase text-muted-foreground">
              <span>{proposalsConfig.listing.table.headers.title}</span>
              <span>{proposalsConfig.listing.table.headers.difficulty}</span>
              <span>{proposalsConfig.listing.table.headers.status}</span>
              <span>{proposalsConfig.listing.table.headers.updated}</span>
            </div>
            <div>
              {data.map((proposal) => (
                <div
                  key={proposal.id}
                  className="grid grid-cols-[2fr,1fr,1fr,1fr] border-b border-border/70 px-4 py-4 text-sm transition hover:bg-accent/20"
                >
                  <div>
                    <p className="font-bold uppercase tracking-tight">{proposal.title}</p>
                    <p className="text-[11px] text-muted-foreground">@{proposal.slug}</p>
                  </div>
                  <div className="text-xs uppercase text-muted-foreground">
                    {proposal.intendedDifficulty}
                  </div>
                  <div>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {proposalsConfig.listing.statusMap[proposal.status] ?? proposal.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(proposal.updatedAt ?? proposal.createdAt), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
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
        <h2 className="text-3xl font-black tracking-tight">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground lg:max-w-3xl">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
