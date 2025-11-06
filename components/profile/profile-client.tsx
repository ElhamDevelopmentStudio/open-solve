"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { trpc } from "@/lib/trpc/client";
import { publicContentQueryOptions } from "@/lib/react-query/policies";
import type { ProfileDetail } from "@/lib/profile/service";
import { profileSettingsSchema, type ProfileSettingsInput } from "@/lib/validators/profile";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Activity,
  ArrowUpRight,
  Github,
  Globe,
  Linkedin,
  Link as LinkIcon,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  Flame,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

type ProfileClientProps = {
  handle: string;
};

export function ProfileClient({ handle }: ProfileClientProps) {
  const profileQuery = trpc.profile.detail.useQuery(
    { handle },
    {
      staleTime: publicContentQueryOptions.staleTime,
    },
  );

  if (profileQuery.isLoading) {
    return <ProfileSkeleton />;
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">Profile unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-destructive">
          {profileQuery.error?.message ?? "This profile could not be loaded."}
        </CardContent>
      </Card>
    );
  }

  return <ProfileView profile={profileQuery.data} />;
}

function ProfileView({ profile }: { profile: ProfileDetail }) {
  const showCountry = profile.showCountry || profile.permissions.isOwner || profile.permissions.isStaff;
  const showSocials = profile.showSocials || profile.permissions.isOwner || profile.permissions.isStaff;

  return (
    <div className="space-y-8">
      <ProfileHero profile={profile} showCountry={showCountry} showSocials={showSocials} />
      <StatsGrid profile={profile} />
      <ChartsSection profile={profile} />
      <ActivitySection profile={profile} />
      <RecentSolves profile={profile} />
      <BadgesSection profile={profile} />
      {profile.staffInsights ? <StaffInsights insights={profile.staffInsights} /> : null}
      {profile.privacySettings ? (
        <ProfilePrivacyCard handle={profile.handle} settings={profile.privacySettings} />
      ) : null}
    </div>
  );
}

