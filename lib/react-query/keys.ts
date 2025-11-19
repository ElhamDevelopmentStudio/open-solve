import type { QueryKey } from "@tanstack/react-query";
import { stableHash } from "@/lib/utils/stable-hash";

export type ProcedureName = `${string}.${string}`;

const splitProcedure = (procedure: ProcedureName) => procedure.split(".");

export function buildTrpcQueryKey(
  procedure: ProcedureName,
  options?: {
    input?: unknown;
    type?: "query" | "infinite";
  },
): QueryKey {
  const path = splitProcedure(procedure);
  const meta: Record<string, unknown> = {};

  if (typeof options?.input !== "undefined") {
    meta.input = options.input;
  }

  if (options?.type && options.type !== "query") {
    meta.type = options.type;
  }

  return Object.keys(meta).length > 0 ? [path, meta] : [path];
}

export function describeQueryKey(
  procedure: ProcedureName,
  options?: {
    input?: unknown;
    type?: "query" | "infinite";
  },
) {
  const base: Array<string> = ["trpc", procedure];
  if (typeof options?.input === "undefined") {
    return options?.type === "infinite" ? [...base, "infinite"] : base;
  }

  const hashedInput = stableHash(options.input);
  return options?.type === "infinite" ? [...base, hashedInput, "infinite"] : [...base, hashedInput];
}

export function matchesProcedure(queryKey: QueryKey, procedure: ProcedureName) {
  if (!Array.isArray(queryKey)) {
    return false;
  }

  const root = queryKey[0];
  if (!Array.isArray(root)) {
    return false;
  }

  return root.join(".") === procedure;
}

export const trpcProcedures = {
  auth: {
    getSession: "auth.getSession" as ProcedureName,
    getSessions: "auth.getSessions" as ProcedureName,
  },
  problems: {
    list: "problems.list" as ProcedureName,
    detail: "problems.detail" as ProcedureName,
    filterMetadata: "problems.filterMetadata" as ProcedureName,
  },
  proposals: {
    listMine: "proposals.listMine" as ProcedureName,
    staffList: "proposals.staffList" as ProcedureName,
    get: "proposals.get" as ProcedureName,
  },
  staff: {
    problems: {
      list: "staff.problems.list" as ProcedureName,
      get: "staff.problems.get" as ProcedureName,
    },
    proposals: {
      list: "proposals.staffList" as ProcedureName,
    },
  },
  submissions: {
    runSample: "submissions.runSample" as ProcedureName,
    create: "submissions.create" as ProcedureName,
    get: "submissions.get" as ProcedureName,
    listMine: "submissions.listMine" as ProcedureName,
    listByProblem: "submissions.listByProblem" as ProcedureName,
    getShare: "submissions.getShare" as ProcedureName,
    filters: "submissions.filters" as ProcedureName,
    saveDraft: "submissions.saveDraft" as ProcedureName,
    getDrafts: "submissions.getDrafts" as ProcedureName,
  },
  profile: {
    detail: "profile.detail" as ProcedureName,
  },
  leaderboard: {
    overview: "leaderboard.overview" as ProcedureName,
    global: "leaderboard.global" as ProcedureName,
    difficulty: "leaderboard.difficulty" as ProcedureName,
    tag: "leaderboard.tag" as ProcedureName,
  },
  discussions: {
    listByProblem: "discussions.listByProblem" as ProcedureName,
    listGlobal: "discussions.listGlobal" as ProcedureName,
    thread: "discussions.thread" as ProcedureName,
    replies: "discussions.replies" as ProcedureName,
  },
  editorials: {
    getByProblem: "editorials.getByProblem" as ProcedureName,
  },
  trails: {
    getForProblem: "trails.getForProblem" as ProcedureName,
  },
  contests: {
    overview: "contests.overview" as ProcedureName,
    detail: "contests.detail" as ProcedureName,
    standings: "contests.standings" as ProcedureName,
    clarifications: "contests.clarifications" as ProcedureName,
  },
  admin: {
    dashboard: {
      overview: "admin.dashboard.overview" as ProcedureName,
    },
    users: {
      list: "admin.users.list" as ProcedureName,
      detail: "admin.users.detail" as ProcedureName,
    },
    problems: {
      list: "admin.problems.list" as ProcedureName,
    },
    submissions: {
      list: "admin.submissions.list" as ProcedureName,
    },
    system: {
      overview: "admin.system.overview" as ProcedureName,
    },
    flags: {
      list: "admin.flags.list" as ProcedureName,
    },
    audit: {
      logs: "admin.audit.logs" as ProcedureName,
      incidents: "admin.audit.incidents" as ProcedureName,
    },
  },
} as const;

export type QueryTag =
  | "problems"
  | "problemDetail"
  | "tags"
  | "session"
  | "staffProblems"
  | "proposals"
  | "submissions"
  | "submissionDrafts"
  | "profile"
  | "leaderboard"
  | "discussions"
  | "editorials"
  | "trails"
  | "contests";

export const queryTagMap: Record<QueryTag, ProcedureName[]> = {
  problems: [trpcProcedures.problems.list],
  problemDetail: [trpcProcedures.problems.detail],
  tags: [trpcProcedures.problems.filterMetadata],
  session: [trpcProcedures.auth.getSession, trpcProcedures.auth.getSessions],
  staffProblems: [trpcProcedures.staff.problems.list, trpcProcedures.staff.problems.get],
  proposals: [trpcProcedures.proposals.listMine, trpcProcedures.proposals.staffList],
  submissions: [
    trpcProcedures.submissions.listMine,
    trpcProcedures.submissions.listByProblem,
    trpcProcedures.submissions.get,
    trpcProcedures.submissions.filters,
  ],
  submissionDrafts: [trpcProcedures.submissions.getDrafts],
  profile: [trpcProcedures.profile.detail],
  leaderboard: [
    trpcProcedures.leaderboard.overview,
    trpcProcedures.leaderboard.global,
    trpcProcedures.leaderboard.difficulty,
    trpcProcedures.leaderboard.tag,
  ],
  discussions: [
    trpcProcedures.discussions.listByProblem,
    trpcProcedures.discussions.listGlobal,
    trpcProcedures.discussions.thread,
    trpcProcedures.discussions.replies,
  ],
  editorials: [trpcProcedures.editorials.getByProblem],
  trails: [trpcProcedures.trails.getForProblem],
  contests: [
    trpcProcedures.contests.overview,
    trpcProcedures.contests.detail,
    trpcProcedures.contests.standings,
    trpcProcedures.contests.clarifications,
  ],
};
