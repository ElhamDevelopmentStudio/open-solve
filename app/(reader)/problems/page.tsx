import {
  renderProblemLibraryPage,
  resolveViewerSessionFlag,
} from "@/components/problems/problem-library-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Problem Library | OpenSolve",
  description: "Browse public problems with tags, difficulty filters, and fast search.",
};

export default async function ProblemsPage({
  searchParams,
}: {
  searchParams:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const viewerHasSession = await resolveViewerSessionFlag();
  return renderProblemLibraryPage({
    searchParams: resolvedSearchParams,
    viewerHasSession,
    problemBasePath: "/problems",
  });
}
