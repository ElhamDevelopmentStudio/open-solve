export const contestsConfig = {
  overview: {
    hero: {
      marker: "[01] CONTEST GRID",
      badge: "LIVE WINDOWS",
      headline: {
        line1: "OPERATE",
        line2: "UNDER",
        line3: "PRESSURE",
      },
      description:
        "Monitor every OpenSolve contest from a single brutalist console. Featured windows, registration stats, and upcoming queues stay perfectly in sync.",
      primaryCta: { label: "Contest playbook", href: "/proposals" },
      secondaryCta: { label: "Create team", href: "/teams" },
    },
    stats: [
      { key: "live", label: "Live contests" },
      { key: "upcoming", label: "Upcoming" },
      { key: "past", label: "Recent" },
    ] as const,
    featured: {
      marker: "[02]",
      title: "Featured window",
      description: "Signal boosted contest pulled from the global schedule.",
      ctaLabel: "Open contest",
      fallback: "No featured contest",
    },
    table: {
      marker: "[03]",
      title: "Contest directory",
      description:
        "Sortable stream of live, upcoming, and recent contests. Rows are keyboard navigable and prefetched for instant transitions.",
      searchPlaceholder: "Search contests or slugs…",
    },
  },
  detail: {
    hero: {
      badge: "CONTEST DETAIL",
      backLabel: "All contests",
    },
    register: {
      marker: "[02]",
      registeredLabel: "Registered",
      joinLabel: "Join the roster",
      ctaRegister: "Register now",
      ctaLeave: "Leave contest",
      disabledCopy: "Sign in to register",
      meta: {
        format: "Format",
        type: "Type",
        scoring: "Scoring",
      },
    },
    sections: {
      scoring: {
        marker: "[03]",
        title: "Scoring rules",
        modeLabel: "Mode",
        tiebreakerLabel: "Tie breakers",
      },
      rules: {
        marker: "[04]",
        title: "Contest rules",
        rulesetLabel: "Ruleset",
        typeLabel: "Type",
      },
      freeze: {
        marker: "[05]",
        title: "Freeze settings",
        statusLabel: "Status",
        offsetLabel: "Offset",
        modeLabel: "Mode",
      },
      antiCheat: {
        marker: "[06]",
        title: "Anti-cheat telemetry",
        description:
          "Focus shifts, large pastes, multi-device usage, and similarity scans are routed to ops.",
        focusSoft: "Soft warning tabs",
        focusFlag: "Flag tabs",
        focusOut: "Focus timeout (min)",
        pasteLimit: "Paste limit",
        examMode: "Exam mode",
        singleDevice: "Single device only",
        multiDevice: "Multi-device flagged",
      },
      problems: {
        marker: "[07]",
        title: "Problem archive",
        lockedCopy: "Problems unlock when the window starts.",
      },
      timeline: {
        marker: "[08]",
        title: "Contest timeline",
        helper: "Times are rendered in your local timezone.",
      },
    },
    links: {
      scoreboard: "Scoreboard",
      clarifications: "Clarifications",
    },
  },
  clarifications: {
    hero: {
      marker: "[01]",
      title: "Clarification console",
      description:
        "Route precise, spoiler-free questions during practice or live windows. Staff responses are mirrored globally.",
    },
    form: {
      marker: "[02]",
      title: "Submit clarification",
      problemLabel: "Problem scope",
      generalOption: "General question",
      bodyLabel: "Question",
      placeholder: "Keep it concise and spoiler-free…",
      submitLabel: "Send clarification",
      pendingLabel: "Sending…",
      helperRegistered: "Only registered participants can submit clarifications.",
      helperUnregistered: "Register to enable clarifications.",
      listTitle: "Clarification feed",
      listEmpty: "No clarifications filed yet.",
    },
  },
  scoreboard: {
    hero: {
      marker: "[01]",
      title: "Scoreboard",
      description:
        "Live standings update automatically. Refresh if you need deterministic snapshots.",
      refreshLabel: "Refresh",
    },
    status: {
      participants: "participants",
      updatedPrefix: "Last updated",
      frozenNotice: "Scoreboard frozen — standings unlock after the freeze window.",
      hidden: "Scoreboard is hidden for this contest.",
      empty: "No submissions yet. Be the first to solve.",
    },
    table: {
      columns: {
        rank: "Rank",
        participant: "Participant",
        solved: "Solved",
        score: "Score",
        penalty: "Penalty",
      },
      loadMore: "Load more",
    },
  },
};

export type ContestsConfig = typeof contestsConfig;
