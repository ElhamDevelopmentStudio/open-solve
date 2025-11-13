import { createHash } from "crypto";
import {
  Prisma,
  BadgeAwardSource,
  ContestRuleset,
  ContestState,
  ContestType,
  ContestVisibility,
  ContestRegistrationStatus,
  IncidentSeverity,
  IncidentStatus,
  ProblemProposalStatus,
  ProblemState,
  ProblemVisibility,
  ProblemJudgeMode,
  SubmissionStatus,
  TestCaseKind,
  UserRole,
  UserStatus,
} from "@prisma/client";
import { hashPassword } from "../lib/auth/password";
import { prisma } from "../lib/prisma";
import { getDefaultCodeStub } from "../lib/problems/editor-presets";
import { defaultContestSettings } from "../lib/contests/settings";
import { buildProtectedEmailFields } from "../lib/security/email";

type UserSeed = {
  key: string;
  email: string;
  handle: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  country?: string;
  timezone?: string;
  bio?: string;
  shareAcceptedCode?: boolean;
  showOnLeaderboard?: boolean;
  showCountry?: boolean;
  showSocials?: boolean;
  socials?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
  stats: {
    totalSolved: number;
    solvedEasy: number;
    solvedMedium: number;
    solvedHard: number;
    streakCount: number;
    firstAcAt?: Date;
    lastAcAt?: Date;
    languagesUsed: string[];
  };
};

type ProblemSeed = {
  slug: string;
  state: ProblemState;
  visibility: ProblemVisibility;
  judgeMode?: ProblemJudgeMode;
  difficulty: string;
  authorKey: string;
  createdByKey: string;
  extraCurators?: string[];
  tags: string[];
  companies: string[];
  languages?: Array<{
    code: string;
    stub?: string;
  }>;
  stats: {
    acceptedCount: number;
    submissionCount: number;
    favoriteCount: number;
    acceptanceRate: number;
  };
  version: {
    versionNumber: number;
    title: string;
    statement: string;
    constraints: string;
    hints?: string;
    editorial?: string;
    samples: Prisma.InputJsonValue;
    testCases: Array<{
      kind: TestCaseKind;
      ordinal: number;
      input: string;
      output: string;
      timeLimitMs: number;
      memoryLimitMb: number;
      strength?: number;
    }>;
  };
};

type ProposalSeed = {
  slug: string;
  title: string;
  intendedDifficulty: string;
  statement: string;
  samples: Prisma.InputJsonValue;
  status: ProblemProposalStatus;
  authorKey: string;
  reviewerKey?: string;
};

type SubmissionSeed = {
  id: string;
  userKey: string;
  problemSlug: string;
  problemVersion: number;
  languageCode: string;
  verdictCode: string | null;
  status: SubmissionStatus;
  requiresManualReview?: boolean;
  manualReviewerKey?: string;
  manualReviewedAt?: Date;
  manualNotes?: string;
  manualScore?: number;
  manualDueAt?: Date;
  queuedAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  score?: number;
  timeUsedMs?: number;
  memoryUsedKb?: number;
  judgeNodeId?: string;
  contestSlug?: string;
  metadata?: Prisma.JsonObject;
  sourceCodeRef: string;
  caseResults: Array<{
    testOrdinal: number;
    verdictCode: string;
    timeMs: number;
    memoryKb: number;
  }>;
};

type DiscussionSeed = {
  id: string;
  problemSlug: string;
  authorKey: string;
  content: string;
  parentId?: string;
};

type VoteSeed = {
  discussionId: string;
  userKey: string;
  value: number;
};

type BadgeAwardSeed = {
  badgeSlug: string;
  userKey: string;
  source: BadgeAwardSource;
  metadata?: Prisma.JsonObject;
};

type ContestSeed = {
  slug: string;
  name: string;
  description: string;
  type: ContestType;
  state: ContestState;
  visibility: ContestVisibility;
  startsAt: Date;
  endsAt: Date;
  freezeAt?: Date;
  rules: ContestRuleset;
  isRated: boolean;
  editorialReleaseAt?: Date;
  settings?: Prisma.JsonValue;
  problems: Array<{
    problemSlug: string;
    version: number;
    label: string;
    order: number;
    points: number;
  }>;
  registrations: Array<{
    userKey: string;
    isVirtual?: boolean;
    status?: ContestRegistrationStatus;
    isDisqualified?: boolean;
  }>;
};

type LeaderboardSeed = {
  window: string;
  periodStart: Date;
  periodEnd?: Date;
  entries: Array<{
    rank: number;
    userKey: string;
    score: number;
    solved: number;
    timePenalty?: number;
  }>;
};

const json = <T extends Prisma.InputJsonValue>(value: T) => value;

const userSeeds: UserSeed[] = [
  {
    key: "admin",
    email: "admin@opensolve.dev",
    handle: "admin",
    name: "System Admin",
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    country: "US",
    timezone: "America/New_York",
  bio: "Keeps the lights on for OpenSolve.",
  shareAcceptedCode: true,
  showOnLeaderboard: false,
  showSocials: false,
  socials: {
    github: "https://github.com/opensolve",
    linkedin: "https://www.linkedin.com/company/opensolve"
  },
  stats: {
      totalSolved: 512,
      solvedEasy: 220,
      solvedMedium: 210,
      solvedHard: 82,
      streakCount: 45,
      firstAcAt: new Date("2023-04-01T12:00:00Z"),
      lastAcAt: new Date("2024-12-15T09:00:00Z"),
      languagesUsed: ["cpp17", "python3"],
    },
  },
  {
    key: "curatorOne",
    email: "mira@opensolve.dev",
    handle: "mira",
    name: "Mira Q.",
    role: UserRole.PROBLEM_CURATOR,
    status: UserStatus.ACTIVE,
    country: "BG",
    timezone: "Europe/Sofia",
  bio: "Curates graph problems with a focus on pedagogy.",
  showSocials: true,
  socials: {
    twitter: "https://twitter.com/mira_q",
    linkedin: "https://www.linkedin.com/in/mira-queue"
  },
  stats: {
      totalSolved: 312,
      solvedEasy: 140,
      solvedMedium: 130,
      solvedHard: 42,
      streakCount: 28,
      firstAcAt: new Date("2022-11-12T10:00:00Z"),
      lastAcAt: new Date("2024-11-28T07:45:00Z"),
      languagesUsed: ["python3", "java17"],
    },
  },
  {
    key: "curatorTwo",
    email: "jo@opensolve.dev",
    handle: "jo",
    name: "Jo Park",
    role: UserRole.PROBLEM_CURATOR,
    status: UserStatus.ACTIVE,
    country: "KR",
    timezone: "Asia/Seoul",
    bio: "Designs contest-ready DP sets.",
    stats: {
      totalSolved: 278,
      solvedEasy: 120,
      solvedMedium: 118,
      solvedHard: 40,
      streakCount: 15,
      firstAcAt: new Date("2023-01-05T02:00:00Z"),
      lastAcAt: new Date("2024-12-01T13:20:00Z"),
      languagesUsed: ["cpp17"],
    },
  },
  {
    key: "lena",
    email: "lena@opensolve.dev",
    handle: "lena",
    name: "Lena Atwood",
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    country: "GB",
    timezone: "Europe/London",
  bio: "Building a daily streak before internship season.",
  shareAcceptedCode: true,
  showOnLeaderboard: true,
  socials: {
    github: "https://github.com/lena-dev",
    website: "https://lena.dev"
  },
  stats: {
      totalSolved: 188,
      solvedEasy: 110,
      solvedMedium: 66,
      solvedHard: 12,
      streakCount: 21,
      firstAcAt: new Date("2024-02-10T10:30:00Z"),
      lastAcAt: new Date("2024-12-20T16:10:00Z"),
      languagesUsed: ["python3", "node20"],
    },
  },
  {
    key: "dex",
    email: "dex@opensolve.dev",
    handle: "dexter",
    name: "Dex Carter",
    role: UserRole.USER,
    status: UserStatus.SHADOW_BANNED,
    country: "US",
    timezone: "America/Chicago",
  bio: "Experimenting with unusual heuristics.",
  showOnLeaderboard: false,
  showCountry: false,
  stats: {
      totalSolved: 96,
      solvedEasy: 60,
      solvedMedium: 32,
      solvedHard: 4,
      streakCount: 2,
      firstAcAt: new Date("2024-03-01T18:00:00Z"),
      lastAcAt: new Date("2024-10-02T08:12:00Z"),
      languagesUsed: ["node20"],
    },
  },
  {
    key: "kai",
    email: "kai@opensolve.dev",
    handle: "kaicode",
    name: "Kai Ong",
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    country: "SG",
    timezone: "Asia/Singapore",
  bio: "Hard-mode grinder focused on graphs.",
  socials: {
    twitter: "https://twitter.com/kaicode"
  },
  stats: {
      totalSolved: 244,
      solvedEasy: 80,
      solvedMedium: 120,
      solvedHard: 44,
      streakCount: 9,
      firstAcAt: new Date("2024-01-03T05:00:00Z"),
      lastAcAt: new Date("2024-12-18T12:48:00Z"),
      languagesUsed: ["cpp17"],
    },
  },
];

