"use client";

import "katex/dist/katex.min.css";

import { ProblemStatusBadge } from "@/components/problems/problem-status-badge";
import {
  ProblemAnalyticsProvider,
  useProblemAnalyticsContext,
} from "@/components/problems/problem-analytics-provider";
import type { ContestProblemAntiCheatContext } from "@/lib/contests/anti-cheat/types";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TooltipProvider } from "@/components/ui/tooltip";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { ProblemDetailPayload } from "@/lib/trpc/router/problems";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowUpRight01Icon,
  Bookmark01Icon,
  Copy01Icon,
  Flag02Icon,
  Link01Icon,
  Share01Icon,
  MessageMultiple02Icon,
} from "hugeicons-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { toast } from "sonner";

const ProblemWorkspace = dynamic(
  () => import("@/components/problems/problem-workspace").then((mod) => mod.ProblemWorkspace),
  {
    ssr: false,
    loading: () => (
      <section
        id="editor"
        className="rounded-3xl border border-dashed border-primary/30 bg-card/80 p-6 text-sm text-muted-foreground"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-48 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-[320px] rounded-xl border border-white/10 bg-background/60" />
        </div>
      </section>
    ),
  },
);

const sectionsOrder = [
  { id: "statement", label: "Statement" },
  { id: "constraints", label: "Constraints" },
  { id: "examples", label: "Examples" },
  { id: "notes", label: "Notes" },
  { id: "samples", label: "Samples" },
] as const;

const formatDifficulty = (value?: string | null) =>
  value ? value.charAt(0) + value.slice(1).toLowerCase() : "Unrated";

export function ProblemReader({
  problem,
  contestContext,
}: {
  problem: ProblemDetailPayload;
  contestContext?: ContestProblemAntiCheatContext;
}) {
  return (
    <ProblemAnalyticsProvider problemId={problem.id}>
      <ProblemReaderContent problem={problem} contestContext={contestContext} />
    </ProblemAnalyticsProvider>
  );
}

