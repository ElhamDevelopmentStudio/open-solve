import type { ComponentType, SVGProps } from "react";
import {
  CodeSquareIcon,
  Megaphone01Icon,
  SparklesIcon,
  Target01Icon,
  Telescope01Icon,
} from "hugeicons-react";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export const dashboardConfig = {
  hero: {
    marker: "[01] CONTROL ROOM",
    badge: "SYSTEM STATUS · NOMINAL",
    headline: {
      line1: "OPERATE",
      line2: "ADAPT",
      line3: "ITERATE",
    },
    description:
      "Centralized telemetry for your OpenSolve journey. Monitor submissions, contests, and proposals without leaving this cockpit.",
    highlights: {
      solved: "Problems solved",
      acceptance: "Acceptance rate",
      contest: "Next contest",
      contestFallback: "Watch contest radar",
    },
    ctas: {
      primary: {
        label: "Launch workspace",
        href: "/workspace/problems",
      },
      secondary: {
        label: "Review submissions",
        href: "/submissions",
      },
    },
    attemptsLabel: "Attempts logged",
    acceptanceLabel: "Acceptance",
    summaryLabel: "Last submission",
    summaryHelper: "Solve anything today to keep the streak alive.",
    historyFallback: "No history yet",
  },
  quickActions: [
    {
      label: "Browse problemset",
      description: "Filter by tags, companies, or editorial access.",
      href: "/problems",
      icon: CodeSquareIcon satisfies IconComponent,
    },
    {
      label: "Review submissions",
      description: "Inspect verdicts, runtime, and memory profiles.",
      href: "/submissions",
      icon: SparklesIcon satisfies IconComponent,
    },
    {
      label: "Track proposals",
      description: "Stay on top of prescreen, review, and acceptance.",
      href: "/proposals",
      icon: Megaphone01Icon satisfies IconComponent,
    },
  ],
  metrics: {
    section: {
      marker: "[02]",
      title: "Signal metrics",
      description: "High-frequency stats across submissions and manual reviews.",
    },
    solved: {
      label: "Solved problems",
      metaSuffix: "accepted records",
    },
    acceptance: {
      label: "Acceptance rate",
      metaSuffix: "total attempts",
    },
    manual: {
      label: "Manual reviews",
      idle: "All clear",
      pending: "Awaiting staff action",
    },
    performance: {
      label: "Performance record",
      runtimeLabel: "Runtime",
      memoryLabel: "Memory",
      fallback: "No benchmark recorded",
    },
  },
  sections: {
    telemetry: {
      marker: "[03]",
      title: "Submission telemetry",
      description: "Normalized accept vs fail signals across unique code paths.",
      chart: {
        title: "Outcome trend",
        description: "Deduped by problem + code hash to avoid inflated attempts.",
        empty: {
          title: "Not enough data",
          description: "Ship at least one solution to start tracking trendlines.",
        },
        acceptedLabel: "Accepted",
        failedLabel: "Failed",
      },
    },
    activity: {
      marker: "[04]",
      title: "Recent transmissions",
      description: "Live stream of submissions plus proposal pipeline health.",
      table: {
        title: "Submission stream",
        description: "Latest runs across practice and contests.",
        actionLabel: "Open submissions",
        actionHref: "/submissions",
      },
      proposals: {
        title: "Proposal pipeline",
        description: "Drafts, reviews, and accepted ideas you own.",
        ctaLabel: "Author new proposal",
        statusLabel: "LIVE",
        intendedDifficultyLabel: "Intended difficulty",
        stats: [
          { key: "submitted", label: "Submitted" },
          { key: "review", label: "In review" },
          { key: "accepted", label: "Accepted" },
        ] as const,
      },
    },
    contests: {
      marker: "[05]",
      title: "Contest radar",
      description: "Featured windows, registrations, and rating impact.",
      featuredLabel: "Featured contest",
      upcomingLabel: "Upcoming queue",
      stats: {
        starts: "Starts",
        problems: "Problems",
        registrations: "Registrations",
      },
      badges: {
        type: "format",
        state: "state",
        rated: "rated",
      },
      registrationMeta: {
        registered: "registered",
        notRegistered: "not registered",
      },
      ctas: {
        open: "Open contest",
        hub: "Contest hub",
      },
      upcomingMeta: {
        teams: "teams",
      },
    },
    backlog: {
      marker: "[06]",
      title: "Focus backlog",
      description: "Bookmark these problems for this week’s drills.",
      acceptanceLabel: "Acceptance",
      unknownDifficulty: "unknown",
    },
  },
  emptyStates: {
    submissions: {
      title: "No submissions yet",
      description: "Ship any solution to populate this stream.",
      actionLabel: "Browse problems",
      actionHref: "/problems",
    },
    proposals: {
      title: "No proposals filed",
      description: "Author a new prompt and route it for review.",
      actionLabel: "Create proposal",
      actionHref: "/proposals/new",
    },
    contests: {
      title: "No contests detected",
      description: "Contest radar updates as soon as a window opens.",
      actionLabel: "Explore contests",
      actionHref: "/contests",
    },
    backlog: {
      title: "No recommendations",
      description: "We couldn’t fetch suggested problems right now.",
      actionLabel: "Open problem archive",
      actionHref: "/problems",
    },
  },
  icons: {
    hero: Target01Icon satisfies IconComponent,
    radar: Telescope01Icon satisfies IconComponent,
  },
};

export type DashboardConfig = typeof dashboardConfig;
