export const leaderboardsConfig = {
  global: {
    badge: "RANKINGS",
    headline: {
      line1: "LEADERBOARDS",
      line2: "& RANKINGS",
    },
    description:
      "Discover the most consistent problem solvers across weekly, monthly, and all-time windows. Rankings update in real-time based on solve count, difficulty weighting, and time penalties.",
    overview: {
      title: "Top performers",
      subtitle: "Current ranking snapshots",
      emptyState: "No data yet",
    },
    callouts: {
      difficulty: {
        title: "Difficulty capsules",
        description: "Compare how solvers perform on easy, medium, and hard sets independently.",
        levels: ["easy", "medium", "hard"],
      },
      tags: {
        title: "Tag spotlights",
        description: "Track mastery for specific topics like DP, graphs, and arrays.",
        featured: ["graphs", "dp", "arrays"],
      },
    },
  },
  section: {
    badge: "LIVE RANKINGS",
    meta: {
      updated: "Updated",
      competitors: "competitors",
      recent: "recently",
    },
    windows: [
      { value: "all_time", label: "All time" },
      { value: "monthly", label: "Monthly" },
      { value: "weekly", label: "Weekly" },
    ],
    hero: {
      rank: "Rank",
      score: "Score",
      solved: "Solved",
      periodLabel: "Period",
    },
    viewer: {
      prefix: "You're currently ranked",
      with: "with",
      points: "points",
    },
    table: {
      headers: {
        rank: "Rank",
        competitor: "Competitor",
        score: "Score",
        solved: "Solved",
        attempts: "Attempts",
        penalty: "Penalty",
        runtime: "Runtime",
      },
      empty: "Leaderboard entries will appear once submissions are available",
      loading: "Loading leaderboard...",
    },
    actions: {
      loadMore: "Load more",
      loadingMore: "Loading more...",
      viewFull: "View full board",
    },
  },
  difficulty: {
    title: "leaderboard",
    subtitle: "Focused look at",
    practice: "practice",
  },
  tag: {
    subtitle: "Topic-specific rankings",
  },
};

export type LeaderboardsConfig = typeof leaderboardsConfig;
