import Link from "next/link";
import { teamsConfig } from "@/config/teams";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function TeamsPage() {
  return (
    <div className="space-y-10 font-mono text-foreground">
      <section className="border-2 border-border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.35em] text-primary/70">
              {teamsConfig.hero.marker}
              <span className="inline-flex items-center gap-2 border border-border px-3 py-1 text-[10px] tracking-[0.25em] text-muted-foreground">
                <span className="h-2 w-2 animate-pulse bg-primary" />
                {teamsConfig.hero.badge}
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              {teamsConfig.hero.headline.line1}
              <br />
              {teamsConfig.hero.headline.line2}
              <br />
              <span className="bg-linear-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                {teamsConfig.hero.headline.line3}
              </span>
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              {teamsConfig.hero.description}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="h-11 px-6 text-xs font-bold uppercase">
                <Link href={teamsConfig.hero.primaryCta.href}>
                  {teamsConfig.hero.primaryCta.label}
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 border-2 border-border px-6 text-xs font-bold uppercase"
              >
                <Link href={teamsConfig.hero.secondaryCta.href}>
                  {teamsConfig.hero.secondaryCta.label}
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-md">
            {teamsConfig.hero.highlights.map((stat) => (
              <div key={stat.label} className="border border-border bg-background px-4 py-3">
                <p className="text-[11px] uppercase text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-black">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          marker={teamsConfig.sections.roadmap.marker}
          title={teamsConfig.sections.roadmap.title}
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {teamsConfig.sections.roadmap.items.map((item) => (
            <div key={item.label} className="border-2 border-border bg-card p-6">
              <p className="text-xs font-bold uppercase text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-sm text-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          marker={teamsConfig.sections.actions.marker}
          title={teamsConfig.sections.actions.title}
          description={teamsConfig.sections.actions.description}
        />
        <div className="grid gap-4 md:grid-cols-3">
          {teamsConfig.sections.actions.steps.map((step, index) => (
            <div key={step.label} className="border-2 border-border bg-card p-5">
              <Badge variant="outline" className="mb-3 text-[10px] uppercase">
                {String(index + 1).padStart(2, "0")}
              </Badge>
              <p className="text-sm font-bold">{step.label}</p>
              <p className="text-xs text-muted-foreground">{step.helper}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  marker,
  title,
  description,
}: {
  marker: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary/70">{marker}</p>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <h2 className="text-3xl font-black tracking-tight">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground lg:max-w-3xl">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
