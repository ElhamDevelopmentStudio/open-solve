import { revalidateTag } from "next/cache";
import { cacheTags } from "@/lib/cache/tags";

type ProblemTaxonomy = {
  slug: string;
  difficulty?: { code: string | null } | null;
  tags?: Array<{ tag: { slug: string } }>;
};

const DEFAULT_CACHE_PROFILE = "default";

export function revalidateProblemContent(problem: ProblemTaxonomy) {
  revalidateTag(cacheTags.problemList, DEFAULT_CACHE_PROFILE);
  revalidateTag(cacheTags.problemFilters, DEFAULT_CACHE_PROFILE);
  revalidateTag(cacheTags.problemDetail(problem.slug), DEFAULT_CACHE_PROFILE);

  const difficultyCode = problem.difficulty?.code;
  if (difficultyCode) {
    revalidateTag(cacheTags.difficulty(difficultyCode), DEFAULT_CACHE_PROFILE);
  }

  for (const tagEntry of problem.tags ?? []) {
    revalidateTag(cacheTags.tag(tagEntry.tag.slug), DEFAULT_CACHE_PROFILE);
  }
}
