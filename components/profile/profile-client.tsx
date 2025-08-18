"use client";

import { profileConfig, type ProfileToggleName } from "@/config/profile";
import {
  Activity,
  ArrowRight,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import Link from "next/link";
import { useEffect, useMemo, type ReactNode } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { toast } from "sonner";

const STAT_ICON_MAP = {
  totalSolved: Trophy,
  attempted: Activity,
  acceptance: ShieldCheck,
  streak: Flame,
} as const;

const SOCIAL_FIELDS = [
  { key: "github", label: "GitHub" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "twitter", label: "Twitter" },
  { key: "website", label: "Website" },
] as const;

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
      <div className="border-2 border-destructive/40 bg-destructive/10 p-6 font-mono text-sm text-destructive">
        {profileQuery.error?.message ?? "This profile could not be loaded."}
      </div>
    );
  }

  return <ProfileView profile={profileQuery.data} />;
}

function ProfileView({ profile }: { profile: ProfileDetail }) {
  const showCountry =
    profile.showCountry || profile.permissions.isOwner || profile.permissions.isStaff;
  const showSocials =
    profile.showSocials || profile.permissions.isOwner || profile.permissions.isStaff;
  const showPrivacySettings = profile.permissions.isOwner || profile.permissions.isStaff;

  return (
    <div className="space-y-12 font-mono">
      <ProfileHero profile={profile} showCountry={showCountry} showSocials={showSocials} />
      <StatsGrid profile={profile} />
      <ChartsSection profile={profile} />
      <ActivitySection profile={profile} />
      <RecentSolvesSection profile={profile} />
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
  const { hero } = profileConfig;
  const countryLabel = showCountry && profile.country ? formatCountry(profile.country) : null;
  const socials = useMemo(
    () => buildSocialLinks(profile.socials, showSocials),
    [profile.socials, showSocials],
  );
  const heroStats = [
    {
      label: "TOTAL SOLVED",
      value: profile.stats.totalSolved.toLocaleString(),
      helper: profile.stats.lastAcceptedAt
        ? `Last AC ${formatDistanceToNow(profile.stats.lastAcceptedAt, { addSuffix: true })}`
        : "No accepted submissions yet",
    },
    {
      label: "ACCEPTANCE",
      value: `${Math.round(profile.stats.acceptanceRate * 100)}%`,
      helper: profile.stats.firstAcceptedAt
        ? `First AC ${new Date(profile.stats.firstAcceptedAt).getFullYear()}`
        : "No data",
    },
    {
      label: "FAVORITE LANGUAGE",
      value: profile.stats.favoriteLanguage?.displayName ?? "Untracked",
      helper: profile.stats.favoriteLanguage
        ? `${profile.stats.favoriteLanguage.count} solves`
        : "",
    },
    {
      label: "CURRENT STREAK",
      value: `${profile.stats.streak.current} days`,
      helper: `Best ${profile.stats.streak.best} days`,
    },
  ];

  return (
    <section className="border-2 border-border bg-background p-8">
      <div className="mb-4 text-xs font-bold text-primary/80">{hero.marker}</div>
      <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
          <Avatar className="h-32 w-32 border-2 border-border bg-accent/30 text-foreground">
            {profile.avatarUrl ? (
              <AvatarImage src={profile.avatarUrl} alt={profile.handle} />
            ) : null}
            <AvatarFallback className="text-2xl font-black">
              {profile.handle.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-4">
            <div className="text-xs uppercase text-muted-foreground">@{profile.handle}</div>
            <h1 className="text-3xl font-black leading-tight text-foreground sm:text-4xl">
              {profile.name ?? hero.fallbackName}
            </h1>
            <div className="flex flex-wrap gap-2 text-xs">
              <RoleBadge role={profile.role} status={profile.status} />
              {profile.permissions.isStaff ? (
                <Badge variant="outline" className="rounded-none border-2 border-border">
                  staff view
                </Badge>
              ) : null}
              {!profile.showOnLeaderboard ? (
                <Badge
                  variant="warning"
                  className="rounded-none border-2 border-warning/30 text-warning"
                >
                  {hero.leaderboardOptOut}
                </Badge>
              ) : null}
            </div>
            {profile.bio ? (
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {profile.bio}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-4 text-xs uppercase text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <MapPin className="h-4 w-4" />
                {countryLabel ?? hero.locationHidden}
              </span>
              <span>{profile.timezone ?? hero.timezoneHidden}</span>
            </div>
            {socials.length > 0 ? (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  {hero.socialsLabel}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {socials.map((social) => (
                    <Button
                      key={social.href}
                      asChild
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-none border-2 border-border px-3 text-xs"
                    >
                      <a href={social.href} target="_blank" rel="noreferrer">
                        <span className="inline-flex items-center gap-1">
                          {social.icon}
                          {social.label}
                        </span>
                      </a>
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className="border-2 border-border bg-background/70 p-6">
          <div className="text-xs font-bold uppercase tracking-wide text-primary/80">
            {hero.metricsMarker}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {heroStats.map((stat) => (
              <div key={stat.label} className="border border-border/70 bg-background/80 p-4">
                <div className="text-[11px] uppercase text-muted-foreground">{stat.label}</div>
                <div className="text-2xl font-black text-foreground">{stat.value}</div>
                <div className="text-[11px] text-muted-foreground">{stat.helper}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              asChild
              className="h-11 rounded-none border-2 border-primary px-6 text-xs font-bold"
            >
              <Link href="/leaderboards">{hero.actions.leaderboards}</Link>
            </Button>
            {profile.permissions.isOwner ? (
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-none border-2 border-border px-6 text-xs font-bold hover:border-primary/50"
              >
                <Link href="/settings/profile">
                  {hero.actions.editProfile}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsGrid({ profile }: { profile: ProfileDetail }) {
  const { stats } = profileConfig;
  const cards = [
    {
      key: "totalSolved",
      label: stats.cards.totalSolved,
      value: profile.stats.totalSolved.toLocaleString(),
      helper: profile.stats.lastAcceptedAt
        ? `Last AC ${formatDistanceToNow(profile.stats.lastAcceptedAt, { addSuffix: true })}`
        : "No accepted submissions yet",
    },
    {
      key: "attempted",
      label: stats.cards.attempted,
      value: profile.attempts.attempted.toLocaleString(),
      helper: `${profile.attempts.solved.toLocaleString()} solved`,
    },
    {
      key: "acceptance",
      label: stats.cards.acceptance,
      value: `${Math.round(profile.stats.acceptanceRate * 100)}%`,
      helper: profile.stats.firstAcceptedAt
        ? `First AC ${new Date(profile.stats.firstAcceptedAt).getFullYear()}`
        : "No data",
    },
    {
      key: "streak",
      label: stats.cards.streak,
      value: `${profile.stats.streak.current} days`,
      helper: `Best ${profile.stats.streak.best} days`,
    },
  ] as const;

  return (
    <section className="space-y-4 border-t border-border pt-12">
      <div className="text-xs font-bold text-primary/80">{stats.marker}</div>
      <p className="text-sm text-muted-foreground">{stats.description}</p>
      <div className="grid gap-px bg-border/30 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = STAT_ICON_MAP[card.key as keyof typeof STAT_ICON_MAP];
          return (
            <div key={card.key} className="bg-background p-6">
              <div className="mb-2 flex items-center justify-between text-[11px] uppercase text-muted-foreground">
                <span>{card.label}</span>
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="text-3xl font-black text-foreground">{card.value}</div>
              <div className="mt-2 text-xs text-muted-foreground">{card.helper}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RoleBadge({
  role,
  status,
}: {
  role: ProfileDetail["role"];
  status: ProfileDetail["status"];
}) {
  const base =
    role === "ADMIN"
      ? "border-primary text-primary"
      : role === "PROBLEM_CURATOR"
        ? "border-info text-info"
        : "border-border text-foreground";
  return (
    <Badge className={cn("rounded-none border-2 px-2 py-0.5 text-[10px] font-bold", base)}>
      {status === "SHADOW_BANNED" ? "shadow banned" : role.replace("_", " ").toLowerCase()}
    </Badge>
  );
}

function ChartsSection({ profile }: { profile: ProfileDetail }) {
  const { charts } = profileConfig;
  const difficultyData = profile.stats.solvedByDifficulty.map((entry) => ({
    difficulty: entry.difficulty,
    label: formatDifficulty(entry.difficulty),
    count: entry.count,
  }));
  const tagData = profile.stats.solvedByTag;

  return (
    <section className="space-y-6 border-t border-border pt-12">
      <div className="text-xs font-bold text-primary/80">{charts.marker}</div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border-2 border-border bg-background p-6">
          <h3 className="text-xl font-bold text-foreground">{charts.difficulty.title}</h3>
          <ChartContainer
            className="mt-4 h-64"
            config={{ count: { label: "Problems", color: "var(--chart-1)" } }}
          >
            <BarChart data={difficultyData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
              <XAxis
                dataKey="label"
                stroke="currentColor"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 0, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
        <div className="border-2 border-border bg-background p-6">
          <h3 className="text-xl font-bold text-foreground">{charts.tags.title}</h3>
          {tagData.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">{charts.tags.empty}</p>
          ) : (
            <div className="mt-4 space-y-3">
              {tagData.map((tag) => (
                <div
                  key={tag.slug}
                  className="flex items-center justify-between border border-border px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-bold text-foreground">#{tag.slug}</p>
                    <p className="text-xs text-muted-foreground">{tag.name}</p>
                  </div>
                  <Badge variant="outline" className="rounded-none border-2 border-border px-3">
                    {tag.count.toLocaleString()}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ActivitySection({ profile }: { profile: ProfileDetail }) {
  const { activity } = profileConfig;
  const heatCells = profile.stats.streak.calendar;
  const maxHeat = Math.max(...heatCells.map((cell) => cell.count), 1);
  const hourlyData = profile.stats.hourlyActivity.map((item) => ({
    hour: formatHour(item.hour),
    count: item.count,
  }));

  return (
    <section className="space-y-6 border-t border-border pt-12">
      <div className="text-xs font-bold text-primary/80">{activity.marker}</div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border-2 border-border bg-background p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-foreground">{activity.streakTitle}</h3>
            <span className="text-xs uppercase text-muted-foreground">
              {activity.rangeLabel(heatCells.length)}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-[repeat(24,minmax(0,1fr))] gap-1">
            {heatCells.map((cell) => (
              <span
                key={cell.date}
                title={`${new Date(cell.date).toLocaleDateString()} — ${cell.count} solves`}
                className={cn("h-4 w-full border border-border/40", heatColor(cell.count, maxHeat))}
              />
            ))}
          </div>
        </div>
        <div className="border-2 border-border bg-background p-6">
          <h3 className="text-xl font-bold text-foreground">{activity.hourlyTitle}</h3>
          <ChartContainer
            className="mt-4 h-64"
            config={{ count: { label: "Solves", color: "var(--chart-5)" } }}
          >
            <BarChart data={hourlyData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
              <XAxis
                dataKey="hour"
                tickLine={false}
                axisLine={false}
                stroke="currentColor"
                fontSize={11}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--chart-5)" radius={[0, 0, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>
    </section>
  );
}

function RecentSolvesSection({ profile }: { profile: ProfileDetail }) {
  const solves = profile.stats.recentSolves;
  const copy = profileConfig.solves;

  return (
    <section className="space-y-6 border-t border-border pt-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs font-bold text-primary/80">{copy.marker}</div>
          <h3 className="text-2xl font-black leading-tight text-foreground sm:text-3xl">
            {copy.title}
          </h3>
          <p className="text-sm text-muted-foreground">{copy.description}</p>
        </div>
        <Button
          asChild
          variant="outline"
          className="h-11 rounded-none border-2 border-border px-6 text-xs font-bold hover:border-primary/50"
        >
          <Link href="/submissions">{copy.action}</Link>
        </Button>
      </div>
      {solves.length === 0 ? (
        <div className="border-2 border-border bg-background/60 p-6 text-sm text-muted-foreground">
          {copy.empty}
        </div>
      ) : (
        <div className="grid gap-px bg-border/30">
          {solves.map((solve) => (
            <div key={solve.id} className="bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Link
                    href={`/problems/${solve.problem.slug}`}
                    className="text-sm font-bold uppercase tracking-tight text-foreground transition-colors hover:text-primary"
                  >
                    {solve.problem.title}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {solve.problem.difficulty
                      ? `${formatDifficulty(solve.problem.difficulty)} • `
                      : null}
                    {formatDistanceToNow(new Date(solve.createdAt), { addSuffix: true })}
                  </div>
                </div>
                <Badge variant="outline" className="rounded-none border-2 border-border px-3">
                  {solve.languageCode}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function BadgesSection({ profile }: { profile: ProfileDetail }) {
  const copy = profileConfig.badges;
  if (profile.badges.length === 0) {
    return (
      <section className="space-y-4 border-t border-border pt-12">
        <div className="text-xs font-bold text-primary/80">{copy.marker}</div>
        <div className="border-2 border-border bg-background/60 p-6 text-sm text-muted-foreground">
          {copy.empty}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 border-t border-border pt-12">
      <div className="text-xs font-bold text-primary/80">{copy.marker}</div>
      <div className="grid gap-px bg-border/30 sm:grid-cols-2 lg:grid-cols-3">
        {profile.badges.map((badge) => (
          <div key={badge.slug} className="bg-background p-6">
            <p className="text-sm font-bold uppercase tracking-wide text-foreground">
              {badge.name}
            </p>
            {badge.description ? (
              <p className="mt-2 text-xs text-muted-foreground">{badge.description}</p>
            ) : null}
            <p className="mt-4 text-[11px] uppercase text-muted-foreground">
              Awarded {formatDistanceToNow(badge.awardedAt, { addSuffix: true })}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function StaffInsights({ insights }: { insights: NonNullable<ProfileDetail["staffInsights"]> }) {
  const { staff } = profileConfig;
  const rows = [
    {
      label: staff.fields.rapidSolveSpike,
      value: insights.rapidSolveSpike ? "Yes" : "No",
      tone: insights.rapidSolveSpike ? "text-destructive" : "text-muted-foreground",
    },
    {
      label: staff.fields.manualReviewCount,
      value: insights.manualReviewCount.toString(),
      tone: "text-foreground",
    },
    {
      label: staff.fields.shadowBanned,
      value: insights.shadowBanned ? "Shadow banned" : "Active",
      tone: insights.shadowBanned ? "text-destructive" : "text-success",
    },
    {
      label: "Accepted last 24h",
      value: insights.last24hAccepted.toString(),
      tone: "text-foreground",
    },
  ];

  return (
    <section className="space-y-4 border-t border-border pt-12">
      <div className="text-xs font-bold text-primary/80">{staff.marker}</div>
      <div className="border-2 border-destructive/50 bg-destructive/5 p-6">
        <div className="mb-4 flex items-center gap-3 text-sm text-destructive">
          <ShieldAlert className="h-5 w-5" />
          <span>{staff.description}</span>
        </div>
        <div className="grid gap-px bg-border/30">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between bg-background/80 px-4 py-3 text-sm"
            >
              <span className="text-muted-foreground">{row.label}</span>
              <span className={cn("font-bold uppercase", row.tone)}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProfilePrivacyCard({
  handle,
  settings,
}: {
  handle: string;
  settings: ProfileSettingsInput;
}) {
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
  const copy = profileConfig.privacy;

  return (
    <section className="space-y-4 border-t border-border pt-12">
      <div className="text-xs font-bold text-primary/80">{copy.marker}</div>
      <div className="border-2 border-border bg-background p-8">
        <p className="text-sm text-muted-foreground">{copy.description}</p>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            className="mt-6 space-y-8"
          >
            <div className="grid gap-3">
              {copy.toggles.map((toggle) => renderToggle(form, toggle))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {SOCIAL_FIELDS.map((field) => (
                <FormField
                  key={field.key}
                  control={form.control}
                  name={`socials.${field.key}` as const}
                  render={({ field: socialField }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wide">
                        {field.label}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={`https://${field.key}.com/you`}
                          value={socialField.value ?? ""}
                          onChange={(event) => socialField.onChange(event.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="h-11 rounded-none border-2 border-primary px-8 text-xs font-bold"
              >
                {mutation.isPending ? "Saving…" : copy.action}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </section>
  );
}

function renderToggle(
  form: UseFormReturn<ProfileSettingsInput>,
  toggle: (typeof profileConfig.privacy.toggles)[number],
) {
  return (
    <FormField
      key={toggle.name}
      control={form.control}
      name={toggle.name as ProfileToggleName}
      render={({ field }) => (
        <FormItem className="flex items-center justify-between border-2 border-border bg-background/70 px-4 py-4">
          <div className="space-y-1">
            <FormLabel className="text-xs font-bold uppercase tracking-wide">
              {toggle.label}
            </FormLabel>
            <p className="text-xs text-muted-foreground">{toggle.description}</p>
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
    <div className="space-y-8 font-mono">
      <div className="border-2 border-border bg-background p-8">
        <Skeleton className="mb-4 h-4 w-32" />
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
          <Skeleton className="h-32 w-32" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="border-2 border-border bg-background p-6">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="mt-3 h-6 w-20" />
          </div>
        ))}
      </div>
      <div className="border-2 border-border bg-background p-8">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    </div>
  );
}

function formatCountry(country: string) {
  const code = country.trim().toUpperCase();
  const flag =
    code.length === 2
      ? String.fromCodePoint(...code.split("").map((char) => 127397 + char.charCodeAt(0)))
      : "";
  return `${flag} ${code}`.trim();
}

function buildSocialLinks(
  socials: ProfileDetail["socials"],
  visible: boolean,
): Array<{ href: string; label: string; icon: ReactNode }> {
  if (!visible) {
    return [];
  }
  const links: Array<{ href: string; label: string; icon: ReactNode }> = [];
  if (socials.github) {
    links.push({ href: socials.github, label: "GitHub", icon: <Github className="h-4 w-4" /> });
  }
  if (socials.linkedin) {
    links.push({
      href: socials.linkedin,
      label: "LinkedIn",
      icon: <Linkedin className="h-4 w-4" />,
    });
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
