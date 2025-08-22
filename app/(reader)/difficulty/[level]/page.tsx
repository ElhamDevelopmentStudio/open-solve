import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { CommandPalette } from "@/components/marketing/command-palette";
import {
  renderProblemLibraryPage,
  resolveViewerSessionFlag,
} from "@/components/problems/problem-library-page";
import { ArrowRight, Flame } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { difficultyPageConfig, type DifficultyLevelConfig } from "@/config/difficulty";
import { DIFFICULTIES, type DifficultyValue } from "@/lib/problems/constants";

const levelTone: Record<DifficultyValue, string> = {
  EASY: "border-success/40 bg-success/10 text-success",
  MEDIUM: "border-warning/40 bg-warning/10 text-warning",
  HARD: "border-destructive/40 bg-destructive/10 text-destructive",
};

type DifficultyParams = { level: string };

async function resolveDifficultyParams(
  paramsOrPromise: DifficultyParams | Promise<DifficultyParams>,
) {
  return paramsOrPromise instanceof Promise ? await paramsOrPromise : paramsOrPromise;
}

export async function generateMetadata({
  params,
}: {
  params: DifficultyParams | Promise<DifficultyParams>;
}): Promise<Metadata> {
  const resolved = await resolveDifficultyParams(params);
  const level = resolved.level?.toUpperCase() as DifficultyValue | undefined;
  if (!level || !DIFFICULTIES.includes(level)) {
    return { title: "Problems | OpenSolve" };
  }
  const copy = difficultyPageConfig.levels[level];
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
  };
}

