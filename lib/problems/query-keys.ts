import type { ProblemSearchParams } from "@/lib/problems/search-params";

export const problemKeys = {
  all: ["problems"] as const,
  list: (filters: ProblemSearchParams) =>
    [...problemKeys.all, "list", filters] as const,
  detail: (slug: string) => [...problemKeys.all, "detail", slug] as const,
};
