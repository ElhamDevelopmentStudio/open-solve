import { ArrowRight } from "@/components/icons";
import { CommandPalette } from "@/components/marketing/command-palette";
import { Button } from "@/components/ui/button";
import { problemsConfig } from "@/config/problems";
import Link from "next/link";

export default function ProblemNotFound() {
  const copy = problemsConfig.notFound;
  return (
    <>
      <CommandPalette />
      <section className="border-2 border-border bg-background p-8 font-mono text-left">
        <div className="text-xs font-bold text-primary/80">{copy.marker}</div>
        <p className="mt-3 text-sm uppercase tracking-wide text-muted-foreground">{copy.badge}</p>
        <h1 className="mt-4 text-3xl font-black leading-tight text-foreground sm:text-4xl">
          {copy.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {copy.description}
        </p>
        <div className="mt-6 space-y-2 text-sm text-foreground">
          {copy.diagnostics.map((item) => (
            <div key={item} className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-4">
          <Button
            asChild
            className="h-11 rounded-none border-2 border-primary px-6 text-xs font-bold"
          >
            <Link href="/problems">{copy.actions.library}</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 rounded-none border-2 border-border px-6 text-xs font-bold hover:border-primary/50"
          >
            <Link href="/problems?sort=newest">{copy.actions.newest}</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