function ProblemReaderContent({
  problem,
  contestContext,
}: {
  problem: ProblemDetailPayload;
  contestContext?: ContestProblemAntiCheatContext;
}) {
  const prefersReducedMotion = useReducedMotion();
  const analytics = useProblemAnalyticsContext();
  const contestMode = Boolean(contestContext);
  const readerAnalyticsContext = useMemo(
    () => ({
      problemId: problem.id,
      contestId: contestContext?.contestId,
    }),
    [contestContext?.contestId, problem.id],
  );
  const sectionEntries = useMemo(() => {
    return sectionsOrder
      .map((section) => {
        if (section.id === "statement" && problem.content.statement) return section;
        if (section.id === "constraints" && problem.content.constraints) return section;
        if (section.id === "examples" && problem.content.samples.length > 0) return section;
        if (section.id === "notes" && problem.content.hints) return section;
        if (section.id === "samples" && problem.content.sampleTestCases.length > 0) return section;
        return null;
      })
      .filter(Boolean) as Array<(typeof sectionsOrder)[number]>;
  }, [problem]);

  const defaultSectionId = sectionEntries[0]?.id ?? "statement";
  const [activeSection, setActiveSection] = useState<string>(defaultSectionId);
  const contentRef = useRef<HTMLDivElement>(null);
  const hintsLoggedRef = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            if (!hintsLoggedRef.current && entry.target.id === "notes") {
              hintsLoggedRef.current = true;
              analytics.markHintOpen();
            }
          }
        });
      },
      { rootMargin: "-40% 0px -40% 0px" },
    );

    sectionEntries.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [analytics, sectionEntries]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof performance === "undefined") return;
    const navEntries = performance.getEntriesByType("navigation") as
      | PerformanceNavigationTiming[]
      | undefined;
    const nav = navEntries?.[0];
    if (nav) {
      const ttfb = nav.responseStart - nav.requestStart;
      const domReady = nav.domContentLoadedEventEnd - nav.startTime;
      if (Number.isFinite(ttfb)) {
        trackAnalyticsEvent(
          "problem.performance_metric",
          {
            metric: "ttfb",
            value: Number(ttfb.toFixed(2)),
          },
          readerAnalyticsContext,
        );
      }
      if (Number.isFinite(domReady)) {
        trackAnalyticsEvent(
          "problem.performance_metric",
          {
            metric: "domReady",
            value: Number(domReady.toFixed(2)),
          },
          readerAnalyticsContext,
        );
      }
    }

    let observer: PerformanceObserver | null = null;
    if (typeof PerformanceObserver !== "undefined") {
      observer = new PerformanceObserver((entryList) => {
        const entry = entryList.getEntries().at(-1);
        if (!entry) return;
        trackAnalyticsEvent(
          "problem.performance_metric",
          {
            metric: "lcp",
            value: Number(entry.startTime.toFixed(2)),
          },
          readerAnalyticsContext,
        );
        observer?.disconnect();
      });
      try {
        observer.observe({ type: "largest-contentful-paint", buffered: true });
      } catch {
        observer?.disconnect();
      }
    }

    return () => observer?.disconnect();
  }, [problem.slug, readerAnalyticsContext]);

  const handleAnchorClick = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    element.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
  };

  const acceptancePercent = problem.stats?.acceptanceRate
    ? Math.round(problem.stats.acceptanceRate * 100)
    : null;

  const lastSubmissionLabel = problem.lastSubmissionAt
    ? formatDistanceToNow(new Date(problem.lastSubmissionAt), { addSuffix: true })
    : null;

  return (
    <TooltipProvider>
      <a href="#problem-reader-content" className="skip-link sr-only focus:not-sr-only">
        Skip to statement
      </a>
      <div ref={contentRef} id="problem-reader-content" className="space-y-10">
        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
          <Breadcrumb>
            <BreadcrumbList className="text-sm text-muted-foreground motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/problems">Problems</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {contestMode ? (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href={`/contests/${contestContext!.contestSlug}`}>
                        {contestContext!.contestName}
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </>
              ) : null}
              {problem.tags[0] ? (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href={`/tags/${problem.tags[0].slug}`}>#{problem.tags[0].name}</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </>
              ) : null}
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{problem.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        {contestMode ? (
          <div className="rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 shadow-inner shadow-primary/5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase text-primary">Educational contest</p>
                <h2 className="text-3xl font-semibold tracking-tight">
                  {contestContext!.contestName}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Solving problem {contestContext!.problemLabel}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" asChild>
                  <Link href={`/contests/${contestContext!.contestSlug}`}>Contest overview</Link>
                </Button>
                <Button asChild>
                  <Link href={`/contests/${contestContext!.contestSlug}/scoreboard`}>
                    Scoreboard
                  </Link>
                </Button>
              </div>
            </div>
            {contestContext?.antiCheat.examMode.enabled ? (
              <div className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-xs text-amber-700 dark:text-amber-200">
                Exam mode enabled — context menus and text selection are restricted for this
                workspace.
              </div>
            ) : null}
          </div>
        ) : null}
        <header className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="text-sm">
              {formatDifficulty(problem.difficulty)}
            </Badge>
            {contestMode ? (
              <Badge className="bg-primary/15 text-primary">
                Contest {contestContext!.problemLabel}
              </Badge>
            ) : null}
            {problem.judgeMode !== "AUTO" ? (
              <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-200">
                Manual Review
              </Badge>
            ) : null}
            <ProblemStatusBadge status={problem.status} />
            {lastSubmissionLabel ? (
              <span className="text-xs text-muted-foreground">
                Last attempt {lastSubmissionLabel}
              </span>
            ) : null}
            <Button size="sm" variant="outline" asChild className="ml-auto">
              <Link href={`/problems/${problem.slug}/submissions`}>Attempt history</Link>
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap items-start gap-4">
            <div className="flex-1 space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">{problem.title}</h1>
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                {problem.tags.map((tag) => (
                  <Badge
                    key={tag.slug}
                    variant="secondary"
                    className="rounded-full px-3 py-1 text-xs"
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="icon">
                <Bookmark01Icon className="h-4 w-4" strokeWidth={2} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => shareProblem(problem.id, problem.slug, problem.title)}
                aria-label="Share problem"
              >
                <Share01Icon className="h-4 w-4" strokeWidth={2} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => reportProblem(problem.id, problem.slug, problem.title)}
                aria-label="Report issue"
              >
                <Flag02Icon className="h-4 w-4" strokeWidth={2} />
              </Button>
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <Link
                  href={`/problems/${problem.slug}/discuss`}
                  onClick={() => analytics.markDiscussOpen()}
                >
                  <MessageMultiple02Icon className="h-4 w-4" strokeWidth={2} /> Discuss
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/problems/${problem.slug}/trails`}>Trails</Link>
              </Button>
              {problem.editorialIsReleased ? (
                <Button variant="ghost" size="sm" asChild>
                  <Link
                    href={`/problems/${problem.slug}/editorial`}
                    onClick={() => analytics.markEditorialOpen()}
                  >
                    Editorial
                  </Link>
                </Button>
              ) : null}
            </div>
            <Button className="flex items-center gap-2" asChild>
              <a href="#editor" onClick={() => analytics.markSolveClick("header")}>
                Start solving
                <ArrowUpRight01Icon className="h-4 w-4" strokeWidth={2.5} />
              </a>
            </Button>
          </div>
          <div className="mt-6 grid gap-4 rounded-xl border border-border/50 bg-muted/30 p-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Acceptance</p>
              <p className="mt-1 text-lg font-semibold">
                {acceptancePercent !== null ? `${acceptancePercent}%` : "Not enough data"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Submissions</p>
              <p className="mt-1 text-lg font-semibold">
                {problem.stats?.submissionCount?.toLocaleString() ?? "—"}
              </p>
            </div>
          </div>
        </header>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-8">
          <article className="space-y-8">
            {problem.content.statement ? (
              <ProblemSection id="statement" title="Statement">
                <Markdown
                  content={problem.content.statement}
                  problemId={problem.id}
                  field="Statement"
                />
              </ProblemSection>
            ) : null}

            {problem.content.constraints ? (
              <ProblemSection id="constraints" title="Constraints">
                <Markdown
                  content={problem.content.constraints}
                  problemId={problem.id}
                  field="Constraints"
                />
              </ProblemSection>
            ) : null}

            {problem.content.samples.length > 0 ? (
              <ProblemSection id="examples" title="Examples">
                <div className="space-y-5">
                  {problem.content.samples.map((sample, index) => (
                    <SampleCard
                      key={`${sample.input}-${index}`}
                      sample={sample}
                      index={index}
                      problemId={problem.id}
                    />
                  ))}
                </div>
              </ProblemSection>
            ) : null}

            {problem.content.hints ? (
              <ProblemSection id="notes" title="Notes & Hints">
                <Markdown content={problem.content.hints} problemId={problem.id} field="Notes" />
              </ProblemSection>
            ) : null}

            {problem.content.sampleTestCases.length > 0 ? (
              <ProblemSection id="samples" title="Sample I/O" collapsible>
                <div className="space-y-3">
                  {problem.content.sampleTestCases.map((test) => (
                    <div key={test.ordinal} className="rounded-2xl border bg-muted/40 p-4">
                      <p className="text-sm font-semibold">Sample #{test.ordinal}</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <CopyField
                          label="Input"
                          value={test.input}
                          problemId={problem.id}
                          field={`Sample ${test.ordinal} Input`}
                          isHidden={test.kind === "HIDDEN"}
                        />
                        <CopyField
                          label="Output"
                          value={test.output}
                          problemId={problem.id}
                          field={`Sample ${test.ordinal} Output`}
                          isHidden={test.kind === "HIDDEN"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </ProblemSection>
            ) : null}
          </article>

          <aside className="mt-10 lg:mt-0">
            <div className="sticky top-24 space-y-8">
              {sectionEntries.length > 0 ? (
                <nav
                  className="rounded-2xl border border-white/10 bg-card/80 p-4 shadow-lg shadow-black/30"
                  aria-label="Quick navigation"
                >
                  <p className="text-xs font-semibold text-muted-foreground">Quick nav</p>
                  <ul className="mt-3 space-y-1 text-sm">
                    {sectionEntries.map((section) => (
                      <li key={section.id}>
                        <button
                          type="button"
                          onClick={() => handleAnchorClick(section.id)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors",
                            activeSection === section.id
                              ? "bg-primary/10 text-primary dark:text-primary/80"
                              : "text-muted-foreground hover:bg-muted",
                          )}
                          aria-current={activeSection === section.id ? "true" : undefined}
                        >
                          {section.label}
                          {activeSection === section.id && (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary transition-opacity" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
              ) : null}

              {problem.relatedProblems.length > 0 ? (
                <div className="rounded-2xl border border-white/10 bg-card/80 p-4 shadow-lg shadow-black/30">
                  <p className="text-xs font-semibold text-muted-foreground">Related</p>
                  <ul className="mt-3 space-y-3 text-sm">
                    {problem.relatedProblems.map((related) => (
                      <li key={related.slug}>
                        <Link
                          href={`/problems/${related.slug}`}
                          className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 transition-colors hover:bg-muted"
                          onClick={() =>
                            trackAnalyticsEvent("navigation.path", {
                              from: `/problems/${problem.slug}`,
                              to: `/problems/${related.slug}`,
                              timeOnFromMs: analytics.getTimeSinceEnterMs(),
                              origin: "related-problem",
                            })
                          }
                        >
                          <div>
                            <p className="font-medium text-foreground">{related.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {related.tags
                                .slice(0, 2)
                                .map((tag) => `#${tag.slug}`)
                                .join(" ")}
                            </p>
                          </div>
                          {related.difficulty ? (
                            <Badge variant="outline" className="text-[11px] font-medium">
                              {formatDifficulty(related.difficulty)}
                            </Badge>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
        <ProblemWorkspace problem={problem} contestContext={contestContext} />
      </div>
      <div className="fixed inset-x-4 bottom-4 z-40 lg:hidden">
        <Button className="w-full shadow-lg shadow-primary/30" size="lg" asChild>
          <a href="#editor" onClick={() => analytics.markSolveClick("mobile-sticky")}>
            Start solving
          </a>
        </Button>
      </div>
    </TooltipProvider>
  );
}

function ProblemSection({
  id,
  title,
  children,
  collapsible,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const analytics = useProblemAnalyticsContext();

  const copyAnchor = useCallback(async () => {
    if (typeof window === "undefined") return;
    const success = await copyToClipboard(
      `${window.location.origin}${window.location.pathname}#${id}`,
    );
    if (success) {
      toast.success("Section link copied");
      trackAnalyticsEvent("problem.copy_action", { field: id }, { problemId: analytics.problemId });
    } else {
      toast.error("Clipboard unavailable");
    }
  }, [analytics.problemId, id]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    analytics.markSectionToggle(id, next ? "expand" : "collapse");
  };

  const heading = (
    <div className="group flex items-center gap-2">
      <h2 className="text-xl font-semibold capitalize tracking-tight">{title}</h2>
      <button
        type="button"
        className="opacity-0 transition-opacity group-hover:opacity-70"
        onClick={copyAnchor}
        aria-label={`Copy link to ${title}`}
      >
        <Link01Icon className="h-4 w-4" strokeWidth={2} />
      </button>
      {collapsible ? (
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="ml-auto text-xs">
            {open ? "Hide" : "Show"}
          </Button>
        </CollapsibleTrigger>
      ) : null}
    </div>
  );

  const content = (
    <div className="prose prose-neutral max-w-none text-base leading-relaxed dark:prose-invert">
      {children}
    </div>
  );

  if (collapsible) {
    return (
      <section id={id} className="scroll-mt-28">
        <Collapsible open={open} onOpenChange={handleOpenChange}>
          <div className="rounded-3xl border border-white/10 bg-card/90 p-6 shadow-lg shadow-black/40">
            {heading}
            <CollapsibleContent className="mt-4 overflow-hidden data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down">
              {content}
            </CollapsibleContent>
          </div>
        </Collapsible>
      </section>
    );
  }

  return (
    <section id={id} className="scroll-mt-28">
      <div className="rounded-3xl border border-white/10 bg-card/90 p-6 shadow-lg shadow-black/40">
        {heading}
        <div className="mt-4">{content}</div>
      </div>
    </section>
  );
}

function Markdown({
  content,
  problemId,
  field,
}: {
  content: string;
  problemId: string;
  field: string;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex, rehypeHighlight]}
      components={
        {
          code({ children, inline }: { children?: ReactNode; inline?: boolean }) {
            const text = String(children).trim();
            if (inline) {
              return (
                <code className="rounded bg-muted px-1.5 py-px text-sm font-medium">
                  {children}
                </code>
              );
            }
            return (
              <pre className="group relative rounded-2xl bg-muted p-4">
                <CopyButton
                  text={text}
                  className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100"
                  onCopy={() =>
                    trackAnalyticsEvent(
                      "problem.copy_action",
                      {
                        field: `${field} code block`,
                      },
                      { problemId },
                    )
                  }
                />
                <code>{text}</code>
              </pre>
            );
          },
        } satisfies Components
      }
    >
      {content}
    </ReactMarkdown>
  );
}

function SampleCard({
  sample,
  index,
  problemId,
}: {
  sample: ProblemDetailPayload["content"]["samples"][number];
  index: number;
  problemId: string;
}) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-card/80 p-4 shadow-sm shadow-black/30">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Example {index + 1}</p>
        {sample.explanation ? <Badge variant="outline">Explanation included</Badge> : null}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <CopyField
          label="Input"
          value={sample.input}
          problemId={problemId}
          field={`Example ${index + 1} Input`}
        />
        <CopyField
          label="Output"
          value={sample.output}
          problemId={problemId}
          field={`Example ${index + 1} Output`}
        />
      </div>
      {sample.explanation ? (
        <p className="mt-3 text-sm text-muted-foreground">{sample.explanation}</p>
      ) : null}
    </div>
  );
}

