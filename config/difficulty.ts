import type { DifficultyValue } from "@/lib/problems/constants";

type LevelFocus = {
  title: string;
  description: string;
  metric: string;
};

type LevelRitual = {
  title: string;
  description: string;
  duration: string;
};

type DifficultyLevelConfig = {
  label: string;
  hero: {
    badge: string;
    headline: [string, string, string];
    description: string;
  };
  stats: Array<{ label: string; value: string; helper: string }>;
  focusAreas: LevelFocus[];
  rituals: LevelRitual[];
  summary: {
    title: string;
    description: string;
    highlights: string[];
  };
  metaTitle: string;
  metaDescription: string;
};

type DifficultyPageConfig = {
  sections: {
    hero: string;
    focus: string;
    rituals: string;
    library: string;
  };
  switcherLabel: string;
  levels: Record<DifficultyValue, DifficultyLevelConfig>;
};

export const difficultyPageConfig: DifficultyPageConfig = {
  sections: {
    hero: "[01] DIFFICULTY MODE",
    focus: "[02] PATTERN PLAYBOOK",
    rituals: "[03] PRACTICE RITUALS",
    library: "[04] FILTERED LIBRARY",
  },
  switcherLabel: "Jump to other levels",
  levels: {
    EASY: {
      label: "Easy",
      hero: {
        badge: "FLOW / EASY MODE",
        headline: ["Reset", "Muscle", "Memory"],
        description:
          "Calibrate fundamentals with forgiving inputs, predictable constraints, and plenty of signal for deliberate practice blocks.",
      },
      stats: [
        { label: "AVG ACCEPTANCE", value: "68%", helper: "Community-wide" },
        { label: "TYPICAL RUNTIME", value: "< 1.2s", helper: "1e4 ops" },
        { label: "MOST USED TAGS", value: "arrays · strings", helper: "Pattern drills" },
      ],
      focusAreas: [
        {
          title: "Pattern Drills",
          description:
            "Short, repeatable reps across arrays, maps, and trivial graphs to build recall.",
          metric: "10-15 min sets",
        },
        {
          title: "Implementation Speed",
          description: "Ship clean code without rereading prompts. Track time-to-first compile.",
          metric: "< 6 min",
        },
        {
          title: "Confidence Logs",
          description:
            "Archive solved prompts with notes so you can scan weak spots before contests.",
          metric: "2 notes/run",
        },
      ],
      rituals: [
        {
          title: "Warm Start",
          description: "Two friendly prompts to shake off rust before diving into new material.",
          duration: "10m block",
        },
        {
          title: "Pattern Review",
          description:
            "Tag solved problems and capture the core transformation or data structure used.",
          duration: "5m retro",
        },
        {
          title: "Share Back",
          description: "Teach the approach in a discussion thread to reinforce what just clicked.",
          duration: "Async",
        },
      ],
      summary: {
        title: "Curated for fundamentals",
        description:
          "The feed below locks filters to Easy problems, sorted by newest first so you always see the latest drills.",
        highlights: [
          "Ideal for onboarding teammates",
          "Great for timed warmups",
          "Pairs well with editorial study",
        ],
      },
      metaTitle: "Easy problems | OpenSolve",
      metaDescription:
        "Deliberate practice sets that reinforce arrays, strings, and other fundamentals with forgiving constraints.",
    },
    MEDIUM: {
      label: "Medium",
      hero: {
        badge: "FLOW / MEDIUM MODE",
        headline: ["Climb", "The", "Plateau"],
        description:
          "Mix implementation and strategy problems tuned for interview and contest prep. Expect layered constraints and branching states.",
      },
      stats: [
        { label: "AVG ACCEPTANCE", value: "41%", helper: "Requires planning" },
        { label: "TYPICAL RUNTIME", value: "~ 2.4s", helper: "1e5-1e6 ops" },
        { label: "MOST USED TAGS", value: "trees · dp · math", helper: "Hybrid sets" },
      ],
      focusAreas: [
        {
          title: "Decision Trees",
          description:
            "Sketch invariants and break down states before typing. Most failures happen here.",
          metric: "3-4 branches",
        },
        {
          title: "Constraint Reads",
          description:
            "Read complexity budgets like spec. Label each constraint with the structure it implies.",
          metric: "< 60s",
        },
        {
          title: "Code Journal",
          description: "Capture wrong turns plus fixes so future-you avoids the same traps.",
          metric: "1 delta/run",
        },
      ],
      rituals: [
        {
          title: "Case Mapping",
          description:
            "Enumerate sample cases plus counter cases before coding. Keeps branching logic honest.",
          duration: "12m map",
        },
        {
          title: "Focus Sprint",
          description:
            "Single 45m uninterrupted block with timer + status indicator for accountability.",
          duration: "45m block",
        },
        {
          title: "Retro & Tag",
          description: "Log verdict, time, and theme so your history stays filterable.",
          duration: "5m retro",
        },
      ],
      summary: {
        title: "Built for plateau busting",
        description:
          "Library filters lock onto Medium difficulty with your other filter choices preserved, so you can chase patterns without context switches.",
        highlights: [
          "Great for mock interviews",
          "Balances theory + build",
          "Signals problem readiness",
        ],
      },
      metaTitle: "Medium problems | OpenSolve",
      metaDescription:
        "Algorithm sets balancing implementation and strategy, tuned for interview loops and contest prep.",
    },
    HARD: {
      label: "Hard",
      hero: {
        badge: "FLOW / HARD MODE",
        headline: ["Break", "Ceilings", "Daily"],
        description:
          "Contest-tier prompts with brutal constraints, custom judges, and anti-cheat instrumentation. Expect to diagram before you code.",
      },
      stats: [
        { label: "AVG ACCEPTANCE", value: "14%", helper: "Manual + auto judge" },
        { label: "TYPICAL RUNTIME", value: "~ 4.5s", helper: "1e7 ops" },
        { label: "MOST USED TAGS", value: "dp · flows · geometry", helper: "Advanced" },
      ],
      focusAreas: [
        {
          title: "Proof Sketches",
          description: "Outline correctness plus complexity before writing a byte.",
          metric: "1 page",
        },
        {
          title: "Judge Notes",
          description:
            "Track failure seeds, random tests, and manual review flags for root-cause clarity.",
          metric: "every run",
        },
        {
          title: "Anti-Cheat Ready",
          description:
            "Contests enforce biometrics + environment checks. Practice with discipline.",
          metric: "strict mode",
        },
      ],
      rituals: [
        {
          title: "Research Block",
          description: "Study editorials + whitepapers tied to the tags you miss most.",
          duration: "60m deep work",
        },
        {
          title: "Judge Replay",
          description: "Replay failed submissions, annotate logs, and store diff snapshots.",
          duration: "15m review",
        },
        {
          title: "Contest Sim",
          description:
            "Run full-timer mocks with Docker judge + RabbitMQ queue to mimic production.",
          duration: "90m sim",
        },
      ],
      summary: {
        title: "Contest-grade curation",
        description:
          "Filters below pin the feed to Hard problems so you can grind advanced sets without reconfiguring the table.",
        highlights: [
          "Targets rating pushes",
          "Pairs with coach reviews",
          "Stress tests your stack",
        ],
      },
      metaTitle: "Hard problems | OpenSolve",
      metaDescription:
        "Contest-grade algorithms with strict judges, anti-cheat instrumentation, and layered constraints.",
    },
  },
};

export type { DifficultyLevelConfig };
