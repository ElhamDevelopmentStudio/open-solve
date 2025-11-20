import type { Metadata } from "next";
import {
  renderProblemLibraryPage,
  resolveViewerSessionFlag,
} from "@/components/problems/problem-library-page";
import { DIFFICULTIES } from "@/lib/problems/constants";
import { notFound } from "next/navigation";

type DifficultyParams = { level: string };

async function resolveDifficultyParams(
  paramsOrPromise: DifficultyParams | Promise<DifficultyParams>,
) {
  return paramsOrPromise instanceof Promise ? await paramsOrPromise : paramsOrPromise;
}

export async function generateMetadata({
  params,
}: {
  params: DifficultyParams | Promise<DifficultyParams>;
}): Promise<Metadata> {
  const resolved = await resolveDifficultyParams(params);
  const level = resolved.level?.toUpperCase();
  if (!level || !DIFFICULTIES.includes(level as (typeof DIFFICULTIES)[number])) {
    return { title: "Problems | OpenSolve" };
  }
  return {
    title: `${level.charAt(0) + level.slice(1).toLowerCase()} problems | OpenSolve`,
    description: `Browse ${level.toLowerCase()} difficulty public problems on OpenSolve.`,
  };
}

export default async function DifficultyProblemsPage({
  params,
  searchParams,
}: {
  params: DifficultyParams | Promise<DifficultyParams>;
  searchParams:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await resolveDifficultyParams(params);
  const level = resolvedParams.level?.toUpperCase();
  if (!level || !DIFFICULTIES.includes(level as (typeof DIFFICULTIES)[number])) {
    notFound();
  }

  const [resolvedSearchParams, viewerHasSession] = await Promise.all([
    searchParams,
    resolveViewerSessionFlag(),
  ]);
  const existing = resolvedSearchParams.difficulty;
  const existingArray = Array.isArray(existing)
    ? existing
    : typeof existing === "string"
      ? [existing]
      : [];

  return renderProblemLibraryPage({
    searchParams: {
      ...resolvedSearchParams,
      difficulty: [level, ...existingArray.filter((item) => item !== level)],
    },
    viewerHasSession,
  });
}
