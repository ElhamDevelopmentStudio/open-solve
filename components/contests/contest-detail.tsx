"use client";

import { contestsConfig } from "@/config/contests";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { contestDetailQueryOptions, sessionQueryOptions } from "@/lib/react-query/policies";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";
import type { ContestSettings } from "@/lib/contests/schema";
import { ArrowLeft } from "@/components/icons";

type ContestDetailProps = {
  slug: string;
};

const detailConfig = contestsConfig.detail;

export const ContestDetail = ({ slug }: ContestDetailProps) => {
  const utils = trpc.useUtils();
  const detail = trpc.contests.detail.useQuery({ slug }, contestDetailQueryOptions);
  const session = trpc.auth.getSession.useQuery(undefined, sessionQueryOptions);

  const registerMutation = trpc.contests.register.useMutation({
    onSuccess: () => {
      utils.contests.detail.invalidate({ slug });
      utils.contests.overview.invalidate();
      toast.success("Registered successfully");
    },
    onError: (error) => toast.error(error.message),
  });

  const unregisterMutation = trpc.contests.unregister.useMutation({
    onSuccess: () => {
      utils.contests.detail.invalidate({ slug });
      utils.contests.overview.invalidate();
      toast.success("Unregistered from contest");
    },
    onError: (error) => toast.error(error.message),
  });

  if (detail.isLoading) {
    return (
      <div className="space-y-8 font-mono">
        <Skeleton className="h-16 w-full border-2 border-border" />
        <Skeleton className="h-48 w-full border-2 border-border" />
      </div>
    );
  }

  if (!detail.data) {
    return (
      <div className="border-2 border-destructive/40 bg-destructive/5 p-12 text-center font-mono">
        Contest not found.
      </div>
    );
  }

  const contest = detail.data.contest;
  const viewerRegistration = detail.data.viewerRegistration;
  const isRegistered = Boolean(viewerRegistration);

  return (
    <div className="space-y-10 font-mono text-foreground">
      <section className="border-2 border-border bg-card p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="text-xs font-bold uppercase">
            <Link href="/contests">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {detailConfig.hero.backLabel}
            </Link>
          </Button>
          <ContestStateBadge state={contest.state} />
          {contest.isRated ? (
            <Badge variant="outline" className="text-[10px] uppercase">
              Rated
            </Badge>
          ) : null}
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-primary/70">
            {detailConfig.hero.badge}
          </p>
          <h1 className="text-4xl font-black tracking-tight">{contest.name}</h1>
          {contest.description ? (
            <p className="text-sm text-muted-foreground">{contest.description}</p>
          ) : null}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <InfoBlock
            label="Starts"
            value={format(new Date(contest.startsAt), "MMM d • HH:mm")}
            helper={formatDistanceToNow(new Date(contest.startsAt), { addSuffix: true })}
          />
          <InfoBlock
            label="Participants"
            value={detail.data.registration.total.toLocaleString()}
            helper={`${detail.data.registration.virtual} virtual`}
          />
          <InfoBlock
            label="Problems"
            value={detail.data.problems.length.toString()}
            helper={contest.rules}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="border-2 border-border bg-card p-6 space-y-4">
          <SectionHeader
            marker={detailConfig.sections.scoring.marker}
            title={detailConfig.sections.scoring.title}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <KeyValue
              label={detailConfig.sections.scoring.modeLabel}
              value={contest.settings.scoring.mode}
            />
            <KeyValue
              label={detailConfig.sections.scoring.tiebreakerLabel}
              value={contest.settings.scoring.tieBreakers.join(", ")}
            />
            <KeyValue label={detailConfig.sections.rules.rulesetLabel} value={contest.rules} />
            <KeyValue label={detailConfig.sections.rules.typeLabel} value={contest.type} />
          </div>
        </div>
        <div className="border-2 border-border bg-card p-6 space-y-4">
          <SectionHeader
            marker={detailConfig.register.marker}
            title={
              isRegistered ? detailConfig.register.registeredLabel : detailConfig.register.joinLabel
            }
          />
          <p className="text-xs text-muted-foreground">
            {isRegistered && viewerRegistration
              ? `Joined ${formatDistanceToNow(new Date(viewerRegistration.joinedAt), { addSuffix: true })}`
              : "Register to participate and appear on the scoreboard."}
          </p>
          {isRegistered ? (
            <Button
              variant="outline"
              className="w-full border-2 border-destructive text-xs font-bold uppercase text-destructive"
              disabled={unregisterMutation.isPending}
              onClick={() => unregisterMutation.mutate({ contestId: contest.id })}
            >
              {detailConfig.register.ctaLeave}
            </Button>
          ) : (
            <Button
              className="w-full text-xs font-bold uppercase"
              disabled={registerMutation.isPending || !session.data}
              onClick={() => registerMutation.mutate({ contestId: contest.id })}
            >
              {detailConfig.register.ctaRegister}
            </Button>
          )}
          <div className="border border-border p-4 text-xs">
            <MetaRow label={detailConfig.register.meta.format} value={contest.rules} />
            <MetaRow label={detailConfig.register.meta.type} value={contest.type} />
            <MetaRow
              label={detailConfig.register.meta.scoring}
              value={contest.settings.scoring.mode}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="border-2 border-border bg-card p-6 space-y-3">
          <SectionHeader
            marker={detailConfig.sections.freeze.marker}
            title={detailConfig.sections.freeze.title}
          />
          <KeyValue
            label={detailConfig.sections.freeze.statusLabel}
            value={contest.settings.freeze.enabled ? "Enabled" : "Disabled"}
          />
          {contest.settings.freeze.enabled ? (
            <>
              <KeyValue
                label={detailConfig.sections.freeze.offsetLabel}
                value={`${contest.settings.freeze.offsetMinutes} min before end`}
              />
              <KeyValue
                label={detailConfig.sections.freeze.modeLabel}
                value={contest.settings.freeze.mode}
              />
            </>
          ) : null}
        </div>
        <div className="border-2 border-border bg-card p-6 space-y-3">
          <SectionHeader
            marker={detailConfig.sections.antiCheat.marker}
            title={detailConfig.sections.antiCheat.title}
          />
          <p className="text-xs text-muted-foreground">
            {detailConfig.sections.antiCheat.description}
          </p>
          <AntiCheatGrid antiCheat={contest.settings.antiCheat} />
        </div>
        <div className="border-2 border-border bg-card p-6 space-y-3">
          <SectionHeader
            marker={detailConfig.sections.timeline.marker}
            title={detailConfig.sections.timeline.title}
          />
          <p className="text-xs text-muted-foreground">{detailConfig.sections.timeline.helper}</p>
          <TimelineList timeline={detail.data.timeline} />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          marker={detailConfig.sections.problems.marker}
          title={detailConfig.sections.problems.title}
        />
        {detail.data.problems.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {detail.data.problems.map((problem) => (
              <Link
                key={problem.id}
                href={`/contests/${slug}/problems/${problem.label.toLowerCase()}`}
                className="border-2 border-border bg-card p-5 transition hover:border-primary"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {problem.label}
                  </Badge>
                  {problem.difficulty ? (
                    <span className="text-xs text-muted-foreground">{problem.difficulty}</span>
                  ) : null}
                </div>
                <h3 className="mt-3 text-xl font-black">{problem.title}</h3>
                <div className="mt-3 flex flex-wrap gap-3 text-[11px] uppercase text-muted-foreground">
                  <span>{problem.points ?? 100} pts</span>
                  <span>Order {problem.order + 1}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="border-2 border-border bg-card p-6 text-sm text-muted-foreground">
            {detailConfig.sections.problems.lockedCopy}
          </div>
        )}
      </section>

      <section className="flex flex-wrap gap-3">
        <Button
          asChild
          variant="outline"
          className="border-2 border-border px-6 text-xs font-bold uppercase"
        >
          <Link href={`/contests/${slug}/scoreboard`}>{detailConfig.links.scoreboard}</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="border-2 border-border px-6 text-xs font-bold uppercase"
        >
          <Link href={`/contests/${slug}/clarifications`}>{detailConfig.links.clarifications}</Link>
        </Button>
      </section>
    </div>
  );
};

function SectionHeader({ marker, title }: { marker: string; title: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary/70">{marker}</p>
      <h2 className="text-2xl font-black tracking-tight">{title}</h2>
    </div>
  );
}

function InfoBlock({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="border border-border bg-background px-4 py-3">
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
      <p className="text-2xl font-black">{value}</p>
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border border-border px-3 py-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function AntiCheatGrid({ antiCheat }: { antiCheat: ContestSettings["antiCheat"] }) {
  return (
    <div className="border border-border p-3 text-xs">
      <MetaRow
        label={detailConfig.sections.antiCheat.examMode}
        value={antiCheat.examMode?.enabled ? "Enabled" : "Disabled"}
      />
      <MetaRow
        label={detailConfig.sections.antiCheat.focusSoft}
        value={(antiCheat.focus.softWarningTabs ?? 0).toString()}
      />
      <MetaRow
        label={detailConfig.sections.antiCheat.focusFlag}
        value={(antiCheat.focus.flagTabs ?? 0).toString()}
      />
      <MetaRow
        label={detailConfig.sections.antiCheat.focusOut}
        value={Math.round((antiCheat.focus.flagOutMs ?? 0) / 60000).toString()}
      />
      <MetaRow
        label={detailConfig.sections.antiCheat.pasteLimit}
        value={(antiCheat.paste.perProblemLimit ?? 0).toString()}
      />
      <MetaRow
        label={detailConfig.sections.antiCheat.singleDevice}
        value={antiCheat.multiDevice.singleDeviceOnly ? "Yes" : "No"}
      />
    </div>
  );
}

function TimelineList({
  timeline,
}: {
  timeline: { label: string; at: Date | string; description?: string; state: string }[];
}) {
  return (
    <ol className="space-y-3 text-xs">
      {timeline.map((item) => (
        <li key={item.label} className="flex gap-3">
          <div
            className={cn(
              "mt-1 h-3 w-3 border-2",
              item.state === "complete"
                ? "border-primary bg-primary"
                : item.state === "active"
                  ? "border-success bg-success"
                  : "border-muted bg-muted",
            )}
          />
          <div>
            <p className="text-sm font-bold">{item.label}</p>
            <p>{format(new Date(item.at), "MMM d • HH:mm")}</p>
            <p className="text-muted-foreground">
              {formatDistanceToNow(new Date(item.at), { addSuffix: true })}
            </p>
            {item.description ? <p className="text-muted-foreground">{item.description}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function ContestStateBadge({ state }: { state: string }) {
  const base = "border px-3 py-1 text-[11px] font-bold uppercase";
  switch (state) {
    case "RUNNING":
      return <span className={cn(base, "border-success text-success")}>Live</span>;
    case "UPCOMING":
      return <span className={cn(base, "border-primary text-primary")}>Upcoming</span>;
    default:
      return (
        <span className={cn(base, "border-muted-foreground text-muted-foreground")}>Past</span>
      );
  }
}
