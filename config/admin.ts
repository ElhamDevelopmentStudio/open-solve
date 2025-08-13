export const adminConfig = {
  overview: {
    marker: "[01] ADMIN OPS",
    badge: "CONTROL PLANE",
    headline: {
      line1: "SYSTEM",
      line2: "OBSERVABILITY",
      line3: "GRID",
    },
    description:
      "Realtime telemetry for users, submissions, judge queues, feature flags, and operational incidents. Updated every 30 seconds.",
    stats: {
      users: "Total users",
      submissions: "Submissions (24h)",
      problems: "Problems",
      features: "Feature flags",
    },
    sections: {
      telemetry: {
        title: "Realtime telemetry",
        description: "Platform vitals plus live auto-refresh.",
        refresh: "Refresh",
      },
      queues: {
        title: "Judge queues",
        queued: "Queued",
        running: "Running",
        manual: "Manual review",
      },
      system: {
        title: "System health",
        healthy: "Healthy",
        degraded: "Degraded",
      },
      incidents: {
        title: "Open incidents",
        empty: "No open incidents.",
      },
      audit: {
        title: "Recent audit events",
      },
    },
  },
  analytics: {
    marker: "[02] EXPERIENCE OPS",
    badge: "TELEMETRY",
    headline: {
      line1: "USER",
      line2: "INTERACTION",
      line3: "ANALYTICS",
    },
    description:
      "Funnels, intent, hints, and bounce behavior sampled from the last window. Auto-refresh keeps leadership dashboards in sync.",
    cards: {
      views: "Problem views",
      intent: "Solve intent",
      hints: "Hint usage",
      bounce: "Bounce rate",
      live: "Live refresh",
    },
    devices: {
      title: "Device mix",
      description: "Sessions per device type",
      empty: "No device data yet.",
    },
    quality: {
      title: "Quality signals",
      description: "Realtime error and stuck signals",
      tti: "Average time to interact",
      client: "Client errors",
      network: "Network failures",
      collecting: "collecting",
      healthy: "healthy",
    },
    table: {
      title: "Top problem insights",
      description: "Pages with highest view volume in this window",
      tracked: "tracked",
    },
  },
  contests: {
    marker: "[03] CONTEST OPS",
    badge: "STATE CONTROL",
    headline: {
      line1: "CONTEST",
      line2: "ORCHESTRATION",
      line3: "PANEL",
    },
    description:
      "Operate contest states, visibility, and judge actions from a single brutalist panel. Filters keep the snapshot focused.",
    filter: "Contest state",
    summary: {
      starts: "Starts",
      ends: "Ends",
      problems: "Problems",
      registrations: "Registrations",
    },
    actions: {
      start: "Start now",
      end: "End now",
      freeze: "Freeze",
      unfreeze: "Unfreeze",
      visibility: "Visibility",
      toggleVisibility: "Toggle visibility",
      rejudge: "Rejudge",
      stateLabel: "All states",
      empty: "No contests match current filters.",
    },
  },
  discussions: {
    marker: "[04] DISCUSSION OPS",
    badge: "MODERATION",
    headline: {
      line1: "MODERATE",
      line2: "THREADS",
      line3: "AT SCALE",
    },
    description:
      "Hide, lock, and resolve reports across problem and global discussions with clear audit trails.",
    stats: {
      threads: "Threads",
      reports: "Open reports",
    },
  },
  submissionsAdmin: {
    marker: "[05] JUDGE OPS",
    badge: "REJUDGE & VISIBILITY",
    headline: {
      line1: "CURATE",
      line2: "SUBMISSION",
      line3: "STATE",
    },
    description:
      "Spot stuck jobs, rejudge selectively, and control profile visibility with safeguards.",
    stats: {
      total: "Total listed",
      status: "Status filter",
    },
  },
  audit: {
    marker: "[06] AUDIT OPS",
    badge: "TRACEABILITY",
    headline: {
      line1: "WATCH",
      line2: "EVERY",
      line3: "ACTION",
    },
    description:
      "Live audit log with incident filing and severity tracking to keep operations accountable.",
    stats: {
      events: "Events in view",
      incidents: "Open incidents",
    },
  },
  system: {
    marker: "[07] SYSTEM OPS",
    badge: "PLATFORM HEALTH",
    headline: {
      line1: "ORCHESTRATE",
      line2: "MAINTENANCE",
      line3: "STATE",
    },
    description:
      "Control maintenance mode, submission limits, and feature flags with confirmation gates.",
    stats: {
      queues: "Judge queues",
      flags: "Feature flags",
    },
  },
};

export type AdminConfig = typeof adminConfig;
