import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ProblemNotFound() {
  return (
    <div className="mx-auto max-w-2xl rounded-3xl border bg-card/70 px-6 py-12 text-center shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-500">
        404 — Missing problem
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        We couldn&apos;t find that one.
      </h1>
      <p className="mt-3 text-base text-muted-foreground">
        It may have been unpublished or the slug is misspelled. Try going back to the problem
        library and searching again.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/problems">Back to library</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/problems?sort=newest">Browse newest</Link>
        </Button>
      </div>
    </div>
  );
}