const difficultySeeds = [
  { code: "EASY", name: "Easy", weight: 800, description: "Great for warm-ups." },
  { code: "MEDIUM", name: "Medium", weight: 1400, description: "Standard interview difficulty." },
  { code: "HARD", name: "Hard", weight: 2000, description: "Contest-ready challenges." },
];

const languageSeeds = [
  {
    code: "cpp17",
    displayName: "C++17 (GCC)",
    compileCmd: "g++ Main.cpp -std=gnu++17 -O2 -pipe -static -s -o Main",
    runCmd: "./Main",
    timeMultiplier: 1,
    memoryCeilingMb: 1024,
    fileExtension: "cpp",
    sandboxProfile: "cpp",
  },
  {
    code: "python3",
    displayName: "Python 3.11",
    compileCmd: "python3 -m py_compile Main.py",
    runCmd: "python3 Main.py",
    timeMultiplier: 1.5,
    memoryCeilingMb: 768,
    fileExtension: "py",
    sandboxProfile: "python",
  },
  {
    code: "java17",
    displayName: "Java 17",
    compileCmd: "javac Main.java",
    runCmd: "java Main",
    timeMultiplier: 1.2,
    memoryCeilingMb: 1024,
    fileExtension: "java",
    sandboxProfile: "java",
  },
  {
    code: "node20",
    displayName: "Node.js 20",
    compileCmd: "",
    runCmd: "node Main.js",
    timeMultiplier: 1.3,
    memoryCeilingMb: 768,
    fileExtension: "js",
    sandboxProfile: "node",
  },
];

const verdictSeeds = [
  { code: "AC", label: "Accepted", rank: 1 },
  { code: "WA", label: "Wrong Answer", rank: 2 },
  { code: "TLE", label: "Time Limit Exceeded", rank: 3 },
  { code: "MLE", label: "Memory Limit Exceeded", rank: 4 },
  { code: "RE", label: "Runtime Error", rank: 5 },
  { code: "CE", label: "Compile Error", rank: 6 },
  { code: "MANUAL_PENDING", label: "Manual Pending", rank: 10, isTerminal: false },
  { code: "MANUAL_ACCEPTED", label: "Manual Accepted", rank: 11 },
  { code: "MANUAL_REJECTED", label: "Manual Rejected", rank: 12 },
  { code: "MANUAL_PARTIAL", label: "Manual Partial", rank: 13 },
];

const tagSeeds = [
  { name: "Arrays", slug: "arrays", category: "data_structure", isFeatured: true },
  { name: "Strings", slug: "strings", category: "data_structure", isFeatured: true },
  { name: "Hashing", slug: "hashing", category: "algorithm", isFeatured: true },
  { name: "Math", slug: "math", category: "pattern", isFeatured: false },
  { name: "Graphs", slug: "graphs", category: "data_structure", isFeatured: true },
  {
    name: "Dynamic Programming",
    slug: "dynamic-programming",
    category: "algorithm",
    isFeatured: true,
  },
  { name: "Greedy", slug: "greedy", category: "algorithm", isFeatured: false },
  { name: "Binary Search", slug: "binary-search", category: "algorithm", isFeatured: false },
  { name: "Trees", slug: "trees", category: "data_structure", isFeatured: false },
  { name: "Sliding Window", slug: "sliding-window", category: "pattern", isFeatured: false },
  { name: "Bitmask", slug: "bitmask", category: "algorithm", isFeatured: false },
  { name: "Geometry", slug: "geometry", category: "algorithm", isFeatured: false },
  { name: "Two Pointers", slug: "two-pointers", category: "pattern", isFeatured: false },
  { name: "Simulation", slug: "simulation", category: "pattern", isFeatured: false },
  { name: "Prefix Sum", slug: "prefix-sum", category: "pattern", isFeatured: false },
];

const companySeeds = [
  { name: "Google", slug: "google", isHidden: false },
  { name: "Meta", slug: "meta", isHidden: false },
  { name: "Amazon", slug: "amazon", isHidden: false },
  { name: "Microsoft", slug: "microsoft", isHidden: false },
  { name: "Apple", slug: "apple", isHidden: false },
  { name: "Netflix", slug: "netflix", isHidden: false },
  { name: "Airbnb", slug: "airbnb", isHidden: true },
  { name: "Uber", slug: "uber", isHidden: false },
  { name: "Stripe", slug: "stripe", isHidden: false },
  { name: "Databricks", slug: "databricks", isHidden: true },
];

const badgeSeeds = [
  {
    slug: "first-ac",
    name: "First AC",
    description: "Awarded for the first accepted submission.",
    icon: "✨",
    criteria: json({ threshold: 1, metric: "accepted" }),
    isHidden: false,
  },
  {
    slug: "ten-solves",
    name: "10 Solves",
    description: "Awarded after solving ten problems.",
    icon: "🏅",
    criteria: json({ threshold: 10, metric: "totalSolved" }),
    isHidden: false,
  },
  {
    slug: "streak-7",
    name: "Streak 7",
    description: "Maintain a 7-day solving streak.",
    icon: "🔥",
    criteria: json({ threshold: 7, metric: "streak" }),
    isHidden: false,
  },
];