export default async function DifficultyProblemsPage({
  params,
  searchParams,
}: {
  params: DifficultyParams | Promise<DifficultyParams>;
  searchParams:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await resolveDifficultyParams(params);
  const upperLevel = resolvedParams.level?.toUpperCase() as DifficultyValue | undefined;
  if (!upperLevel || !DIFFICULTIES.includes(upperLevel)) {
    notFound();
  }

  const [resolvedSearchParams, viewerHasSession] = await Promise.all([
    searchParams,
    resolveViewerSessionFlag(),
  ]);
  const existing = resolvedSearchParams.difficulty;
  const existingArray = Array.isArray(existing)
    ? existing
    : typeof existing === "string"
      ? [existing]
      : [];
  const libraryNode = await renderProblemLibraryPage({
    searchParams: {
      ...resolvedSearchParams,
      difficulty: [upperLevel, ...existingArray.filter((item) => item !== upperLevel)],
    },
    viewerHasSession,
  });
  const levelCopy = difficultyPageConfig.levels[upperLevel];

  return (
    <>
      <CommandPalette />
      <div className="space-y-12 font-mono">
        <DifficultyHero level={upperLevel} copy={levelCopy} />
        <StrategyCallouts level={upperLevel} copy={levelCopy} />
        <LibrarySection level={upperLevel} copy={levelCopy}>
          {libraryNode}
        </LibrarySection>
      </div>
    </>
  );
}

function DifficultyHero({ level, copy }: { level: DifficultyValue; copy: DifficultyLevelConfig }) {
  return (
    <section className="border-2 border-border bg-background p-8">
      <div className="mb-6 text-xs font-bold text-primary/80">
        {difficultyPageConfig.sections.hero}
      </div>
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Badge className={`rounded-none border-2 px-3 py-1 text-xs ${levelTone[level]}`}>
            {copy.hero.badge}
          </Badge>
          <h1 className="bg-linear-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-4xl font-black leading-tight tracking-tight text-transparent sm:text-5xl lg:text-6xl">
            {copy.hero.headline[0]}
            <br />
            {copy.hero.headline[1]}
            <br />
            <span className="bg-linear-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
              {copy.hero.headline[2]}
            </span>
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {copy.hero.description}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase text-muted-foreground">
            <span className="flex items-center gap-2 text-foreground">
              <Flame className="h-4 w-4" />
              {copy.label} MODE
            </span>
            <span className="h-4 w-px bg-border" aria-hidden />
            <span>{copy.summary.highlights[0]}</span>
          </div>
        </div>
        <div className="border-2 border-border bg-background/70 p-6">
          <div className="mb-4 text-xs font-bold text-primary/80">practice telemetry</div>
          <div className="grid gap-4 sm:grid-cols-3">
            {copy.stats.map((stat) => (
              <div key={stat.label} className="border border-border bg-background/50 p-4">
                <div className="text-xs text-muted-foreground">{stat.label}</div>
                <div className="text-2xl font-black text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.helper}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              asChild
              className="h-12 rounded-none border-2 border-primary px-6 text-xs font-bold"
            >
              <Link href={`/leaderboards/difficulty/${level}`}>
                LEADERBOARD
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-none border-2 border-border px-6 text-xs font-bold hover:border-primary/50"
            >
              <Link href="#difficulty-library">GO TO LIBRARY</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function StrategyCallouts({
  level,
  copy,
}: {
  level: DifficultyValue;
  copy: DifficultyLevelConfig;
}) {
  return (
    <section className="space-y-8 border-t border-border pt-12">
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-4 text-xs font-bold text-primary/80">
            {difficultyPageConfig.sections.focus}
          </div>
          <h2 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            Operating cadence for {copy.label} weeks
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Keep the surface calm and request depth only when you need it. Each panel opens a modal
          with the full playbook so the table stays focused.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Dialog>
          <div className="border-2 border-border bg-background p-6">
            <div className="mb-2 text-xs font-bold uppercase text-muted-foreground">
              {difficultyPageConfig.sections.focus}
            </div>
            <h3 className="text-xl font-bold text-foreground">Focus Playbook</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Cheatsheet of reps, pacing targets, and journal prompts tuned for{" "}
              {copy.label.toLowerCase()} blocks.
            </p>
            <DialogTrigger asChild>
              <Button className="mt-6 h-11 rounded-none border-2 border-primary px-5 text-xs font-bold">
                View playbook
              </Button>
            </DialogTrigger>
          </div>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{copy.label} focus playbook</DialogTitle>
              <DialogDescription>
                Scan before a timed block so you remember what to drill and how to score it.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-px bg-border/30 md:grid-cols-2">
              {copy.focusAreas.map((area) => (
                <div key={area.title} className="bg-background p-5">
                  <div className="mb-2 flex items-center justify-between text-[11px] uppercase text-muted-foreground">
                    <span>{area.metric}</span>
                    <Badge
                      variant="outline"
                      className={`rounded-none border px-2 py-0.5 text-[10px] ${levelTone[level]}`}
                    >
                      {copy.label}
                    </Badge>
                  </div>
                  <h4 className="text-lg font-bold text-foreground">{area.title}</h4>
                  <p className="mt-2 text-sm text-muted-foreground">{area.description}</p>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
        <Dialog>
          <div className="border-2 border-border bg-background p-6">
            <div className="mb-2 text-xs font-bold uppercase text-muted-foreground">
              {difficultyPageConfig.sections.rituals}
            </div>
            <h3 className="text-xl font-bold text-foreground">Practice Rituals</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Optional warmups and cooldowns you can rotate to reinforce speed or recovery.
            </p>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="mt-6 h-11 rounded-none border-2 border-border px-5 text-xs font-bold hover:border-primary/50"
              >
                Browse rituals
              </Button>
            </DialogTrigger>
          </div>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{copy.label} ritual library</DialogTitle>
              <DialogDescription>
                Open whenever you need fresh ideas for priming or decompression between runs.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-px bg-border/30 md:grid-cols-2">
              {copy.rituals.map((ritual) => (
                <div key={ritual.title} className="bg-background p-5">
                  <div className="text-[11px] uppercase text-muted-foreground">
                    {ritual.duration}
                  </div>
                  <h4 className="mt-2 text-lg font-bold text-foreground">{ritual.title}</h4>
                  <p className="mt-2 text-sm text-muted-foreground">{ritual.description}</p>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}

function LibrarySection({
  level,
  copy,
  children,
}: {
  level: DifficultyValue;
  copy: DifficultyLevelConfig;
  children: ReactNode;
}) {
  return (
    <section id="difficulty-library" className="space-y-8 border-t border-border pt-12">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="text-xs font-bold text-primary/80">
            {difficultyPageConfig.sections.library}
          </div>
          <h2 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            {copy.summary.title}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {copy.summary.description}
          </p>
          <ul className="grid gap-3 text-sm text-foreground">
            {copy.summary.highlights.map((highlight) => (
              <li key={highlight} className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">{highlight}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-2 border-border bg-background/60 p-6">
          <div className="mb-4 text-xs font-bold text-primary/80">
            {difficultyPageConfig.switcherLabel}
          </div>
          <div className="flex flex-wrap gap-3">
            {DIFFICULTIES.map((difficulty) => (
              <Button
                key={difficulty}
                asChild
                variant={difficulty === level ? "default" : "outline"}
                className={`h-10 rounded-none border-2 px-4 text-xs font-bold ${difficulty === level ? "border-primary" : "border-border hover:border-primary/50"}`}
              >
                <Link href={`/difficulty/${difficulty.toLowerCase()}`}>{difficulty}</Link>
              </Button>
            ))}
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}
