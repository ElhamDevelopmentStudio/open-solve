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
} as const;

export type QueryTag =
  | "problems"
  | "problemDetail"
  | "tags"
  | "session"
  | "staffProblems"
  | "proposals"
  | "submissions"
  | "submissionDrafts";

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
};