function CopyField({
  label,
  value,
  problemId,
  field,
  isHidden,
}: {
  label: string;
  value: string;
  problemId: string;
  field: string;
  isHidden?: boolean;
}) {
  if (isHidden) {
    return (
      <div className="rounded-xl border border-white/10 bg-background/30 p-3 text-sm shadow-inner shadow-black/10">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[11px] uppercase tracking-wide">
            Hidden
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          This test case stays hidden until you submit to the judge.
        </p>
      </div>
    );
  }

  return (
    <div className="group rounded-xl border border-white/10 bg-background/80 p-3 text-sm shadow-inner shadow-black/20">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <CopyButton
          text={value}
          size="xs"
          className="opacity-0 transition group-hover:opacity-100"
          onCopy={() => trackAnalyticsEvent("problem.copy_action", { field }, { problemId })}
        />
      </div>
      <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap font-mono text-sm text-foreground">
        {value}
      </pre>
    </div>
  );
}

function CopyButton({
  text,
  className,
  size = "icon",
  onCopy,
  label = "Copy to clipboard",
}: {
  text: string;
  className?: string;
  size?: "icon" | "xs";
  onCopy?: () => void;
  label?: string;
}) {
  const handleCopy = async () => {
    const success = await copyToClipboard(text);
    if (success) {
      toast.success("Copied to clipboard");
      onCopy?.();
    } else {
      toast.error("Clipboard unavailable");
    }
  };
  return (
    <Button
      variant="ghost"
      size={size === "icon" ? "icon" : "sm"}
      className={cn("h-8 w-8 rounded-full", className)}
      onClick={handleCopy}
      aria-label={label}
    >
      <Copy01Icon className="h-4 w-4" strokeWidth={2} />
    </Button>
  );
}

