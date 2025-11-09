"use client";

import "katex/dist/katex.min.css";

import { ProblemStatusBadge } from "@/components/problems/problem-status-badge";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { TooltipProvider } from "@/components/ui/tooltip";
import { trackEvent } from "@/lib/telemetry/client";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/constants";
import { getDefaultCodeStub } from "@/lib/problems/editor-presets";
import { ProblemDetailPayload } from "@/lib/trpc/router/problems";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight, Bookmark, Copy, Flag, Link2, Share2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { toast } from "sonner";
import { CodeEditor } from "@/components/code/code-editor";

const sectionsOrder = [
  { id: "statement", label: "Statement" },
  { id: "constraints", label: "Constraints" },
  { id: "examples", label: "Examples" },
  { id: "notes", label: "Notes" },
  { id: "samples", label: "Samples" },
] as const;

const formatDifficulty = (value?: string | null) =>
  value ? value.charAt(0) + value.slice(1).toLowerCase() : "Unrated";

const SUPPORTED_LANGUAGE_SET = new Set<SupportedLanguage>(SUPPORTED_LANGUAGES);
const isWorkspaceLanguage = (code: string): code is SupportedLanguage =>
  SUPPORTED_LANGUAGE_SET.has(code as SupportedLanguage);

export function ProblemReader({ problem }: { problem: ProblemDetailPayload }) {
  const prefersReducedMotion = useReducedMotion();
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
  const [readingProgress, setReadingProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollMilestones = useRef(new Set<number>());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
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
  }, [sectionEntries]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleScroll = () => {
      if (!contentRef.current) return;
      const element = contentRef.current;
      const elementTop = element.offsetTop;
      const elementHeight = element.offsetHeight;
      const viewportHeight = window.innerHeight;
      const scrollY = window.scrollY;
      const progress =
        ((scrollY + viewportHeight - elementTop) / Math.max(elementHeight, viewportHeight)) * 100;
      const clamped = Math.min(100, Math.max(0, progress));
      setReadingProgress(clamped);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    [25, 50, 75, 100].forEach((threshold) => {
      if (readingProgress >= threshold && !scrollMilestones.current.has(threshold)) {
        scrollMilestones.current.add(threshold);
        trackEvent("problemDetail.scrollDepth", {
          slug: problem.slug,
          value: threshold,
        });
      }
    });
  }, [problem.slug, readingProgress]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof performance === "undefined") return;
    const navEntries = performance.getEntriesByType("navigation") as
      | PerformanceNavigationTiming[]
      | undefined;
    const nav = navEntries?.[0];
    if (nav) {
      const ttfb = nav.responseStart - nav.requestStart;
      const domReady = nav.domContentLoadedEventEnd - nav.startTime;
      trackEvent("problemDetail.performance", {
        slug: problem.slug,
        ttfb: Number.isFinite(ttfb) ? Number(ttfb.toFixed(2)) : undefined,
        domReady: Number.isFinite(domReady) ? Number(domReady.toFixed(2)) : undefined,
      });
    }

    let observer: PerformanceObserver | null = null;
    if (typeof PerformanceObserver !== "undefined") {
      observer = new PerformanceObserver((entryList) => {
        const entry = entryList.getEntries().at(-1);
        if (!entry) return;
        trackEvent("problemDetail.performance", {
          slug: problem.slug,
          lcp: Number(entry.startTime.toFixed(2)),
        });
        observer?.disconnect();
      });
      try {
        observer.observe({ type: "largest-contentful-paint", buffered: true });
      } catch {
        observer?.disconnect();
      }
    }

    return () => observer?.disconnect();
  }, [problem.slug]);

  const handleAnchorClick = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    trackEvent("problemDetail.anchor", { slug: problem.slug, target: id });
    element.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
  };

  const acceptancePercent = problem.stats?.acceptanceRate
    ? Math.round(problem.stats.acceptanceRate * 100)
    : null;

  const progressValue =
    problem.status === "SOLVED" ? 100 : problem.status === "ATTEMPTED" ? 55 : 20;

  const lastSubmissionLabel = problem.lastSubmissionAt
    ? formatDistanceToNow(new Date(problem.lastSubmissionAt), { addSuffix: true })
    : null;

  return (
    <TooltipProvider>
      <a href="#problem-reader-content" className="skip-link sr-only focus:not-sr-only">
        Skip to statement
      </a>
      <div className="pointer-events-none fixed inset-x-0 top-16 z-30 hidden h-1.5 bg-transparent lg:block">
        <div
          className="h-full rounded-r-full bg-linear-to-r from-primary/80 to-emerald-400/70 transition-[width] duration-300"
          style={{
            width: `${readingProgress}%`,
            transitionDuration: prefersReducedMotion ? "0ms" : undefined,
          }}
        />
      </div>
      <div ref={contentRef} id="problem-reader-content" className="space-y-10">
        <div className="rounded-4xl border border-white/10 bg-linear-to-b from-primary/10 via-card/90 to-card/90 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
          <Breadcrumb>
            <BreadcrumbList className="text-sm text-muted-foreground motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/problems">Problems</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
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
        <header className="rounded-4xl border border-white/10 bg-card/90 p-6 shadow-[0_30px_100px_rgba(5,5,5,0.65)] backdrop-blur">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="text-sm">
              {formatDifficulty(problem.difficulty)}
            </Badge>
            <ProblemStatusBadge status={problem.status} />
            {lastSubmissionLabel ? (
              <span className="text-xs text-muted-foreground">
                Last attempt {lastSubmissionLabel}
              </span>
            ) : null}
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
            <div className="flex gap-2">
              <Button variant="outline" size="icon">
                <Bookmark className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => shareProblem(problem.slug, problem.title)}
                aria-label="Share problem"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => reportProblem(problem.slug, problem.title)}
                aria-label="Report issue"
              >
                <Flag className="h-4 w-4" />
              </Button>
            </div>
            <Button className="flex items-center gap-2" asChild>
              <a
                href="#editor"
                onClick={() =>
                  trackEvent("problemDetail.startSolving", { slug: problem.slug, source: "header" })
                }
              >
                Start solving
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
          <div className="mt-6 grid gap-4 rounded-2xl border border-white/5 bg-background/40 p-4 md:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Progress</p>
              <div className="mt-2 flex items-center gap-3">
                <Progress value={progressValue} className="h-2" />
                <span className="text-sm font-medium text-muted-foreground">{progressValue}%</span>
              </div>
            </div>
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
                  slug={problem.slug}
                  field="Statement"
                />
              </ProblemSection>
            ) : null}

            {problem.content.constraints ? (
              <ProblemSection id="constraints" title="Constraints">
                <Markdown
                  content={problem.content.constraints}
                  slug={problem.slug}
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
                      slug={problem.slug}
                    />
                  ))}
                </div>
              </ProblemSection>
            ) : null}

            {problem.content.hints ? (
              <ProblemSection id="notes" title="Notes & Hints">
                <Markdown content={problem.content.hints} slug={problem.slug} field="Notes" />
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
                          slug={problem.slug}
                          field={`Sample ${test.ordinal} Input`}
                          isHidden={test.kind === "HIDDEN"}
                        />
                        <CopyField
                          label="Output"
                          value={test.output}
                          slug={problem.slug}
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
                            trackEvent("problemDetail.relatedClick", {
                              slug: problem.slug,
                              target: related.slug,
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
        <ProblemWorkspace problem={problem} />
      </div>
      <div className="fixed inset-x-4 bottom-4 z-40 lg:hidden">
        <Button className="w-full shadow-lg shadow-primary/30" size="lg" asChild>
          <a
            href="#editor"
            onClick={() =>
              trackEvent("problemDetail.startSolving", {
                slug: problem.slug,
                source: "mobile-sticky",
              })
            }
          >
            Start solving
          </a>
        </Button>
      </div>
    </TooltipProvider>
  );
}

function ProblemWorkspace({ problem }: { problem: ProblemDetailPayload }) {
  const languageOptions = useMemo(() => {
    if (problem.languages.length > 0) {
      return problem.languages.filter((language) => isWorkspaceLanguage(language.code));
    }
    return SUPPORTED_LANGUAGES.map((code) => ({
      code,
      displayName: code.toUpperCase(),
      codeStub: getDefaultCodeStub(code),
      fileExtension: null,
    }));
  }, [problem.id]);

  const defaultLanguage = useMemo(
    () => languageOptions[0]?.code as SupportedLanguage | undefined,
    [languageOptions],
  );
  const defaultMap = useMemo(
    () =>
      languageOptions.reduce<Record<string, string>>((acc, language) => {
        if (!isWorkspaceLanguage(language.code)) {
          return acc;
        }
        acc[language.code] = language.codeStub ?? getDefaultCodeStub(language.code);
        return acc;
      }, {}),
    [languageOptions, problem.id],
  );

  const [activeLanguage, setActiveLanguage] = useState<SupportedLanguage | null>(
    defaultLanguage ?? null,
  );
  const [codeByLanguage, setCodeByLanguage] = useState<Record<string, string>>(defaultMap);

  useEffect(() => {
    setCodeByLanguage(defaultMap);
    setActiveLanguage(defaultLanguage ?? null);
  }, [defaultLanguage, defaultMap]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(`opensolve:workspace:${problem.id}`);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, string>;
        setCodeByLanguage((state) => ({ ...state, ...parsed }));
      }
    } catch {
      // ignore
    }
  }, [problem.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(`opensolve:workspace:${problem.id}`, JSON.stringify(codeByLanguage));
    } catch {
      // ignore write errors
    }
  }, [codeByLanguage, problem.id]);

  if (!activeLanguage) {
    return (
      <section
        id="editor"
        className="rounded-3xl border border-dashed border-primary/30 bg-card/80 p-6 text-sm text-muted-foreground"
      >
        <h2 className="text-xl font-semibold">Workspace</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No languages are available yet. Check back once this problem has runtime support.
        </p>
      </section>
    );
  }

  const activeCode = codeByLanguage[activeLanguage] ?? defaultMap[activeLanguage] ?? "";
  const activeLanguageMeta = languageOptions.find((lang) => lang.code === activeLanguage);

  const handleReset = () => {
    setCodeByLanguage((state) => ({
      ...state,
      [activeLanguage]: defaultMap[activeLanguage] ?? getDefaultCodeStub(activeLanguage),
    }));
    toast.success("Stub restored");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeCode);
      toast.success("Copied code to clipboard");
    } catch {
      toast.error("Unable to copy");
    }
  };

  return (
    <section
      id="editor"
      className="rounded-3xl border border-dashed border-primary/30 bg-card/80 p-6 text-sm text-muted-foreground"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Workspace</h2>
          <p className="text-sm text-muted-foreground">
            Pick a language, tweak the stub, and code right in your browser. Drafts auto-save per
            language on this device.
          </p>
        </div>
        <Select
          value={activeLanguage ?? undefined}
          onValueChange={(value) => setActiveLanguage(value as SupportedLanguage)}
        >
          <SelectTrigger className="w-full md:w-56">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            {languageOptions.map((language) => (
              <SelectItem key={language.code} value={language.code}>
                {language.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mt-6 space-y-3 rounded-2xl border border-white/5 bg-background/60 p-4">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
          <span>{activeLanguageMeta?.displayName ?? activeLanguage}</span>
          {activeLanguageMeta?.fileExtension ? (
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px]">
              .{activeLanguageMeta.fileExtension}
            </span>
          ) : null}
        </div>
        <CodeEditor
          value={activeCode}
          language={activeLanguage}
          minHeight={400}
          onChange={(value) =>
            setCodeByLanguage((state) => ({
              ...state,
              [activeLanguage]: value,
            }))
          }
          ariaLabel="Problem workspace editor"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Autosaved locally · {activeLanguageMeta?.displayName ?? activeLanguage}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset stub
            </Button>
            <Button type="button" size="sm" onClick={handleCopy}>
              <Copy className="mr-2 h-4 w-4" />
              Copy code
            </Button>
          </div>
        </div>
      </div>
    </section>
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

  const copyAnchor = useCallback(() => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#${id}`);
    toast.success("Section link copied");
  }, [id]);

  const heading = (
    <div className="group flex items-center gap-2">
      <h2 className="text-xl font-semibold capitalize tracking-tight">{title}</h2>
      <button
        type="button"
        className="opacity-0 transition-opacity group-hover:opacity-70"
        onClick={copyAnchor}
        aria-label={`Copy link to ${title}`}
      >
        <Link2 className="h-4 w-4" />
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
        <Collapsible open={open} onOpenChange={setOpen}>
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

function Markdown({ content, slug, field }: { content: string; slug: string; field: string }) {
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
                    trackEvent("problemDetail.copy", {
                      slug,
                      field: `${field} code block`,
                    })
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
  slug,
}: {
  sample: ProblemDetailPayload["content"]["samples"][number];
  index: number;
  slug: string;
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
          slug={slug}
          field={`Example ${index + 1} Input`}
        />
        <CopyField
          label="Output"
          value={sample.output}
          slug={slug}
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
  slug,
  field,
  isHidden,
}: {
  label: string;
  value: string;
  slug: string;
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
          onCopy={() => trackEvent("problemDetail.copy", { slug, field })}
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
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
    onCopy?.();
  };
  return (
    <Button
      variant="ghost"
      size={size === "icon" ? "icon" : "sm"}
      className={cn("h-8 w-8 rounded-full", className)}
      onClick={handleCopy}
      aria-label={label}
    >
      <Copy className="h-4 w-4" />
    </Button>
  );
}

async function shareProblem(slug: string, title: string) {
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
    trackEvent("problemDetail.share", { slug });
  } catch (error) {
    console.log("PROBLEM READER SHARE ERROR", error);
    toast.error("Unable to share");
  }
}

function reportProblem(slug: string, title: string) {
  if (typeof window === "undefined") return;
  trackEvent("problemDetail.report", { slug });
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
