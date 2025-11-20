import { unstable_cache } from "next/cache";
import { createPublicTRPCCaller } from "@/lib/trpc/server/caller";
import type { ProblemFiltersInput } from "@/lib/trpc/router/problems";
import { cacheTags } from "@/lib/cache/tags";
import { stableHash } from "@/lib/utils/stable-hash";

const PROBLEM_LIST_REVALIDATE_SECONDS = 120;
const PROBLEM_DETAIL_REVALIDATE_SECONDS = 180;
const PROBLEM_FILTERS_REVALIDATE_SECONDS = 300;

export function getCachedProblemList(filters: ProblemFiltersInput) {
  return unstable_cache(
    async () => {
      const caller = await createPublicTRPCCaller();
      return caller.problems.list(filters);
    },
    ["problem-list", stableHash(filters)],
    {
      tags: [
        cacheTags.problemList,
        ...filters.tags.map((tag) => cacheTags.tag(tag)),
        ...filters.difficulty.map((difficulty) => cacheTags.difficulty(difficulty)),
      ],
      revalidate: PROBLEM_LIST_REVALIDATE_SECONDS,
    },
  )();
}

export function getCachedProblemDetail(slug: string) {
  return unstable_cache(
    async () => {
      const caller = await createPublicTRPCCaller();
      return caller.problems.detail({ slug });
    },
    ["problem-detail", slug],
    {
      tags: [cacheTags.problemDetail(slug)],
      revalidate: PROBLEM_DETAIL_REVALIDATE_SECONDS,
    },
  )();
}

export function getCachedProblemFilterMetadata() {
  return unstable_cache(
    async () => {
      const caller = await createPublicTRPCCaller();
      return caller.problems.filterMetadata();
    },
    ["problem-filter-metadata"],
    {
      tags: [cacheTags.problemFilters],
      revalidate: PROBLEM_FILTERS_REVALIDATE_SECONDS,
    },
  )();
}