const problemSeeds: ProblemSeed[] = [
  {
    slug: "two-sum",
    state: ProblemState.PUBLISHED,
    visibility: ProblemVisibility.PUBLIC,
    judgeMode: ProblemJudgeMode.AUTO,
    difficulty: "EASY",
    authorKey: "curatorOne",
    createdByKey: "curatorOne",
    extraCurators: ["curatorTwo"],
    tags: ["arrays", "hashing", "two-pointers"],
    companies: ["google", "uber"],
    languages: [
      { code: "cpp17" },
      { code: "python3" },
    ],
    stats: {
      acceptedCount: 1,
      submissionCount: 2,
      favoriteCount: 240,
      acceptanceRate: 0.5,
    },
    version: {
      versionNumber: 3,
      title: "Two Sum — Stable Hash Map Edition",
      statement:
        "Given an array of integers nums and an integer target, return the indices of the two numbers such that they add up to target. Each input has exactly one solution, and you may not use the same element twice.",
      constraints:
        "- 2 <= n <= 10^5\n- -10^9 <= nums[i] <= 10^9\n- Exactly one valid answer exists",
      hints:
        "- Use a hash map to remember the value -> index mapping.\n- Single pass solutions avoid extra memory churn.",
      editorial: "Traverse once while storing complements in a hash map for O(n) time.",
      samples: json([
        { input: "4\n2 7 11 15\n9", output: "0 1" },
        { input: "3\n3 2 4\n6", output: "1 2" },
      ]),
      testCases: [
        {
          kind: TestCaseKind.SAMPLE,
          ordinal: 1,
          input: "4\n2 7 11 15\n9",
          output: "0 1",
          timeLimitMs: 2000,
          memoryLimitMb: 256,
          strength: 0,
        },
        {
          kind: TestCaseKind.SAMPLE,
          ordinal: 2,
          input: "3\n3 2 4\n6",
          output: "1 2",
          timeLimitMs: 2000,
          memoryLimitMb: 256,
          strength: 0,
        },
        {
          kind: TestCaseKind.HIDDEN,
          ordinal: 3,
          input: "5\n1 1 1 1 1\n2",
          output: "0 1",
          timeLimitMs: 1500,
          memoryLimitMb: 256,
          strength: 120,
        },
        {
          kind: TestCaseKind.HIDDEN,
          ordinal: 4,
          input: "6\n13 7 2 11 19 5\n24",
          output: "1 3",
          timeLimitMs: 1500,
          memoryLimitMb: 256,
          strength: 120,
        },
      ],
    },
  },
  {
    slug: "interval-maestro",
    state: ProblemState.REVIEW,
    visibility: ProblemVisibility.INTERNAL,
    judgeMode: ProblemJudgeMode.HYBRID,
    difficulty: "MEDIUM",
    authorKey: "curatorTwo",
    createdByKey: "curatorTwo",
    languages: [
      { code: "cpp17" },
      { code: "python3" },
      { code: "node20" },
    ],
    tags: ["prefix-sum", "binary-search", "greedy"],
    companies: ["amazon", "meta"],
    stats: {
      acceptedCount: 0,
      submissionCount: 0,
      favoriteCount: 48,
      acceptanceRate: 0,
    },
    version: {
      versionNumber: 1,
      title: "Interval Maestro",
      statement:
        "Given N rehearsal slots with start/end times and a maximum overlap budget K, pick the largest subset of intervals such that at most K intervals overlap at any point.",
      constraints: "- 1 <= N <= 2 * 10^5\n- 0 <= start < end <= 10^9\n- 0 <= K <= N",
      hints:
        "- Sort by start time and maintain a min-heap of ending intervals.\n- Drop the interval with the longest duration when exceeding K.",
      editorial: "Sweep across events and greedily keep the tightest set with a priority queue.",
      samples: json([
        {
          input: "3\n0 5\n2 4\n6 9\n1",
          output: "2",
        },
      ]),
      testCases: [
        {
          kind: TestCaseKind.SAMPLE,
          ordinal: 1,
          input: "3\n0 5\n2 4\n6 9\n1",
          output: "2",
          timeLimitMs: 2500,
          memoryLimitMb: 512,
          strength: 0,
        },
        {
          kind: TestCaseKind.HIDDEN,
          ordinal: 2,
          input: "5\n0 2\n1 4\n3 6\n5 9\n8 11\n2",
          output: "4",
          timeLimitMs: 2500,
          memoryLimitMb: 512,
          strength: 180,
        },
      ],
    },
  },
  {
    slug: "galactic-network",
    state: ProblemState.PUBLISHED,
    visibility: ProblemVisibility.UNLISTED,
    judgeMode: ProblemJudgeMode.MANUAL,
    difficulty: "HARD",
    authorKey: "curatorTwo",
    createdByKey: "curatorTwo",
    tags: ["graphs", "dynamic-programming", "bitmask"],
    companies: ["databricks", "google"],
    stats: {
      acceptedCount: 0,
      submissionCount: 2,
      favoriteCount: 12,
      acceptanceRate: 0,
    },
    version: {
      versionNumber: 2,
      title: "Galactic Network Routing",
      statement:
        "You are given a weighted directed graph with up to 15 special hubs. Compute the minimum latency route visiting every hub exactly once while respecting per-edge cooldown windows.",
      constraints:
        "- 2 <= n <= 2 * 10^5\n- 0 <= m <= 4 * 10^5\n- Special hubs <= 15\n- Latencies up to 10^9",
      hints:
        "- Precompute APSP between hubs.\n- Use DP over subsets with bitmasking plus cooldown feasibility checks.",
      editorial:
        "Compress hubs, run multi-source Dijkstra per hub, then DP over subsets to find the optimal Hamiltonian walk with penalties.",
      samples: json([
        {
          input: "4 5\n0 1 3\n1 2 4\n2 3 5\n3 0 6\n0 2 7\n2\n0 2",
          output: "12",
        },
      ]),
      testCases: [
        {
          kind: TestCaseKind.SAMPLE,
          ordinal: 1,
          input: "4 5\n0 1 3\n1 2 4\n2 3 5\n3 0 6\n0 2 7\n2\n0 2",
          output: "12",
          timeLimitMs: 5000,
          memoryLimitMb: 2048,
          strength: 0,
        },
        {
          kind: TestCaseKind.HIDDEN,
          ordinal: 2,
          input: "6 7\n0 1 5\n1 4 7\n4 5 6\n5 2 9\n2 3 4\n3 0 3\n1 3 8\n3\n0 2 4",
          output: "28",
          timeLimitMs: 6000,
          memoryLimitMb: 2048,
          strength: 320,
        },
        {
          kind: TestCaseKind.HIDDEN,
          ordinal: 3,
          input:
            "8 10\n0 1 3\n1 2 6\n2 5 8\n5 6 9\n6 7 10\n7 0 2\n0 4 7\n4 3 5\n3 5 4\n2 4 1\n4\n0 2 4 6",
          output: "31",
          timeLimitMs: 6500,
          memoryLimitMb: 2048,
          strength: 340,
        },
      ],
    },
  },
];

const proposalSeeds: ProposalSeed[] = [
  {
    slug: "balanced-array-proposal",
    title: "Balanced Array",
    intendedDifficulty: "Medium",
    statement:
      "Given an array of integers nums, split it into two subsequences A and B such that the sum of A equals the sum of B, or report that it is impossible.",
    samples: json([
      {
        input: "4\n1 5 3 3",
        output: "Possible",
      },
    ]),
    status: ProblemProposalStatus.IN_REVIEW,
    authorKey: "lena",
    reviewerKey: "curatorOne",
  },
  {
    slug: "grid-harvest",
    title: "Grid Harvest",
    intendedDifficulty: "Hard",
    statement:
      "You are given an n x n grid of crop values. Starting from (0,0) you must reach (n-1,n-1) collecting cells along the way, moving only right or down, but with the constraint that exactly k direction changes are allowed.",
    samples: json([
      {
        input: "3 1\n1 2 3\n4 5 6\n7 8 9",
        output: "29",
      },
    ]),
    status: ProblemProposalStatus.SUBMITTED,
    authorKey: "kai",
  },
];

