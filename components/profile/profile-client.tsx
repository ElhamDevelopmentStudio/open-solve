"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { ProfileDetail } from "@/lib/profile/service";
import { publicContentQueryOptions } from "@/lib/react-query/policies";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { profileSettingsSchema, type ProfileSettingsInput } from "@/lib/validators/profile";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  ArrowUpRight,
  Flame,
  Github,
  Globe,
  Linkedin,
  Link as LinkIcon,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Trophy,
} from "@/components/icons";
import Link from "next/link";
import { useEffect, useMemo, type ReactNode } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
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
  const showPrivacySettings = profile.permissions.isOwner || profile.permissions.isStaff;

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-fade-in">
      <ProfileHero profile={profile} showCountry={showCountry} showSocials={showSocials} />
      <StatsGrid profile={profile} />
      <ChartsSection profile={profile} />
      <ActivitySection profile={profile} />
      <RecentSolves profile={profile} />
      <BadgesSection profile={profile} />
      {profile.staffInsights ? <StaffInsights insights={profile.staffInsights} /> : null}
      {showPrivacySettings && profile.privacySettings ? (
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
    <div className="premium-card overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-6 p-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-5 lg:flex-row lg:items-center">
          <Avatar className="h-28 w-28 ring-4 ring-border/30 ring-offset-2 ring-offset-background">
            {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt={profile.handle} /> : null}
            <AvatarFallback className="text-2xl font-bold">{profile.handle.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <p className="text-sm text-muted-foreground">@{profile.handle}</p>
                <h1 className="text-2xl font-bold tracking-tight">
                  {profile.name ?? "OpenSolve user"}
                </h1>
              </div>
              <RoleBadge role={profile.role} status={profile.status} />
              {!profile.showOnLeaderboard ? (
                <Badge variant="outline" className="rounded-full border-amber-300/60 text-amber-600 dark:border-amber-400/40 dark:text-amber-200">
                  Leaderboards opt-out
                </Badge>
              ) : null}
            </div>
            {profile.bio ? <p className="max-w-2xl text-sm text-muted-foreground">{profile.bio}</p> : null}
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {countryLabel ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {countryLabel}
                </span>
              ) : null}
              {profile.timezone ? <span className="text-xs uppercase">{profile.timezone}</span> : null}
            </div>
            {socials.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {socials.map((social) => (
                  <Button key={social.href} size="sm" variant="outline" className="h-8 gap-1.5 rounded-xl" asChild>
                    <a href={social.href} target="_blank" rel="noreferrer">
                      {social.icon}
                      <span className="text-xs">{social.label}</span>
                    </a>
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild className="rounded-xl">
            <Link href="/leaderboards">
              <Trophy className="mr-2 h-4 w-4" />
              Leaderboards
            </Link>
          </Button>
          {profile.permissions.isOwner ? (
            <Button variant="default" asChild className="rounded-xl">
              <Link href="/settings/profile">
                Edit Profile
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatsGrid({ profile }: { profile: ProfileDetail }) {
  const cards = [
    {
      label: "Total solved",
      value: profile.stats.totalSolved.toLocaleString(),
      helper: profile.stats.lastAcceptedAt ? `Last AC ${formatDistanceToNow(profile.stats.lastAcceptedAt, { addSuffix: true })}` : "",
      icon: <Trophy className="h-5 w-5 text-primary" />,
    },
    {
      label: "Problems attempted",
      value: profile.attempts.attempted.toLocaleString(),
      helper: `${profile.attempts.solved.toLocaleString()} solved`,
      icon: <Activity className="h-5 w-5 text-secondary" />,
    },
    {
      label: "Acceptance rate",
      value: `${Math.round(profile.stats.acceptanceRate * 100)}%`,
      helper: profile.stats.firstAcceptedAt ? `First AC ${new Date(profile.stats.firstAcceptedAt).getFullYear()}` : "",
      icon: <ShieldCheck className="h-5 w-5 text-emerald-500" />,
    },
    {
      label: "Current streak",
      value: `${profile.stats.streak.current} days`,
      helper: `Best ${profile.stats.streak.best} days`,
      icon: <Flame className="h-5 w-5 text-amber-500" />,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="premium-card rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-muted/60">{card.icon}</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-bold tracking-tight">{card.value}</p>
              {card.helper ? <p className="truncate text-xs text-muted-foreground">{card.helper}</p> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
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

function ChartsSection({ profile }: { profile: ProfileDetail }) {
  const difficultyData = profile.stats.solvedByDifficulty.map((entry) => ({
    difficulty: entry.difficulty,
    label: formatDifficulty(entry.difficulty),
    count: entry.count,
  }));
  const tagData = profile.stats.solvedByTag;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="premium-card space-y-4 rounded-2xl p-6">
        <h3 className="text-lg font-semibold">Solved by Difficulty</h3>
        <ChartContainer className="h-64" config={{ count: { label: "Problems", color: "var(--chart-1)" } }}>
          <BarChart data={difficultyData}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="label" stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="var(--chart-1)" />
          </BarChart>
        </ChartContainer>
      </div>
      <div className="premium-card space-y-4 rounded-2xl p-6">
        <h3 className="text-lg font-semibold">Top Tags</h3>
        {tagData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Tags will appear once this solver has public solves.</p>
        ) : (
          <div className="space-y-3">
            {tagData.map((tag) => (
              <div key={tag.slug} className="flex items-center justify-between rounded-xl border border-border/60 bg-card/50 p-3 smooth-transition hover:border-border">
                <div>
                  <p className="font-medium">#{tag.slug}</p>
                  <p className="text-xs text-muted-foreground">{tag.name}</p>
                </div>
                <Badge variant="secondary" className="rounded-full">{tag.count.toLocaleString()}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
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
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="premium-card space-y-4 rounded-2xl p-6">
        <h3 className="text-lg font-semibold">Streak Calendar</h3>
        <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-1 text-[0px]">
          {heatCells.map((cell) => (
            <div
              key={cell.date}
              title={`${new Date(cell.date).toLocaleDateString()} — ${cell.count} solves`}
              className={cn("h-4 w-full rounded-sm smooth-transition hover:scale-110", heatColor(cell.count, maxHeat))}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Past {heatCells.length} days</p>
      </div>
      <div className="premium-card space-y-4 rounded-2xl p-6">
        <h3 className="text-lg font-semibold">Time-of-Day Focus</h3>
        <ChartContainer className="h-64" config={{ count: { label: "Solves", color: "var(--chart-5)" } }}>
          <BarChart data={hourlyData}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="hour" tickLine={false} axisLine={false} stroke="currentColor" fontSize={11} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="var(--chart-5)" />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}

function RecentSolves({ profile }: { profile: ProfileDetail }) {
  const solves = profile.stats.recentSolves;
  if (solves.length === 0) {
    return null;
  }
  return (
    <div className="premium-card space-y-4 rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Recent Accepted Submissions</h3>
          <p className="text-sm text-muted-foreground">Highlights from the last few solves</p>
        </div>
        <Button variant="ghost" size="sm" asChild className="rounded-xl">
          <Link href="/submissions">View All</Link>
        </Button>
      </div>
      <div className="space-y-3">
        {solves.map((solve) => (
          <div key={solve.id} className="rounded-xl border border-border/70 bg-card/50 p-4 smooth-transition hover:border-border">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link href={`/problems/${solve.problem.slug}`} className="text-sm font-medium text-primary hover:underline">
                  {solve.problem.title}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(solve.createdAt), { addSuffix: true })}
                </div>
              </div>
              <Badge variant="secondary" className="rounded-full">{solve.languageCode}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BadgesSection({ profile }: { profile: ProfileDetail }) {
  if (profile.badges.length === 0) {
    return null;
  }
  return (
    <div className="premium-card space-y-4 rounded-2xl p-6">
      <h3 className="text-lg font-semibold">Badges</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {profile.badges.map((badge) => (
          <div key={badge.slug} className="rounded-xl border border-border/70 bg-gradient-to-br from-card to-card/50 p-4 shadow-sm smooth-transition hover:border-border hover:shadow-md">
            <p className="font-semibold">{badge.name}</p>
            {badge.description ? <p className="mt-1 text-xs text-muted-foreground">{badge.description}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffInsights({
  insights,
}: {
  insights: NonNullable<ProfileDetail["staffInsights"]>;
}) {
  return (
    <div className="premium-card space-y-4 rounded-2xl border-destructive/20 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
          <ShieldAlert className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-destructive">Staff Insights</h3>
          <p className="text-xs text-muted-foreground">Visible only to staff and moderators</p>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between rounded-lg border border-border/50 bg-muted/30 p-3">
          <span>Rapid solve spike:</span>
          <span className={insights.rapidSolveSpike ? "font-semibold text-destructive" : "text-muted-foreground"}>
            {insights.rapidSolveSpike ? "Yes" : "No"}
          </span>
        </div>
        <div className="flex justify-between rounded-lg border border-border/50 bg-muted/30 p-3">
          <span>Manual reviews pending:</span>
          <span className="font-semibold">{insights.manualReviewCount}</span>
        </div>
        <div className="flex justify-between rounded-lg border border-border/50 bg-muted/30 p-3">
          <span>Account status:</span>
          <span className={insights.shadowBanned ? "font-semibold text-destructive" : "font-semibold text-success"}>
            {insights.shadowBanned ? "Shadow Banned" : "Active"}
          </span>
        </div>
      </div>
    </div>
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
      toast.success("Preferences updated", {
        description: "Your privacy settings have been saved",
      });
      utils.profile.detail.invalidate({ handle });
    },
    onError: (error) => {
      toast.error("Failed to update", {
        description: error.message,
      });
    },
  });

  return (
    <div className="premium-card space-y-6 rounded-2xl p-8">
      <div>
        <h3 className="text-lg font-semibold">Privacy & Sharing</h3>
        <p className="text-sm text-muted-foreground">Control what information is visible on your profile</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-6">
          <div className="space-y-3">
            {renderToggle(form, "shareAcceptedCode", "Share Accepted Code", "Opt-in to displaying AC snippets on your profile")}
            {renderToggle(form, "showOnLeaderboard", "Appear on Leaderboards", "Opt-out removes you from public rankings")}
            {renderToggle(form, "showCountry", "Show Country", "Controls whether your flag is visible to others")}
            {renderToggle(form, "showSocials", "Show Social Links", "Hide or reveal linked accounts on your profile")}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {(["github", "linkedin", "twitter", "website"] as const).map((key) => (
              <FormField
                key={key}
                control={form.control}
                name={`socials.${key}` as const}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold capitalize">{key}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={`https://${key}.com/you`}
                        value={field.value ?? ""}
                        onChange={(event) => field.onChange(event.target.value)}
                        className="rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
          <Button type="submit" disabled={mutation.isPending} className="rounded-xl">
            {mutation.isPending ? "Saving..." : "Save Preferences"}
          </Button>
        </form>
      </Form>
    </div>
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
        <FormItem className="flex items-center justify-between rounded-xl border border-border/60 bg-card/50 p-4">
          <div className="space-y-0.5">
            <FormLabel className="text-sm font-semibold">{label}</FormLabel>
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
