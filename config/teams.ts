export const teamsConfig = {
  hero: {
    marker: "[01] TEAM OPS",
    badge: "BETA · PRIVATE ROOMS",
    headline: {
      line1: "ASSEMBLE",
      line2: "YOUR",
      line3: "SQUAD",
    },
    description:
      "Create private pods for ICPC rosters, interview loops, or classroom drills. Shared lists, analytics, and role-based permissions live here.",
    primaryCta: { label: "Create team", href: "/teams/new" },
    secondaryCta: { label: "Request access", href: "/support" },
    highlights: [
      { label: "Max teams per user", value: "3" },
      { label: "Members per team", value: "50" },
      { label: "Shared lists", value: "Unlimited" },
    ],
  },
  sections: {
    roadmap: {
      marker: "[02]",
      title: "Incoming capabilities",
      items: [
        {
          label: "Shared drill queues",
          description: "Curate problem lists and assign due dates across squads.",
        },
        {
          label: "Live analytics",
          description: "Track aggregate accuracy, runtime, and freeze behaviour.",
        },
        {
          label: "Admin controls",
          description: "Role-based permissions, contest invitations, and API hooks.",
        },
      ],
    },
    actions: {
      marker: "[03]",
      title: "Get started",
      description: "Teams are rolling out gradually. Claim a namespace today.",
      steps: [
        { label: "Request invite", helper: "Ping #ops or file a support ticket." },
        { label: "Provision roster", helper: "Upload roster CSV or invite handles manually." },
        { label: "Ship drills", helper: "Share curated tracks and monitor responses." },
      ],
    },
  },
};

export type TeamsConfig = typeof teamsConfig;