const discussionSeeds: DiscussionSeed[] = [
  {
    id: "seed-discussion-two-sum",
    problemSlug: "two-sum",
    authorKey: "dex",
    content: "Is there any benefit to sorting first? I tried it but ran into duplicate headaches.",
  },
  {
    id: "seed-discussion-two-sum-reply",
    problemSlug: "two-sum",
    authorKey: "curatorOne",
    content: "Not really — sorting breaks index stability. Stick to a hash map for O(n).",
    parentId: "seed-discussion-two-sum",
  },
];

const voteSeeds: VoteSeed[] = [
  {
    discussionId: "seed-discussion-two-sum-reply",
    userKey: "lena",
    value: 1,
  },
];

const badgeAwardSeeds: BadgeAwardSeed[] = [
  { badgeSlug: "first-ac", userKey: "lena", source: BadgeAwardSource.SYSTEM },
  { badgeSlug: "ten-solves", userKey: "lena", source: BadgeAwardSource.SYSTEM },
  { badgeSlug: "streak-7", userKey: "kai", source: BadgeAwardSource.SYSTEM },
];

const contestSeed: ContestSeed = {
  slug: "starter-sprint",
  name: "Starter Sprint 001",
  description: "A 90-minute mixed difficulty sprint to validate the contest pipeline.",
  type: ContestType.COMPETITIVE,
  state: ContestState.RUNNING,
  visibility: ContestVisibility.PUBLIC,
  startsAt: new Date("2025-01-15T17:00:00Z"),
  endsAt: new Date("2025-01-15T18:30:00Z"),
  freezeAt: new Date("2025-01-15T18:10:00Z"),
  rules: ContestRuleset.ICPC,
  isRated: true,
  editorialReleaseAt: new Date("2025-01-16T00:00:00Z"),
  settings: json({
    ...defaultContestSettings,
    registration: {
      ...defaultContestSettings.registration,
      mode: "open",
      allowVirtual: true,
    },
    freeze: {
      ...defaultContestSettings.freeze,
      enabled: true,
      offsetMinutes: 20,
    },
  }),
  problems: [
    { problemSlug: "two-sum", version: 3, label: "A", order: 1, points: 100 },
    { problemSlug: "interval-maestro", version: 1, label: "B", order: 2, points: 200 },
    { problemSlug: "galactic-network", version: 2, label: "C", order: 3, points: 300 },
  ],
  registrations: [
    { userKey: "lena" },
    { userKey: "dex", isVirtual: true },
    { userKey: "kai" },
    { userKey: "curatorOne" },
  ],
};

const leaderboardSeed: LeaderboardSeed = {
  window: "weekly",
  periodStart: new Date("2025-01-06T00:00:00Z"),
  periodEnd: new Date("2025-01-13T00:00:00Z"),
  entries: [
    { rank: 1, userKey: "lena", score: 780, solved: 18, timePenalty: 120 },
    { rank: 2, userKey: "kai", score: 720, solved: 15, timePenalty: 210 },
    { rank: 3, userKey: "dex", score: 610, solved: 11, timePenalty: 330 },
  ],
};

const submissionBaseTime = new Date("2025-01-05T12:00:00Z");
const submissionSeeds: SubmissionSeed[] = [
  {
    id: "sub-two-sum-lena",
    userKey: "lena",
    problemSlug: "two-sum",
    problemVersion: 3,
    languageCode: "python3",
    verdictCode: "AC",
    status: SubmissionStatus.SUCCEEDED,
    queuedAt: new Date(submissionBaseTime.getTime()),
    startedAt: new Date(submissionBaseTime.getTime() + 5_000),
    finishedAt: new Date(submissionBaseTime.getTime() + 15_000),
    score: 100,
    timeUsedMs: 41,
    memoryUsedKb: 1024,
    judgeNodeId: "judge-us-west-1",
    metadata: { judgeVersion: "v0.1.0", rerunCount: 0 },
    sourceCodeRef: "inline://submissions/two-sum-lena.py",
    caseResults: [
      { testOrdinal: 1, verdictCode: "AC", timeMs: 12, memoryKb: 512 },
      { testOrdinal: 2, verdictCode: "AC", timeMs: 14, memoryKb: 640 },
    ],
  },
  {
    id: "sub-two-sum-dex",
    userKey: "dex",
    problemSlug: "two-sum",
    problemVersion: 3,
    languageCode: "node20",
    verdictCode: "WA",
    status: SubmissionStatus.FAILED,
    queuedAt: new Date(submissionBaseTime.getTime() + 60_000),
    startedAt: new Date(submissionBaseTime.getTime() + 70_000),
    finishedAt: new Date(submissionBaseTime.getTime() + 120_000),
    score: 0,
    timeUsedMs: 80,
    memoryUsedKb: 2048,
    metadata: { judgeVersion: "v0.1.0", rerunCount: 1 },
    sourceCodeRef: "inline://submissions/two-sum-dex.js",
    caseResults: [{ testOrdinal: 1, verdictCode: "WA", timeMs: 35, memoryKb: 1024 }],
  },
  {
    id: "sub-galactic-kai",
    userKey: "kai",
    problemSlug: "galactic-network",
    problemVersion: 2,
    languageCode: "cpp17",
    verdictCode: "MANUAL_PENDING",
    status: SubmissionStatus.MANUAL_PENDING,
    requiresManualReview: true,
    queuedAt: new Date(submissionBaseTime.getTime() + 120_000),
    sourceCodeRef: "inline://submissions/galactic-kai.cpp",
    metadata: { manualRequestedBy: "Kai" },
    caseResults: [],
  },
  {
    id: "sub-interval-curator",
    userKey: "curatorTwo",
    problemSlug: "interval-maestro",
    problemVersion: 1,
    languageCode: "cpp17",
    verdictCode: null,
    status: SubmissionStatus.RETRYING,
    queuedAt: new Date(submissionBaseTime.getTime() + 180_000),
    startedAt: new Date(submissionBaseTime.getTime() + 185_000),
    sourceCodeRef: "inline://submissions/interval-jo.cpp",
    metadata: { lastError: "container exited unexpectedly" },
    caseResults: [],
  },
  {
    id: "sub-contest-lena",
    userKey: "lena",
    problemSlug: "galactic-network",
    problemVersion: 2,
    languageCode: "python3",
    verdictCode: "MANUAL_ACCEPTED",
    status: SubmissionStatus.SUCCEEDED,
    requiresManualReview: true,
    manualReviewerKey: "curatorOne",
    manualReviewedAt: new Date(submissionBaseTime.getTime() + 400_000),
    manualScore: 85,
    manualNotes: "Great approach, minimal edge handling tweaks suggested.",
    queuedAt: new Date(submissionBaseTime.getTime() + 240_000),
    startedAt: new Date(submissionBaseTime.getTime() + 250_000),
    finishedAt: new Date(submissionBaseTime.getTime() + 360_000),
    score: 85,
    contestSlug: contestSeed.slug,
    metadata: { contestRun: true, manualNotes: "Accepted with strong explanation" },
    sourceCodeRef: "inline://submissions/galactic-lena.py",
    caseResults: [],
  },
];

