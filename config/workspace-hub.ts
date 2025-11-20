import { siteConfig } from "./site";

export const workspaceHubConfig = {
  editorials: {
    marker: "[01] EDITORIAL OPS",
    badge: "CURATION VIEW",
    headline: {
      line1: "SHIP",
      line2: "OFFICIAL",
      line3: "WRITE-UPS",
    },
    description:
      "Audit which problems have in-house explanations, surface the freshest drops, and route solvers to the right breakdowns without leaving the workspace.",
    actions: {
      primary: { label: "Open problem library", href: "/workspace/problems" },
      secondary: { label: "Editorial policy", href: siteConfig.links.docs },
    },
    stats: {
      published: "Published editorials",
      coverage: "Accepted runs tracked",
      freshness: "Latest refresh",
      empty: "No updates yet",
    },
    backlog: {
      marker: "[02]",
      title: "Editorial backlog",
      description: "Staff-authored explanations, sorted by most recently updated problem versions.",
      emptyTitle: "No editorials published",
      emptyDescription: "Curators can publish solutions from any staff problem editor.",
      acceptanceLabel: "Accepted",
      status: "Editorial ready",
      footnote: "Editorials unlock automatically after contests or when a solver reaches AC.",
    },
  },
  trails: {
    marker: "[01] TRAIL OPS",
    badge: "INSIGHT GRAPH",
    headline: {
      line1: "MAP",
      line2: "THINKING",
      line3: "PATHS",
    },
    description:
      "Review crowdsourced insight graphs that show how solvers navigated to AC. Identify which problems are teaching the best mental models.",
    actions: {
      primary: { label: "Browse problems", href: "/workspace/problems" },
      secondary: { label: "Trail playbook", href: siteConfig.links.docs },
    },
    stats: {
      problems: "Problems with trails",
      insights: "Insights published",
      freshness: "Latest refresh",
      empty: "No updates yet",
    },
    featured: {
      marker: "[02]",
      title: "Featured graphs",
      description: "Problems with active insight trails and community annotations.",
      emptyTitle: "No trails yet",
      emptyDescription: "Publish an insight from any problem workspace to seed the graph.",
      insightsLabel: "Insights shared",
      footnote: "Trails stack solver breadcrumbs into a graph of approaches and pivots.",
    },
  },
  discuss: {
    marker: "[01] DISCUSSION OPS",
    badge: "LIVE THREADS",
    headline: {
      line1: "WORKSPACE",
      line2: "DISCUSSIONS",
    },
    description:
      "Coordinate editorial feedback, meta proposals, and help threads without leaving creator mode. Filters stay aligned with problem metadata.",
    actions: {
      primary: { label: "New thread", href: "/discuss" },
      secondary: { label: "View guidelines", href: siteConfig.links.docs },
    },
    stats: {
      tags: "Tag filters",
      difficulty: "Difficulty bands",
      defaultTab: "Default tab",
    },
    tabsTitle: "Discussion rails",
  },
  leaderboards: {
    marker: "[01] RANK OPS",
    badge: "LIVE SNAPSHOTS",
    headline: {
      line1: "CURATE",
      line2: "COMPETITIVE",
      line3: "INTEL",
    },
    description:
      "Keep an operator view of who is climbing, which tags are heating up, and how windows shift weekly. Everything is mirrored from the public boards with workspace tooling.",
    actions: {
      primary: { label: "View global board", href: "/leaderboards/global" },
      secondary: { label: "Tag spotlights", href: "/leaderboards/tag/graphs" },
    },
    stats: {
      windows: "Windows tracked",
      podiums: "Podium entries",
      defaultWindow: "Default window",
    },
    overview: {
      title: "Window snapshots",
      description: "Pulse on top performers across all-time, monthly, and weekly cuts.",
      empty: "No leaderboard entries yet.",
    },
    callouts: {
      difficulty: {
        title: "Difficulty capsules",
        levels: ["easy", "medium", "hard"],
      },
      tags: {
        title: "Tag fast lanes",
        featured: ["graphs", "dp", "arrays"],
      },
    },
  },
};

export type WorkspaceHubConfig = typeof workspaceHubConfig;
