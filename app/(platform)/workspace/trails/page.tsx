import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/config/site";

async function getFeaturedTrailProblems() {
  const problems = await prisma.problem.findMany({
    where: {
      deletedAt: null,
      state: "PUBLISHED",
      trailInsights: { some: { isHidden: false } },
    },
    include: {
      currentVersion: { select: { title: true } },
      difficulty: { select: { code: true } },
      _count: { select: { trailInsights: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });
  return problems;
}

export default async function WorkspaceTrailsPage() {
  const featured = await getFeaturedTrailProblems();
  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-border/50 bg-card/70 p-6 shadow-sm">
        <p className="text-xs uppercase text-muted-foreground">Approach trails</p>
        <h1 className="text-3xl font-semibold">Strategy graphs</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Trails capture the insight breadcrumbs crowdsourced from solvers. Explore popular problems to see how
          others navigated to an AC.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/workspace/problems">Browse problems</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={siteConfig.links.docs} target="_blank" rel="noopener noreferrer">
              Trail playbook
            </Link>
          </Button>
        </div>
      </header>
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Featured graphs</h2>
          <Badge variant="secondary" className="rounded-full">
            {featured.length} problems
          </Badge>
        </div>
        {featured.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 p-8 text-sm text-muted-foreground">
            No problems have public trails yet. Publish an insight from any problem page to seed the graph.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {featured.map((problem) => (
              <Link
                key={problem.id}
                href={`/workspace/problems/${problem.slug}`}
                className="rounded-2xl border border-border/60 bg-background/60 p-4 transition hover:border-primary/50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">#{problem.slug}</p>
                    <p className="text-lg font-semibold">{problem.currentVersion?.title ?? problem.slug}</p>
                  </div>
                  <Badge variant="outline">{problem.difficulty?.code ?? "UNRATED"}</Badge>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  {problem._count.trailInsights} shared insights
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
