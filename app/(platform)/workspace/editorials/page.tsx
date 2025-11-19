import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/config/site";

async function getEditorialBacklog() {
  const problems = await prisma.problem.findMany({
    where: {
      deletedAt: null,
      state: "PUBLISHED",
      currentVersion: {
        editorial: { not: null },
      },
    },
    include: {
      currentVersion: { select: { title: true, editorial: true } },
      difficulty: { select: { code: true } },
      stats: { select: { acceptedCount: true, submissionCount: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });
  return problems;
}

export default async function WorkspaceEditorialsPage() {
  const backlog = await getEditorialBacklog();
  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-border/50 bg-card/70 p-6 shadow-sm">
        <p className="text-xs uppercase text-muted-foreground">Editorial hub</p>
        <h1 className="text-3xl font-semibold">Official write-ups</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Track which problems have in-house explanations and plan your practice queue accordingly.
          Editorials unlock automatically after contests or when you solve a problem.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/workspace/problems">Open problem library</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={siteConfig.links.docs} target="_blank" rel="noopener noreferrer">
              Editorial policy
            </Link>
          </Button>
        </div>
      </header>
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recently updated</h2>
          <Badge variant="secondary" className="rounded-full">
            {backlog.length} editorials
          </Badge>
        </div>
        {backlog.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 p-8 text-sm text-muted-foreground">
            No editorials are published yet. Curators can add official solutions from the staff
            problem editor.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {backlog.map((problem) => (
              <Link
                key={problem.id}
                href={`/workspace/problems/${problem.slug}`}
                className="rounded-2xl border border-border/60 bg-background/60 p-4 transition hover:border-primary/50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">#{problem.slug}</p>
                    <p className="text-lg font-semibold">
                      {problem.currentVersion?.title ?? problem.slug}
                    </p>
                  </div>
                  <Badge variant="outline">{problem.difficulty?.code ?? "UNRATED"}</Badge>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  {problem.stats?.acceptedCount ?? 0} accepted · editorial ready
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
