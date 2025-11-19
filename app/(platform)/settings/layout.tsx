import Link from "next/link";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";
import { formatDistanceToNow } from "date-fns";
import { getSession } from "@/lib/auth/session";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mail01Icon, Shield01Icon, SparklesIcon, UserCheck01Icon } from "hugeicons-react";

export default async function SettingsLayout({ children }: PropsWithChildren) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  const heroActions = buildHeroActions(session.user.handle);
  const statusCards = buildStatusCards(session);

  return (
    <div className="space-y-8 pb-12">
      <section className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 ring-4 ring-border/50 ring-offset-2 ring-offset-background">
              {session.user.avatarUrl ? (
                <AvatarImage src={session.user.avatarUrl} alt={session.user.handle} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">
                {session.user.handle.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Signed in as</p>
              <h1 className="text-3xl font-semibold tracking-tight">
                {session.user.name ?? session.user.handle}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="uppercase">
                  {session.user.role.toLowerCase()}
                </Badge>
                <span>{session.user.email}</span>
                <span className="text-muted-foreground/70">
                  Last active {formatDistanceToNow(session.session.lastUsedAt, { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {heroActions.map((action) => (
              <Button
                key={action.href}
                asChild
                variant={action.variant}
                size="sm"
                className="rounded-full"
              >
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statusCards.map((card) => (
          <Card key={card.label} className="border-border/60 bg-card/70">
            <CardContent className="flex items-start gap-4 p-5">
              <div className={`rounded-2xl bg-muted/60 p-3 ${card.accent}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-sm">
        {children}
      </section>
    </div>
  );
}

function buildHeroActions(handle: string) {
  const profileHref = handle ? `/u/${handle}` : "/profile";

  return [
    { label: "View public profile", href: profileHref, variant: "outline" as const },
    { label: "Account security", href: "/settings/security", variant: "secondary" as const },
    { label: "Submission privacy", href: "/settings/account", variant: "outline" as const },
  ];
}

function buildStatusCards(session: NonNullable<Awaited<ReturnType<typeof getSession>>>) {
  const emailVerified = Boolean(session.user.emailVerified);
  const lastLoginText = session.user.lastLoginAt
    ? formatDistanceToNow(session.user.lastLoginAt, { addSuffix: true })
    : "No login history";

  return [
    {
      label: "Account status",
      value: session.user.status.toLowerCase(),
      description: `Role: ${session.user.role.toLowerCase()}`,
      icon: UserCheck01Icon,
      accent: "text-primary",
    },
    {
      label: "Email verification",
      value: emailVerified ? "Verified" : "Pending",
      description: session.user.email,
      icon: Mail01Icon,
      accent: emailVerified ? "text-emerald-500" : "text-amber-500",
    },
    {
      label: "Two-factor auth",
      value: session.user.twoFactorEnabled ? "Enabled" : "Disabled",
      description: session.user.twoFactorEnabled ? "Recovery codes ready" : "Protect your account",
      icon: Shield01Icon,
      accent: session.user.twoFactorEnabled ? "text-emerald-500" : "text-rose-500",
    },
    {
      label: "Visibility controls",
      value: session.user.showOnLeaderboard ? "Leaderboard on" : "Leaderboard off",
      description: `Last login ${lastLoginText}`,
      icon: SparklesIcon,
      accent: "text-fuchsia-500",
    },
  ];
}
