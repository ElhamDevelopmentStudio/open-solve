import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import Link from "next/link";
import { 
  Activity, 
  ArrowRight, 
  Award, 
  CheckCircle2, 
  Clock, 
  Code, 
  Flame, 
  Target, 
  TrendingUp 
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getSession();
  const caller = await createTRPCCaller();

  const quickActions = [
    { 
      label: "Browse Problems", 
      href: "/problems", 
      icon: Target, 
      variant: "default" as const 
    },
    { 
      label: "View Submissions", 
      href: "/submissions", 
      icon: Code, 
      variant: "outline" as const 
    },
    { 
      label: "Join Contest", 
      href: "/contests", 
      icon: Award, 
      variant: "outline" as const 
    },
  ];

  const metrics = [
    {
      label: "Problems Solved",
      value: 0,
      total: 0,
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Current Streak",
      value: "0 days",
      subtitle: "Longest: 0 days",
      icon: Flame,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: "Total Submissions",
      value: 0,
      subtitle: "0 accepted",
      icon: Activity,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Rank",
      value: "#-",
      subtitle: "Unranked",
      icon: TrendingUp,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back, {session?.user.name ?? session?.user.handle ?? "Solver"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s your coding journey overview
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button key={action.href} variant={action.variant} size="sm" asChild>
                <Link href={action.href} className="gap-2">
                  <Icon className="h-4 w-4" />
                  {action.label}
                </Link>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card
              key={metric.label}
              className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card to-card/50"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {metric.label}
                    </p>
                    <p className="mt-2 text-2xl font-bold">{metric.value}</p>
                    {metric.subtitle && (
                      <p className="mt-1 text-xs text-muted-foreground">{metric.subtitle}</p>
                    )}
                    {metric.total !== undefined && (
                      <p className="mt-1 text-xs text-muted-foreground">of {metric.total} total</p>
                    )}
                  </div>
                  <div className={`rounded-lg ${metric.bgColor} p-2`}>
                    <Icon className={`h-5 w-5 ${metric.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/submissions">
                  View all
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm font-medium text-foreground">
                Your recent submissions will appear here
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Start solving problems to track your progress
              </p>
              <Button size="sm" className="mt-4" asChild>
                <Link href="/problems">Browse Problems</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Difficulty Distribution</CardTitle>
              <Badge variant="outline" className="text-xs">
                Last 30 days
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: "Easy", solved: 0, total: 150, color: "bg-success" },
                { label: "Medium", solved: 0, total: 200, color: "bg-warning" },
                { label: "Hard", solved: 0, total: 100, color: "bg-destructive" },
              ].map((diff) => {
                const percentage = diff.total > 0 ? (diff.solved / diff.total) * 100 : 0;
                return (
                  <div key={diff.label}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{diff.label}</span>
                      <span className="text-muted-foreground">
                        {diff.solved} / {diff.total}
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full ${diff.color} transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-gradient-to-r from-primary/5 via-card to-accent/5">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="rounded-full bg-primary/10 p-3">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold">Ready to level up your skills?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Solve daily challenges, join contests, and climb the leaderboard
              </p>
            </div>
            <Button asChild>
              <Link href="/problems">Start Solving</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
