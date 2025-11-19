import { ProblemReader } from "@/components/problems/problem-reader";
import type { ProblemDetailPayload } from "@/lib/trpc/router/problems";
import { getCachedProblemDetail } from "@/lib/cache/problems";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createTRPCCaller } from "@/lib/trpc/server/caller";

async function fetchProblem(
  slug: string,
  viewerHasSession: boolean,
): Promise<ProblemDetailPayload> {
  if (viewerHasSession) {
    const caller = await createTRPCCaller();
    return caller.problems.detail({ slug });
  }
  return getCachedProblemDetail(slug);
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
}): Promise<Metadata> {
  const resolvedParams = await resolveParams(params);
  try {
    const viewerHasSession = Boolean(await getSession());
    const problem = await fetchProblem(resolvedParams.slug, viewerHasSession);
    const description = problem.content.statement
      ? problem.content.statement.replace(/\s+/g, " ").slice(0, 160)
      : "Read algorithm problems on OpenSolve.";

    return {
      title: `${problem.title} • Problem | OpenSolve`,
      description,
      openGraph: {
        title: `${problem.title} • Problem | OpenSolve`,
        description,
        url: `${
          process.env.NEXT_PUBLIC_SITE_URL ?? "https://opensolve.dev"
        }/problems/${resolvedParams.slug}`,
      },
    };
  } catch {
    return {
      title: "Problem | OpenSolve",
      description: "Browse algorithm problems on OpenSolve.",
    };
  }
}

export default async function ProblemDetailPage({
  params,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
}) {
  const resolvedParams = await resolveParams(params);
  const viewerHasSession = Boolean(await getSession());
  let problem: ProblemDetailPayload | null = null;
  try {
    problem = await fetchProblem(resolvedParams.slug, viewerHasSession);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "NOT_FOUND"
    ) {
      notFound();
    }
    throw error;
  }

  if (!problem) {
    throw new Error("Problem could not be loaded");
  }

  return <ProblemReader key={problem.id} problem={problem} />;
}

async function resolveParams(paramsOrPromise: { slug: string } | Promise<{ slug: string }>) {
  if (paramsOrPromise instanceof Promise) {
    return await paramsOrPromise;
  }
  return paramsOrPromise;
}
