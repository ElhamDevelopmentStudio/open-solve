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
    filterMetadata: "problems.filterMetadata" as ProcedureName,
  },
} as const;

export type QueryTag = "problems" | "problemDetail" | "tags" | "session";

export const queryTagMap: Record<QueryTag, ProcedureName[]> = {
  problems: [trpcProcedures.problems.list],
  problemDetail: [trpcProcedures.problems.list],
  tags: [trpcProcedures.problems.filterMetadata],
  session: [trpcProcedures.auth.getSession, trpcProcedures.auth.getSessions],
};
