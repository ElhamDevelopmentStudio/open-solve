export const workspaceConfig = {
  library: {
    hero: {
      marker: "[01] WORKSPACE LIBRARY",
      badge: "PRIVATE VIEW",
      headline: {
        line1: "CURATE",
        line2: "YOUR",
        line3: "DRILLS",
      },
      description:
        "Search across the full problemset, pin favorites, and jump straight into the workspace. Filters sync with your progress data.",
      primaryCta: { label: "Focus mode", href: "/workspace/problems?sort=difficulty" },
      secondaryCta: { label: "Reset filters", href: "/workspace/problems" },
    },
    stats: [
      { label: "Active filters", key: "filters" },
      { label: "Sort order", key: "sort" },
      { label: "Viewer", key: "viewer" },
    ] as const,
    filters: {
      marker: "[02]",
      title: "Adaptive filters",
      description: "Narrow by difficulty, status, editorial availability, or custom tags.",
    },
  },
  detail: {
    hero: {
      marker: "[01] PROBLEM WORKSPACE",
      description:
        "Solve directly inside the brutalist workspace. Progress, analytics, and editor state auto-save to this view.",
      primaryCta: { label: "Start coding", anchor: "#editor" },
      secondaryCta: { label: "Discuss problem", href: "/discuss" },
    },
    stats: {
      difficulty: "Difficulty",
      acceptance: "Acceptance",
      submissions: "Total runs",
      version: "Version",
    },
    meta: {
      tagsLabel: "Tags",
      lastSubmission: "Last submission",
    },
    related: {
      title: "Related problems",
      empty: "No related problems published yet.",
    },
  },
};

export type WorkspaceConfig = typeof workspaceConfig;