function contentHash(...parts: Array<string | number>) {
  return createHash("sha256").update(parts.join(":")).digest("hex");
}

async function main() {
  console.info("\n🌱 Seeding OpenSolve core domain...");

  const defaultPasswordHash = await hashPassword("Opensolve123!");
  const userMap = new Map<string, Awaited<ReturnType<typeof prisma.user.upsert>>>();

  for (const userSeed of userSeeds) {
    const emailFields = buildProtectedEmailFields(userSeed.email);
    const user = await prisma.user.upsert({
      where: { email: userSeed.email },
      update: {
        name: userSeed.name,
        handle: userSeed.handle,
        role: userSeed.role,
        status: userSeed.status,
        country: userSeed.country,
        timezone: userSeed.timezone,
        bio: userSeed.bio,
        shareAcceptedCode: userSeed.shareAcceptedCode ?? false,
        showOnLeaderboard: userSeed.showOnLeaderboard ?? true,
        showCountry: userSeed.showCountry ?? true,
        showSocials: userSeed.showSocials ?? true,
        socialGithub: userSeed.socials?.github ?? null,
        socialLinkedin: userSeed.socials?.linkedin ?? null,
        socialTwitter: userSeed.socials?.twitter ?? null,
        socialWebsite: userSeed.socials?.website ?? null,
        emailHash: emailFields.emailHash,
        emailEncrypted: emailFields.emailEncrypted,
      },
      create: {
        email: userSeed.email,
        emailHash: emailFields.emailHash,
        emailEncrypted: emailFields.emailEncrypted,
        name: userSeed.name,
        handle: userSeed.handle,
        role: userSeed.role,
        status: userSeed.status,
        country: userSeed.country,
        timezone: userSeed.timezone,
        bio: userSeed.bio,
        shareAcceptedCode: userSeed.shareAcceptedCode ?? false,
        showOnLeaderboard: userSeed.showOnLeaderboard ?? true,
        showCountry: userSeed.showCountry ?? true,
        showSocials: userSeed.showSocials ?? true,
        socialGithub: userSeed.socials?.github ?? null,
        socialLinkedin: userSeed.socials?.linkedin ?? null,
        socialTwitter: userSeed.socials?.twitter ?? null,
        socialWebsite: userSeed.socials?.website ?? null,
        hashedPassword: defaultPasswordHash,
      },
    });

    await prisma.userStats.upsert({
      where: { userId: user.id },
      update: {
        ...userSeed.stats,
        updatedById: user.id,
      },
      create: {
        userId: user.id,
        ...userSeed.stats,
        createdById: user.id,
        updatedById: user.id,
      },
    });

    userMap.set(userSeed.key, user);
  }

  const adminUser = userMap.get("admin");
  if (!adminUser) {
    throw new Error("Admin user missing from seeds");
  }

  console.info("✅ Users + stats ready");

  const difficultyMap = new Map<string, { id: string }>();
  for (const diff of difficultySeeds) {
    const difficulty = await prisma.difficulty.upsert({
      where: { code: diff.code },
      update: {
        name: diff.name,
        weight: diff.weight,
        description: diff.description,
        updatedById: adminUser.id,
      },
      create: {
        code: diff.code,
        name: diff.name,
        weight: diff.weight,
        description: diff.description,
        createdById: adminUser.id,
        updatedById: adminUser.id,
      },
    });
    difficultyMap.set(diff.code, { id: difficulty.id });
  }

  const languageMap = new Map<string, { code: string; displayName: string }>();
  for (const language of languageSeeds) {
    const record = await prisma.language.upsert({
      where: { code: language.code },
      update: {
        displayName: language.displayName,
        compileCmd: language.compileCmd,
        runCmd: language.runCmd,
        timeMultiplier: language.timeMultiplier,
        memoryCeilingMb: language.memoryCeilingMb,
        fileExtension: language.fileExtension,
        sandboxProfile: language.sandboxProfile,
        updatedById: adminUser.id,
      },
      create: {
        ...language,
        createdById: adminUser.id,
        updatedById: adminUser.id,
      },
    });
    languageMap.set(language.code, { code: record.code, displayName: record.displayName });
  }

  for (const verdict of verdictSeeds) {
    await prisma.verdict.upsert({
      where: { code: verdict.code },
      update: {
        label: verdict.label,
        rank: verdict.rank,
        updatedById: adminUser.id,
      },
      create: {
        ...verdict,
        createdById: adminUser.id,
        updatedById: adminUser.id,
      },
    });
  }

  const tagMap = new Map<string, { id: string }>();
  for (const tag of tagSeeds) {
    const record = await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {
        name: tag.name,
        category: tag.category,
        isFeatured: tag.isFeatured,
        updatedById: adminUser.id,
      },
      create: {
        ...tag,
        createdById: adminUser.id,
        updatedById: adminUser.id,
      },
    });
    tagMap.set(tag.slug, { id: record.id });
  }

  const companyMap = new Map<string, { id: string }>();
  for (const company of companySeeds) {
    const record = await prisma.company.upsert({
      where: { slug: company.slug },
      update: {
        name: company.name,
        isHidden: company.isHidden,
        updatedById: adminUser.id,
      },
      create: {
        ...company,
        createdById: adminUser.id,
        updatedById: adminUser.id,
      },
    });
    companyMap.set(company.slug, { id: record.id });
  }

  const badgeMap = new Map<string, { id: string }>();
  for (const badge of badgeSeeds) {
    const record = await prisma.badge.upsert({
      where: { slug: badge.slug },
      update: {
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        criteria: badge.criteria,
        isHidden: badge.isHidden,
        updatedById: adminUser.id,
      },
      create: {
        ...badge,
        createdById: adminUser.id,
        updatedById: adminUser.id,
      },
    });
    badgeMap.set(badge.slug, { id: record.id });
  }

  console.info("✅ Reference tables seeded");

  const problemMap = new Map<string, { problemId: string; versionId: string }>();
  const tagUsage = new Map<string, number>();
  const companyUsage = new Map<string, number>();

  for (const seed of problemSeeds) {
    const author = userMap.get(seed.authorKey);
    const createdBy = userMap.get(seed.createdByKey) ?? adminUser;
    const difficulty = difficultyMap.get(seed.difficulty);
    if (!author || !difficulty) {
      throw new Error(`Missing author or difficulty for problem ${seed.slug}`);
    }

    const problem = await prisma.problem.upsert({
      where: { slug: seed.slug },
      update: {
        state: seed.state,
        visibility: seed.visibility,
        judgeMode: seed.judgeMode ?? ProblemJudgeMode.AUTO,
        authorId: author.id,
        difficultyId: difficulty.id,
        updatedById: createdBy.id,
      },
      create: {
        slug: seed.slug,
        state: seed.state,
        visibility: seed.visibility,
        judgeMode: seed.judgeMode ?? ProblemJudgeMode.AUTO,
        authorId: author.id,
        difficultyId: difficulty.id,
        createdById: createdBy.id,
        updatedById: createdBy.id,
      },
    });

    const versionHash = contentHash(seed.slug, seed.version.versionNumber, seed.version.statement);
    const version = await prisma.problemVersion.upsert({
      where: {
        problemId_versionNumber: {
          problemId: problem.id,
          versionNumber: seed.version.versionNumber,
        },
      },
      update: {
        title: seed.version.title,
        statement: seed.version.statement,
        constraints: seed.version.constraints,
        hints: seed.version.hints,
        editorial: seed.version.editorial,
        samples: seed.version.samples,
        dataHash: versionHash,
        updatedById: createdBy.id,
      },
      create: {
        problemId: problem.id,
        versionNumber: seed.version.versionNumber,
        title: seed.version.title,
        statement: seed.version.statement,
        constraints: seed.version.constraints,
        hints: seed.version.hints,
        editorial: seed.version.editorial,
        samples: seed.version.samples,
        dataHash: versionHash,
        createdById: createdBy.id,
        updatedById: createdBy.id,
      },
    });

    await prisma.testCase.deleteMany({ where: { problemVersionId: version.id } });
    if (seed.version.testCases.length > 0) {
      await prisma.testCase.createMany({
        data: seed.version.testCases.map((testCase) => ({
          problemVersionId: version.id,
          kind: testCase.kind,
          ordinal: testCase.ordinal,
          inputBlobRef: testCase.input,
          outputBlobRef: testCase.output,
          inputData: testCase.input,
          outputData: testCase.output,
          checksum: contentHash(seed.slug, testCase.ordinal, testCase.input, testCase.output),
          timeLimitMs: testCase.timeLimitMs,
          memoryLimitMb: testCase.memoryLimitMb,
          strength:
            testCase.kind === TestCaseKind.SAMPLE ? 0 : Math.max(testCase.strength ?? 0, 0),
          createdById: createdBy.id,
          updatedById: createdBy.id,
        })),
      });
    }

    if (seed.state === ProblemState.PUBLISHED) {
      await prisma.problem.update({
        where: { id: problem.id },
        data: { currentVersionId: version.id },
      });
    }

    await prisma.problemTag.deleteMany({ where: { problemId: problem.id } });
    const problemTagData = seed.tags
      .map((slug) => tagMap.get(slug)?.id)
      .filter(Boolean)
      .map((tagId) => ({
        problemId: problem.id,
        tagId: tagId as string,
        createdById: createdBy.id,
        updatedById: createdBy.id,
      }));
    if (problemTagData.length > 0) {
      await prisma.problemTag.createMany({ data: problemTagData });
    }

    problemTagData.forEach((record) => {
      const current = tagUsage.get(record.tagId) ?? 0;
      tagUsage.set(record.tagId, current + 1);
    });

    await prisma.problemCompany.deleteMany({ where: { problemId: problem.id } });
    const companyData = seed.companies
      .map((slug) => companyMap.get(slug)?.id)
      .filter(Boolean)
      .map((companyId) => ({
        problemId: problem.id,
        companyId: companyId as string,
        createdById: createdBy.id,
        updatedById: createdBy.id,
      }));
    if (companyData.length > 0) {
      await prisma.problemCompany.createMany({ data: companyData });
    }
    companyData.forEach((record) => {
      const current = companyUsage.get(record.companyId) ?? 0;
      companyUsage.set(record.companyId, current + 1);
    });

    await prisma.problemCurator.deleteMany({ where: { problemId: problem.id } });
    if (seed.extraCurators && seed.extraCurators.length > 0) {
      const curatorData: Array<{ problemId: string; userId: string; createdById: string; updatedById: string }> =
        [];
      for (const key of new Set(seed.extraCurators)) {
        const curator = userMap.get(key);
        if (!curator || curator.id === author.id) {
          continue;
        }
        curatorData.push({
          problemId: problem.id,
          userId: curator.id,
          createdById: createdBy.id,
          updatedById: createdBy.id,
        });
      }
      if (curatorData.length > 0) {
        await prisma.problemCurator.createMany({ data: curatorData, skipDuplicates: true });
      }
    }

    await prisma.problemLanguage.deleteMany({ where: { problemId: problem.id } });
    const languageConfig: Array<{ code: string; stub?: string }> =
      seed.languages && seed.languages.length > 0
        ? seed.languages
        : languageSeeds.map((entry) => ({ code: entry.code }));
    const languageData = languageConfig
      .map((config) => {
        if (!languageMap.has(config.code)) {
          return null;
        }
        return {
          problemId: problem.id,
          languageCode: config.code,
          codeStub: config.stub ?? getDefaultCodeStub(config.code),
          createdById: createdBy.id,
          updatedById: createdBy.id,
        };
      })
      .filter(Boolean) as Array<{
      problemId: string;
      languageCode: string;
      codeStub: string;
      createdById: string;
      updatedById: string;
    }>;
    if (languageData.length === 0) {
      throw new Error(`No language assignments resolved for ${seed.slug}`);
    }
    await prisma.problemLanguage.createMany({ data: languageData });

    await prisma.problemStats.upsert({
      where: { problemId: problem.id },
      update: {
        acceptedCount: seed.stats.acceptedCount,
        submissionCount: seed.stats.submissionCount,
        favoriteCount: seed.stats.favoriteCount,
        acceptanceRate: seed.stats.acceptanceRate,
        updatedById: createdBy.id,
      },
      create: {
        problemId: problem.id,
        ...seed.stats,
        createdById: createdBy.id,
        updatedById: createdBy.id,
      },
    });

    problemMap.set(seed.slug, { problemId: problem.id, versionId: version.id });
  }

  console.info("✅ Problems, versions, test cases, and stats ready");

  for (const seed of proposalSeeds) {
    const author = userMap.get(seed.authorKey);
    if (!author) {
      continue;
    }
    const reviewer = seed.reviewerKey ? userMap.get(seed.reviewerKey ?? "") : null;
    await prisma.problemProposal.upsert({
      where: { slug: seed.slug },
      update: {
        title: seed.title,
        intendedDifficulty: seed.intendedDifficulty,
        statement: seed.statement,
        samples: seed.samples,
        status: seed.status,
        reviewerId: reviewer?.id ?? null,
      },
      create: {
        slug: seed.slug,
        title: seed.title,
        intendedDifficulty: seed.intendedDifficulty,
        statement: seed.statement,
        samples: seed.samples,
        status: seed.status,
        authorId: author.id,
        reviewerId: reviewer?.id ?? null,
        originalityConfirmed: true,
      },
    });
  }

  console.info("✅ Proposal seeds ready");

  for (const [slug, tagRecord] of tagMap.entries()) {
    await prisma.tagStats.upsert({
      where: { tagId: tagRecord.id },
      update: {
        problemCount: tagUsage.get(tagRecord.id) ?? 0,
        solvedByCount: Math.max(0, (tagUsage.get(tagRecord.id) ?? 0) * 3),
        updatedById: adminUser.id,
      },
      create: {
        tagId: tagRecord.id,
        problemCount: tagUsage.get(tagRecord.id) ?? 0,
        solvedByCount: Math.max(0, (tagUsage.get(tagRecord.id) ?? 0) * 3),
        createdById: adminUser.id,
        updatedById: adminUser.id,
      },
    });
  }

  for (const [slug, companyRecord] of companyMap.entries()) {
    await prisma.companyStats.upsert({
      where: { companyId: companyRecord.id },
      update: {
        problemCount: companyUsage.get(companyRecord.id) ?? 0,
        updatedById: adminUser.id,
      },
      create: {
        companyId: companyRecord.id,
        problemCount: companyUsage.get(companyRecord.id) ?? 0,
        createdById: adminUser.id,
        updatedById: adminUser.id,
      },
    });
  }

  for (const discussionSeed of discussionSeeds) {
    const author = userMap.get(discussionSeed.authorKey);
    const problem = problemMap.get(discussionSeed.problemSlug);
    if (!author || !problem) {
      throw new Error(`Missing discussion dependencies for ${discussionSeed.id}`);
    }

    await prisma.discussion.upsert({
      where: { id: discussionSeed.id },
      update: {
        content: discussionSeed.content,
        updatedById: author.id,
      },
      create: {
        id: discussionSeed.id,
        problemId: problem.problemId,
        authorId: author.id,
        parentId: discussionSeed.parentId,
        content: discussionSeed.content,
        createdById: author.id,
        updatedById: author.id,
      },
    });
  }

  await prisma.vote.deleteMany({
    where: { discussionId: { in: discussionSeeds.map((d) => d.id) } },
  });
  if (voteSeeds.length > 0) {
    await prisma.vote.createMany({
      data: voteSeeds.map((vote) => {
        const user = userMap.get(vote.userKey);
        if (!user) {
          throw new Error(`Missing user for vote`);
        }
        return {
          discussionId: vote.discussionId,
          userId: user.id,
          value: vote.value,
          createdById: user.id,
          updatedById: user.id,
        };
      }),
      skipDuplicates: true,
    });
  }

  const contest = await prisma.contest.upsert({
    where: { slug: contestSeed.slug },
    update: {
      name: contestSeed.name,
      description: contestSeed.description,
      type: contestSeed.type,
      state: contestSeed.state,
      visibility: contestSeed.visibility,
      startsAt: contestSeed.startsAt,
      endsAt: contestSeed.endsAt,
      freezeAt: contestSeed.freezeAt,
      rules: contestSeed.rules,
      isRated: contestSeed.isRated,
      editorialReleaseAt: contestSeed.editorialReleaseAt,
      settings: contestSeed.settings ?? json(defaultContestSettings),
      updatedById: adminUser.id,
    },
    create: {
      slug: contestSeed.slug,
      name: contestSeed.name,
      description: contestSeed.description,
      type: contestSeed.type,
      state: contestSeed.state,
      visibility: contestSeed.visibility,
      startsAt: contestSeed.startsAt,
      endsAt: contestSeed.endsAt,
      freezeAt: contestSeed.freezeAt,
      rules: contestSeed.rules,
      isRated: contestSeed.isRated,
      editorialReleaseAt: contestSeed.editorialReleaseAt,
      settings: contestSeed.settings ?? json(defaultContestSettings),
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
  });

  await prisma.contestProblem.deleteMany({ where: { contestId: contest.id } });
  await prisma.contestProblem.createMany({
    data: contestSeed.problems.map((problem) => {
      const problemRecord = problemMap.get(problem.problemSlug);
      if (!problemRecord) {
        throw new Error(`Missing problem for contest seed ${problem.problemSlug}`);
      }
      return {
        contestId: contest.id,
        problemId: problemRecord.problemId,
        versionId: problemRecord.versionId,
        label: problem.label,
        order: problem.order,
        points: problem.points,
        settings: json({}),
        createdById: adminUser.id,
        updatedById: adminUser.id,
      };
    }),
  });

  await prisma.contestRegistration.deleteMany({ where: { contestId: contest.id } });
  await prisma.contestRegistration.createMany({
    data: contestSeed.registrations.map((registration) => {
      const user = userMap.get(registration.userKey);
      if (!user) {
        throw new Error("Missing user for contest registration");
      }
      return {
        contestId: contest.id,
        userId: user.id,
        isVirtual: registration.isVirtual ?? false,
        status: registration.status ?? ContestRegistrationStatus.REGISTERED,
        isDisqualified: registration.isDisqualified ?? false,
        disqualifiedAt: null,
        dqReason: null,
        deviceFingerprint: null,
        ipHash: null,
        inviteCode: null,
        createdById: user.id,
        updatedById: user.id,
      };
    }),
    skipDuplicates: true,
  });

  for (const award of badgeAwardSeeds) {
    const badge = badgeMap.get(award.badgeSlug);
    const user = userMap.get(award.userKey);
    if (!badge || !user) {
      throw new Error("Missing badge award dependency");
    }
    await prisma.badgeAward.upsert({
      where: {
        badgeId_userId: {
          badgeId: badge.id,
          userId: user.id,
        },
      },
      update: {
        source: award.source,
        metadata: award.metadata,
        updatedById: adminUser.id,
      },
      create: {
        badgeId: badge.id,
        userId: user.id,
        source: award.source,
        metadata: award.metadata,
        createdById: adminUser.id,
        updatedById: adminUser.id,
      },
    });
  }

  const contestIdMap = new Map<string, string>([[contestSeed.slug, contest.id]]);

  for (const submissionSeed of submissionSeeds) {
    const user = userMap.get(submissionSeed.userKey);
    const problem = problemMap.get(submissionSeed.problemSlug);
    const manualReviewer = submissionSeed.manualReviewerKey
      ? userMap.get(submissionSeed.manualReviewerKey)
      : null;
    if (submissionSeed.manualReviewerKey && !manualReviewer) {
      throw new Error(`Missing manual reviewer ${submissionSeed.manualReviewerKey}`);
    }
    if (!user || !problem) {
      throw new Error(`Missing user/problem for submission ${submissionSeed.id}`);
    }

    const contestId = submissionSeed.contestSlug
      ? contestIdMap.get(submissionSeed.contestSlug)
      : undefined;
    if (submissionSeed.contestSlug && !contestId) {
      throw new Error(`Contest ${submissionSeed.contestSlug} not seeded`);
    }

    const submission = await prisma.submission.upsert({
      where: { id: submissionSeed.id },
      update: {
        languageCode: submissionSeed.languageCode,
        verdictCode: submissionSeed.verdictCode ?? undefined,
        status: submissionSeed.status,
        requiresManualReview: submissionSeed.requiresManualReview ?? false,
        manualReviewerId: manualReviewer?.id ?? null,
        manualReviewedAt: submissionSeed.manualReviewedAt,
        manualNotes: submissionSeed.manualNotes ?? undefined,
        manualScore: submissionSeed.manualScore,
        manualDueAt: submissionSeed.manualDueAt,
        score: submissionSeed.score,
        timeUsedMs: submissionSeed.timeUsedMs,
        memoryUsedKb: submissionSeed.memoryUsedKb,
        judgeNodeId: submissionSeed.judgeNodeId,
        metadata: submissionSeed.metadata,
        contestId: contestId,
        startedAt: submissionSeed.startedAt,
        finishedAt: submissionSeed.finishedAt,
        updatedById: user.id,
      },
      create: {
        id: submissionSeed.id,
        userId: user.id,
        problemId: problem.problemId,
        problemVersionId: problem.versionId,
        languageCode: submissionSeed.languageCode,
        verdictCode: submissionSeed.verdictCode ?? undefined,
        status: submissionSeed.status,
        requiresManualReview: submissionSeed.requiresManualReview ?? false,
        manualReviewerId: manualReviewer?.id ?? null,
        manualReviewedAt: submissionSeed.manualReviewedAt,
        manualNotes: submissionSeed.manualNotes ?? undefined,
        manualScore: submissionSeed.manualScore,
        manualDueAt: submissionSeed.manualDueAt,
        sourceCodeRef: submissionSeed.sourceCodeRef,
        codeHash: contentHash(submissionSeed.id, user.id, submissionSeed.languageCode),
        queuedAt: submissionSeed.queuedAt,
        startedAt: submissionSeed.startedAt,
        finishedAt: submissionSeed.finishedAt,
        score: submissionSeed.score,
        timeUsedMs: submissionSeed.timeUsedMs,
        memoryUsedKb: submissionSeed.memoryUsedKb,
        judgeNodeId: submissionSeed.judgeNodeId,
        metadata: submissionSeed.metadata,
        contestId: contestId,
        createdById: user.id,
        updatedById: user.id,
      },
    });

    await prisma.submissionCaseResult.deleteMany({ where: { submissionId: submission.id } });
    if (submissionSeed.caseResults.length > 0) {
      await prisma.submissionCaseResult.createMany({
        data: submissionSeed.caseResults.map((result) => ({
          submissionId: submission.id,
          testOrdinal: result.testOrdinal,
          verdictCode: result.verdictCode,
          timeMs: result.timeMs,
          memoryKb: result.memoryKb,
          stderrRef: undefined,
          createdById: adminUser.id,
          updatedById: adminUser.id,
        })),
      });
    }
  }

  console.info("✅ Submissions + case results ready");

  const leaderboard = await prisma.leaderboardSnapshot.upsert({
    where: {
      window_periodStart: {
        window: leaderboardSeed.window,
        periodStart: leaderboardSeed.periodStart,
      },
    },
    update: {
      periodEnd: leaderboardSeed.periodEnd,
      updatedById: adminUser.id,
    },
    create: {
      window: leaderboardSeed.window,
      periodStart: leaderboardSeed.periodStart,
      periodEnd: leaderboardSeed.periodEnd,
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
  });

  await prisma.leaderboardEntry.deleteMany({ where: { snapshotId: leaderboard.id } });
  await prisma.leaderboardEntry.createMany({
    data: leaderboardSeed.entries.map((entry) => {
      const user = userMap.get(entry.userKey);
      if (!user) {
        throw new Error("Missing user for leaderboard entry");
      }
      return {
        snapshotId: leaderboard.id,
        rank: entry.rank,
        userId: user.id,
        score: entry.score,
        solved: entry.solved,
        timePenalty: entry.timePenalty,
        createdById: adminUser.id,
        updatedById: adminUser.id,
      };
    }),
  });

  console.info("✅ Contest + leaderboard seeded");

  console.info("Seeding admin control surfaces...");
  const systemSettingSeeds: Array<{
    key: string;
    label: string;
    description: string;
    value: Prisma.InputJsonValue;
  }> = [
    {
      key: "maintenance_mode",
      label: "Maintenance Mode",
      description: "Gate the platform behind a banner and optional read-only mode.",
      value: {
        enabled: false,
        message: "",
        allowSubmissions: true,
        lastToggledBy: adminUser?.handle ?? "admin",
      },
    },
    {
      key: "submission_limits",
      label: "Submission Limits",
      description: "Global rate limit overrides for Judge capacity planning.",
      value: {
        perMinute: 25,
        perHour: 250,
        contestMultiplier: 2,
      },
    },
  ];

  for (const setting of systemSettingSeeds) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {
        label: setting.label,
        description: setting.description,
        value: setting.value,
        updatedById: adminUser?.id,
      },
      create: {
        key: setting.key,
        label: setting.label,
        description: setting.description,
        value: setting.value,
        createdById: adminUser?.id,
        updatedById: adminUser?.id,
      },
    });
  }

  const featureFlagSeeds: Array<{
    key: string;
    name: string;
    description: string;
    enabled: boolean;
    rolloutPercentage: number;
    targeting: Prisma.InputJsonValue | null;
  }> = [
    {
      key: "editor.v2",
      name: "Monaco Editor v2",
      description: "Ships the new Monaco-based solving experience.",
      enabled: true,
      rolloutPercentage: 40,
      targeting: {
        roles: ["ADMIN", "PROBLEM_CURATOR"],
      },
    },
    {
      key: "discussions.trails",
      name: "Approach Trails",
      description: "Enables the collaborative solution trail explorer.",
      enabled: true,
      rolloutPercentage: 65,
      targeting: {
        minimumSolved: 5,
      },
    },
    {
      key: "judge.lowpower-mode",
      name: "Judge Low Power Mode",
      description: "Slow down the queue when infrastructure is constrained.",
      enabled: false,
      rolloutPercentage: 0,
      targeting: null,
    },
  ];

  for (const flag of featureFlagSeeds) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {
        name: flag.name,
        description: flag.description,
        enabled: flag.enabled,
        rolloutPercentage: flag.rolloutPercentage,
        targeting: flag.targeting as Prisma.InputJsonValue,
        updatedById: adminUser?.id,
      },
      create: {
        key: flag.key,
        name: flag.name,
        description: flag.description,
        enabled: flag.enabled,
        rolloutPercentage: flag.rolloutPercentage,
        targeting: flag.targeting as Prisma.InputJsonValue,
        createdById: adminUser?.id,
        updatedById: adminUser?.id,
      },
    });
  }

  const incidentSeeds: Array<{
    title: string;
    summary: string;
    status: IncidentStatus;
    severity: IncidentSeverity;
    impact?: string;
    timeline?: Prisma.InputJsonValue;
    resolvedAt?: Date | null;
  }> = [
    {
      title: "Judge backlog spike",
      summary: "Submissions queue exceeded SLA; load-shedding enabled.",
      status: IncidentStatus.INVESTIGATING,
      severity: IncidentSeverity.SEV2,
      impact: "Average wait time increased to 8 minutes.",
      timeline: [
        { at: new Date(Date.now() - 1000 * 60 * 45), note: "Alert fired for queue depth > 500." },
        { at: new Date(Date.now() - 1000 * 60 * 20), note: "Scaled runners + enabled low power mode." },
      ] as Prisma.InputJsonValue,
    },
    {
      title: "Payment provider webhook delays",
      summary: "Webhooks delayed, contest registrations pending review.",
      status: IncidentStatus.MONITORING,
      severity: IncidentSeverity.SEV3,
      impact: "Sign-ups succeeds but badges delayed by up to 15 minutes.",
      timeline: [
        { at: new Date(Date.now() - 1000 * 60 * 120), note: "Provider incident acknowledged." },
        { at: new Date(Date.now() - 1000 * 60 * 70), note: "Backfill job executed." },
      ] as Prisma.InputJsonValue,
      resolvedAt: null,
    },
  ];

  for (const incident of incidentSeeds) {
    await prisma.incident.upsert({
      where: { title: incident.title },
      update: {
        summary: incident.summary,
        status: incident.status,
        severity: incident.severity,
        impact: incident.impact,
        timeline: incident.timeline as Prisma.InputJsonValue,
        resolvedAt: incident.resolvedAt ?? undefined,
        updatedById: adminUser?.id,
      },
      create: {
        title: incident.title,
        summary: incident.summary,
        status: incident.status,
        severity: incident.severity,
        impact: incident.impact,
        timeline: incident.timeline as Prisma.InputJsonValue,
        resolvedAt: incident.resolvedAt ?? undefined,
        createdById: adminUser?.id,
        updatedById: adminUser?.id,
      },
    });
  }

  console.info("✅ Admin control surfaces seeded");

  console.info("\nSeeding complete ✅\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
