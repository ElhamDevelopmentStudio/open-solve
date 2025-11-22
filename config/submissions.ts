import type { ComponentType, SVGProps } from "react";
import {
  AlertSquareIcon,
  ArrowRight01Icon,
  CodeSquareIcon,
  RotateRight01Icon,
  ScrollIcon,
} from "hugeicons-react";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export const submissionsConfig = {
  listing: {
    hero: {
      marker: "[01] RUN LOG",
      badge: "STREAM ALL VERDICTS",
      headline: {
        line1: "TRACE",
        line2: "EVERY",
        line3: "EXECUTION",
      },
      description:
        "Slice and dice your entire submission history with brutalist precision. Filters, verdicts, and contest splits update in real time without losing context.",
      primaryCta: { label: "Launch workspace", href: "/workspace/problems" },
      secondaryCta: { label: "Reset filters", icon: RotateRight01Icon satisfies IconComponent },
    },
    stats: [
      { key: "total", label: "Attempts logged" },
      { key: "accepted", label: "Accepted runs" },
      { key: "solved", label: "Problems solved" },
      { key: "manual", label: "Manual reviews" },
    ] as const,
    filters: {
      marker: "[02]",
      title: "Adaptive filters",
      description:
        "Target a specific problem, verdict, or time window. Every control is keyboard-friendly.",
      problemLabel: "Problem selector",
      verdictLabel: "Verdicts",
      statusLabel: "Lifecycle",
      languageLabel: "Languages",
      rangeLabel: "Date range",
      contestLabel: "Contest state",
      sortLabel: "Sort by",
      lockedProblemLabel: "Problem",
    },
    list: {
      marker: "[03]",
      title: "Submission stream",
      description:
        "Infinite feed ordered by your selected sort preference. Hover for fast actions.",
      empty: {
        title: "No submissions yet",
        description:
          "Run a solution to any problem—practice or contest—and the history will populate here instantly.",
        actionLabel: "Open problemset",
      },
      loadingLabel: "Loading more submissions…",
      backToTop: "Back to top",
      contestBadge: "Contest",
      firstAcLabel: "First AC",
      latencyLabel: "Runtime",
      memoryLabel: "Memory",
      openLabel: "Open submission",
      problemLabel: "View problem",
    },
  },
  detail: {
    marker: "[01] SUBMISSION DETAIL",
    backLabel: "Back to submissions",
    headerMeta: {
      language: "Language",
      createdAt: "Submitted",
      linkLabel: "Open problem",
    },
    actions: {
      resubmit: "Resubmit code",
      shareEnable: "Enable share",
      shareDisable: "Disable share",
      hide: "Hide on profile",
      show: "Show on profile",
    },
    share: {
      marker: "[02]",
      title: "Share link",
      description:
        "Enable to publish a read-only snapshot of this submission. Links deactivate immediately when turned off.",
      copyLabel: "Copy link",
      disabledHint: "Sharing disabled",
    },
    timeline: {
      marker: "[03]",
      title: "Judge timeline",
    },
    cases: {
      marker: "[04]",
      title: "Test cases",
    },
    code: {
      marker: "[05]",
      title: "Source code",
    },
    console: {
      marker: "[06]",
      title: "Judge console",
      emptyLabel: "No output captured",
    },
  },
  problem: {
    marker: "[01]",
    titlePrefix: "Problem submissions",
    description:
      "Everything you have ever run for this problem. Filters are locked to keep the focus on this prompt.",
  },
  icons: {
    hero: CodeSquareIcon satisfies IconComponent,
    empty: AlertSquareIcon satisfies IconComponent,
    list: ScrollIcon satisfies IconComponent,
    primaryCta: ArrowRight01Icon satisfies IconComponent,
  },
};

export type SubmissionsConfig = typeof submissionsConfig;
