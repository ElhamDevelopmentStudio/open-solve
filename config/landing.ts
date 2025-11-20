export const landingConfig = {
  hero: {
    badge: "ALPHA v0.1.0",
    headline: {
      line1: "CODE",
      line2: "COMPETE",
      line3: "CONQUER",
    },
    description:
      "Open-source algorithmic practice platform. 2000+ problems. Real-time judge. ICPC-style contests. No BS.",
  },
  stats: [
    { value: "50K+", label: "DEVELOPERS" },
    { value: "1M+", label: "SUBMISSIONS" },
    { value: "99.9%", label: "UPTIME" },
  ],
  features: {
    title: "NOT ANOTHER LEETCODE CLONE",
    subtitle:
      "We're building the platform we wish existed. Open source. Self-hosted. Built by competitive programmers, for competitive programmers. No tracking. No paywalls. No compromises.",
    items: [
      {
        num: "01",
        title: "REAL-TIME JUDGE",
        description:
          "Docker-isolated execution. Stream results as they happen. Support for 10+ languages.",
      },
      {
        num: "02",
        title: "ICPC CONTESTS",
        description: "Live leaderboards. Freeze mechanics. Virtual participation. The real deal.",
      },
      {
        num: "03",
        title: "OPEN SOURCE",
        description: "MIT licensed. Fork it. Deploy it. Own your data. PostgreSQL + Docker.",
      },
      {
        num: "04",
        title: "COMMUNITY",
        description: "Discussions. Solution trails. Editorial content. Learn from the best.",
      },
      {
        num: "05",
        title: "ANALYTICS",
        description: "Track progress. Identify weak spots. Visualize growth. Get better.",
      },
      {
        num: "06",
        title: "NO BULLSHIT",
        description: "No ads. No tracking. No premium tiers. Just pure algorithmic practice.",
      },
    ],
  },
  techStack: {
    title: "BUILT WITH MODERN TECH",
    technologies: [
      "Next.js",
      "TypeScript",
      "PostgreSQL",
      "Prisma",
      "tRPC",
      "Docker",
      "RabbitMQ",
      "Redis",
    ],
    footer:
      "Self-host in 5 minutes. Deploy to AWS, GCP, Azure, or your own hardware. Full control. No vendor lock-in.",
  },
  cta: {
    title: "READY TO LEVEL UP?",
    subtitle: "Join 50,000+ developers grinding on OpenSolve. Free. Open source. Forever.",
    benefits: [
      { label: "NO CREDIT CARD", icon: "✓" },
      { label: "FREE FOREVER", icon: "✓" },
      { label: "MIT LICENSE", icon: "✓" },
    ],
  },
};

export type LandingConfig = typeof landingConfig;
