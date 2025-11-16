export const cacheTags = {
  problemList: "problem:list",
  problemFilters: "problem:filters",
  problemDetail: (identifier: string) => `problem:${identifier}`,
  tag: (slug: string) => `tag:${slug}`,
  difficulty: (level: string) => `difficulty:${level}`,
} as const;