function ProfileHero({
  profile,
  showCountry,
  showSocials,
}: {
  profile: ProfileDetail;
  showCountry: boolean;
  showSocials: boolean;
}) {
  const countryLabel = showCountry && profile.country ? formatCountry(profile.country) : null;
  const socials = useMemo(() => buildSocialLinks(profile.socials, showSocials), [profile.socials, showSocials]);

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-center">
          <Avatar className="h-24 w-24 text-2xl">
            {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt={profile.handle} /> : null}
            <AvatarFallback>{profile.handle.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <p className="text-sm text-muted-foreground">@{profile.handle}</p>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {profile.name ?? "OpenSolve user"}
                </h1>
              </div>
              <RoleBadge role={profile.role} status={profile.status} />
              {!profile.showOnLeaderboard ? (
                <Badge variant="outline" className="border-amber-300/60 text-amber-600 dark:border-amber-400/40 dark:text-amber-200">
                  Leaderboards opt-out
                </Badge>
              ) : null}
            </div>
            {profile.bio ? <p className="max-w-2xl text-sm text-muted-foreground">{profile.bio}</p> : null}
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {countryLabel ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {countryLabel}
                </span>
              ) : null}
              {profile.timezone ? <span className="text-xs uppercase">{profile.timezone}</span> : null}
            </div>
            {socials.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {socials.map((social) => (
                  <Button key={social.href} size="sm" variant="outline" className="gap-1" asChild>
                    <a href={social.href} target="_blank" rel="noreferrer">
                      {social.icon}
                      <span>{social.label}</span>
                    </a>
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" asChild>
            <Link href="/leaderboards">
              <Trophy className="mr-2 h-4 w-4" />
              View leaderboards
            </Link>
          </Button>
          {profile.permissions.isOwner ? (
            <Button variant="outline" asChild>
              <Link href="/settings/profile">
                Edit profile
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function RoleBadge({ role, status }: { role: ProfileDetail["role"]; status: ProfileDetail["status"] }) {
  const base = role === "ADMIN" ? "bg-primary/15 text-primary" : role === "PROBLEM_CURATOR" ? "bg-purple-500/15 text-purple-500" : "bg-muted text-muted-foreground";
  return (
    <Badge className={cn("rounded-full text-xs font-medium", base)}>
      {status === "SHADOW_BANNED" ? "Shadow Banned" : role.replace("_", " ").toLowerCase()}
    </Badge>
  );
}

function StatsGrid({ profile }: { profile: ProfileDetail }) {
  const cards = [
    {
      label: "Total solved",
      value: profile.stats.totalSolved.toLocaleString(),
      helper: profile.stats.lastAcceptedAt ? `Last AC ${formatDistanceToNow(profile.stats.lastAcceptedAt, { addSuffix: true })}` : "",
      icon: <Trophy className="h-4 w-4 text-primary" />,
    },
    {
      label: "Problems attempted",
      value: profile.attempts.attempted.toLocaleString(),
      helper: `${profile.attempts.solved.toLocaleString()} solved`,
      icon: <Activity className="h-4 w-4 text-secondary" />,
    },
    {
      label: "Acceptance rate",
      value: `${Math.round(profile.stats.acceptanceRate * 100)}%`,
      helper: profile.stats.firstAcceptedAt ? `First AC ${new Date(profile.stats.firstAcceptedAt).getFullYear()}` : "",
      icon: <ShieldCheck className="h-4 w-4 text-emerald-500" />,
    },
    {
      label: "Current streak",
      value: `${profile.stats.streak.current} days`,
      helper: `Best ${profile.stats.streak.best} days`,
      icon: <Flame className="h-4 w-4 text-amber-500" />,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-full bg-muted p-3 text-muted-foreground">{card.icon}</div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-semibold tracking-tight">{card.value}</p>
              {card.helper ? <p className="text-xs text-muted-foreground">{card.helper}</p> : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartsSection({ profile }: { profile: ProfileDetail }) {
  const difficultyData = profile.stats.solvedByDifficulty.map((entry) => ({
    difficulty: entry.difficulty,
    label: formatDifficulty(entry.difficulty),
    count: entry.count,
  }));
  const tagData = profile.stats.solvedByTag;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Solved by difficulty</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer className="h-64" config={{ count: { label: "Problems", color: "var(--chart-1)" } }}>
            <BarChart data={difficultyData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="label" stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="var(--chart-1)" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Top tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tagData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tags will appear once this solver has public solves.</p>
          ) : (
            <div className="space-y-3">
              {tagData.map((tag) => (
                <div key={tag.slug} className="flex items-center justify-between rounded-xl border border-border/60 p-3">
                  <div>
                    <p className="font-medium">#{tag.slug}</p>
                    <p className="text-xs text-muted-foreground">{tag.name}</p>
                  </div>
                  <Badge variant="secondary">{tag.count.toLocaleString()}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActivitySection({ profile }: { profile: ProfileDetail }) {
  const maxHeat = Math.max(...profile.stats.streak.calendar.map((cell) => cell.count), 1);
  const heatCells = profile.stats.streak.calendar;
  const hourlyData = profile.stats.hourlyActivity.map((item) => ({
    hour: formatHour(item.hour),
    count: item.count,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Streak calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-1 text-[0px]">
            {heatCells.map((cell) => (
              <div
                key={cell.date}
                title={`${new Date(cell.date).toLocaleDateString()} — ${cell.count} solves`}
                className={cn("h-4 w-full rounded-sm", heatColor(cell.count, maxHeat))}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Past {heatCells.length} days</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Time-of-day focus</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer className="h-64" config={{ count: { label: "Solves", color: "var(--chart-5)" } }}>
            <BarChart data={hourlyData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="hour" tickLine={false} axisLine={false} stroke="currentColor" fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="var(--chart-5)" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function RecentSolves({ profile }: { profile: ProfileDetail }) {
  const solves = profile.stats.recentSolves;
  if (solves.length === 0) {
    return null;
  }
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent accepted submissions</CardTitle>
            <p className="text-sm text-muted-foreground">Highlights from the last few solves</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/submissions">View submissions</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {solves.map((solve) => (
          <div key={solve.id} className="rounded-xl border border-border/70 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link href={`/problems/${solve.problem.slug}`} className="text-sm font-medium text-primary hover:underline">
                  {solve.problem.title}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(solve.createdAt), { addSuffix: true })}
                </div>
              </div>
              <Badge variant="secondary">{solve.languageCode}</Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function BadgesSection({ profile }: { profile: ProfileDetail }) {
  if (profile.badges.length === 0) {
    return null;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Badges</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        {profile.badges.map((badge) => (
          <div key={badge.slug} className="rounded-xl border border-border/70 bg-card/70 px-4 py-3 shadow-sm">
            <p className="font-medium">{badge.name}</p>
            {badge.description ? <p className="text-xs text-muted-foreground">{badge.description}</p> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function StaffInsights({
  insights,
}: {
  insights: NonNullable<ProfileDetail["staffInsights"]>;
}) {
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader className="flex flex-row items-center gap-3">
        <ShieldAlert className="h-5 w-5 text-destructive" />
        <div>
          <CardTitle className="text-destructive">Staff insights</CardTitle>
          <p className="text-xs text-muted-foreground">Visible only to staff and moderators.</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          Rapid solve spike: <span className={insights.rapidSolveSpike ? "text-destructive" : "text-muted-foreground"}>{insights.rapidSolveSpike ? "Yes" : "No"}</span>
        </p>
        <p>Manual reviews pending: {insights.manualReviewCount}</p>
        <p>Status: {insights.shadowBanned ? "Shadow banned" : "Active"}</p>
      </CardContent>
    </Card>
  );
}

function ProfilePrivacyCard({ handle, settings }: { handle: string; settings: ProfileSettingsInput }) {
  const utils = trpc.useUtils();
  const form = useForm<ProfileSettingsInput>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: settings,
  });
  useEffect(() => {
    form.reset(settings);
  }, [settings, form]);

  const mutation = trpc.profile.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Preferences updated");
      utils.profile.detail.invalidate({ handle });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy & sharing</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-6">
            <div className="space-y-4">
              {renderToggle(form, "shareAcceptedCode", "Share accepted code", "Opt-in to displaying AC snippets on your profile.")}
              {renderToggle(form, "showOnLeaderboard", "Appear on leaderboards", "Opt-out removes you from public rankings.")}
              {renderToggle(form, "showCountry", "Show country", "Controls whether your flag is visible to others.")}
              {renderToggle(form, "showSocials", "Show social links", "Hide or reveal linked accounts on your profile.")}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {(["github", "linkedin", "twitter", "website"] as const).map((key) => (
                <FormField
                  key={key}
                  control={form.control}
                  name={`socials.${key}` as const}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="capitalize">{key}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={`https://${key}.com/you`}
                          value={field.value ?? ""}
                          onChange={(event) => field.onChange(event.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <Button type="submit" disabled={mutation.isPending} className="w-full md:w-auto">
              {mutation.isPending ? "Saving..." : "Save preferences"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

type ToggleName = "shareAcceptedCode" | "showOnLeaderboard" | "showCountry" | "showSocials";

function renderToggle(
  form: UseFormReturn<ProfileSettingsInput>,
  name: ToggleName,
  label: string,
  description: string,
) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-center justify-between rounded-xl border border-border/60 p-3">
          <div>
            <FormLabel>{label}</FormLabel>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-52" />
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-5">
              <Skeleton className="h-10 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="h-64">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function formatCountry(country: string) {
  const code = country.trim().toUpperCase();
  const flag = code.length === 2 ? String.fromCodePoint(...code.split("").map((char) => 127397 + char.charCodeAt(0))) : "";
  return `${flag} ${code}`.trim();
}

function buildSocialLinks(
  socials: ProfileDetail["socials"],
  visible: boolean,
): Array<{ href: string; label: string; icon: ReactNode }> {
  if (!visible) {
    return [];
  }
  const links: Array<{ href: string; label: string; icon: React.ReactNode }> = [];
  if (socials.github) {
    links.push({ href: socials.github, label: "GitHub", icon: <Github className="h-4 w-4" /> });
  }
  if (socials.linkedin) {
    links.push({ href: socials.linkedin, label: "LinkedIn", icon: <Linkedin className="h-4 w-4" /> });
  }
  if (socials.twitter) {
    links.push({ href: socials.twitter, label: "Twitter", icon: <LinkIcon className="h-4 w-4" /> });
  }
  if (socials.website) {
    links.push({ href: socials.website, label: "Website", icon: <Globe className="h-4 w-4" /> });
  }
  return links;
}

function formatDifficulty(difficulty: string) {
  return difficulty.charAt(0) + difficulty.slice(1).toLowerCase();
}

function formatHour(hour: number) {
  const suffix = hour >= 12 ? "pm" : "am";
  const normalized = hour % 12 || 12;
  return `${normalized}${suffix}`;
}

function heatColor(count: number, max: number) {
  if (count === 0) return "bg-muted";
  const pct = count / max;
  if (pct > 0.75) return "bg-primary";
  if (pct > 0.5) return "bg-primary/80";
  if (pct > 0.25) return "bg-primary/60";
  return "bg-primary/40";
}