async function shareProblem(problemId: string, slug: string, title: string) {
  if (typeof window === "undefined") return;
  const url = `${window.location.origin}/problems/${slug}`;
  const nav = window.navigator;
  try {
    if (nav?.share) {
      await nav.share({ title, url });
    } else if (nav?.clipboard) {
      await nav.clipboard.writeText(url);
      toast.success("Link copied");
    } else {
      throw new Error("share unsupported");
    }
    trackAnalyticsEvent("problem.share_link", {}, { problemId });
  } catch (error) {
    console.log("PROBLEM READER SHARE ERROR", error);
    toast.error("Unable to share");
  }
}

function reportProblem(problemId: string, slug: string, title: string) {
  if (typeof window === "undefined") return;
  trackAnalyticsEvent("problem.report_issue", {}, { problemId });
  const mailto = `mailto:support@opensolve.dev?subject=${encodeURIComponent(
    `Problem issue: ${title}`,
  )}`;
  window.location.href = mailto;
}

function useReducedMotion() {
  const [prefers, setPrefers] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handle = () => setPrefers(media.matches);
    handle();
    media.addEventListener("change", handle);
    return () => media.removeEventListener("change", handle);
  }, []);
  return prefers;
}

async function copyToClipboard(text: string) {
  if (typeof navigator === "undefined") {
    return false;
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  if (typeof document !== "undefined") {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);
      return successful;
    } catch {
      return false;
    }
  }

  return false;
}
