const slugify = (input: string) => {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
};

export async function generateUniqueProblemSlug(
  candidate: string,
  exists: (slug: string) => Promise<boolean>,
) {
  const base = slugify(candidate) || "problem";
  let slug = base;
  let counter = 1;
  // eslint-disable-next-line no-constant-condition
  while (await exists(slug)) {
    counter += 1;
    slug = `${base}-${counter}`;
  }
  return slug;
}
