const privacyToggles = [
  {
    name: "shareAcceptedCode",
    label: "Share accepted code",
    description: "Allow other solvers (and staff) to view accepted submissions once verdicts land.",
  },
  {
    name: "showOnLeaderboard",
    label: "Appear on leaderboards",
    description:
      "Rankings, streak streaks, and contest stats become visible across difficulty views.",
  },
  {
    name: "showCountry",
    label: "Show country",
    description: "Expose your country flag + timezone on public profile cards.",
  },
  {
    name: "showSocials",
    label: "Show social links",
    description: "Display GitHub, LinkedIn, Twitter, and personal site links to collaborators.",
  },
] as const satisfies Array<{
  name: "shareAcceptedCode" | "showOnLeaderboard" | "showCountry" | "showSocials";
  label: string;
  description: string;
}>;

export type ProfileToggleName = (typeof privacyToggles)[number]["name"];

export const profileConfig = {
  hero: {
    marker: "[01] SOLVER PROFILE",
    metricsMarker: "[01A] PRACTICE SIGNALS",
    fallbackName: "Anonymous solver",
    locationHidden: "location hidden",
    timezoneHidden: "timezone private",
    socialsLabel: "SOCIAL LINKS",
    leaderboardOptOut: "Leaderboards opt-out",
    actions: {
      leaderboards: "View leaderboards",
      editProfile: "Edit profile",
    },
  },
  stats: {
    marker: "[02] PERFORMANCE GRID",
    description: "Telemetry spanning solved counts, streaks, and acceptance ratios.",
    cards: {
      totalSolved: "TOTAL SOLVED",
      attempted: "ATTEMPTED",
      acceptance: "ACCEPTANCE RATE",
      streak: "CURRENT STREAK",
    },
  },
  charts: {
    marker: "[03] PATTERN MAP",
    difficulty: {
      title: "Solved by difficulty",
    },
    tags: {
      title: "Top tags",
      empty: "Tags appear once public solves exist.",
    },
  },
  activity: {
    marker: "[04] ACTIVITY FIELD",
    streakTitle: "Streak calendar",
    hourlyTitle: "Time-of-day focus",
    rangeLabel: (days: number) => `Past ${days} days`,
  },
  solves: {
    marker: "[05] RECENT ACCEPTS",
    title: "Recent accepted submissions",
    description: "Realtime snapshots of the last successful runs.",
    empty: "This solver has no accepted submissions yet.",
    action: "View submissions",
  },
  badges: {
    marker: "[06] BADGE BOARD",
    empty: "No badges earned yet.",
  },
  staff: {
    marker: "[07] STAFF SIGNALS",
    description: "Visible to staff and moderators only.",
    fields: {
      rapidSolveSpike: "Rapid solve spike detected",
      manualReviewCount: "Manual reviews pending",
      shadowBanned: "Account status",
    },
  },
  privacy: {
    marker: "[08] PRIVACY PANEL",
    description: "Control which telemetry stays private.",
    action: "Save preferences",
    toggles: privacyToggles,
  },
} as const;
