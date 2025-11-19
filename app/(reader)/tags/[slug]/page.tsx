import type { Metadata } from "next";
import {
  renderProblemLibraryPage,
  resolveViewerSessionFlag,
} from "@/components/problems/problem-library-page";

export async function generateMetadata({
  params,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
}): Promise<Metadata> {
  const resolved = await params;
  return {
    title: `Problems tagged #${resolved.slug} | OpenSolve`,
    description: `Browse public problems filtered by the #${resolved.slug} tag.`,
  };
}

export default async function TagProblemsPage({
  params,
  searchParams,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
  searchParams:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, resolvedSearchParams, viewerHasSession] = await Promise.all([
    params,
    searchParams,
    resolveViewerSessionFlag(),
  ]);

  const existing = resolvedSearchParams.tags;
  const existingArray = Array.isArray(existing)
    ? existing
    : typeof existing === "string"
      ? [existing]
      : [];
  const tags = Array.from(new Set([...existingArray, slug]));

  return renderProblemLibraryPage({
    searchParams: {
      ...resolvedSearchParams,
      tags,
    },
    viewerHasSession,
  });
}
