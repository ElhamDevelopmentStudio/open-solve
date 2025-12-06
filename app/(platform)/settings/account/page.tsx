"use client";

import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  LogOut,
  Mail,
  Monitor,
  Shield,
  Smartphone,
  Tablet,
  Trash2,
  User as UserIcon,
  XCircle,
} from "@/components/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  Input,
  Skeleton,
} from "@/components/ui";
import { settingsConfig } from "@/config/settings";
import { invalidateAuthSession } from "@/lib/react-query/invalidation";
import { sessionQueryOptions, userScopedListOptions } from "@/lib/react-query/policies";
import { trpc } from "@/lib/trpc/client";

export default function AccountSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isLoading } = trpc.auth.getSession.useQuery(undefined, {
    ...sessionQueryOptions,
  });
  const { data: sessions } = trpc.auth.getSessions.useQuery(undefined, {
    ...userScopedListOptions,
    enabled: Boolean(session),
  });
  const resendVerification = trpc.auth.resendVerificationEmail.useMutation({
    onSuccess: (data) => {
      toast.success("Verification email sent", {
        description: data.message,
      });
    },
    onError: (e) => {
      toast.error("Failed to send verification", {
        description: e.message,
      });
    },
  });
  const [deletePassword, setDeletePassword] = useState("");

  const signOutAllMutation = trpc.auth.signOutAllDevices.useMutation({
    onSuccess: () => {
      toast.success("Signed out everywhere", {
        description: "All active sessions have been terminated",
      });
      invalidateAuthSession(queryClient);
      router.push("/sign-in");
      router.refresh();
    },
    onError: (error) => {
      toast.error("Failed to sign out", {
        description: error.message,
      });
    },
  });

  const revokeSessionMutation = trpc.auth.revokeSession.useMutation({
    onSuccess: () => {
      toast.success("Session revoked", {
        description: "The device has been signed out",
      });
      invalidateAuthSession(queryClient);
    },
    onError: (error) => {
      toast.error("Failed to revoke session", {
        description: error.message,
      });
    },
  });

  const deleteAccountMutation = trpc.auth.deleteAccount.useMutation({
    onSuccess: () => {
      toast.success("Account deleted", {
        description: "Your account and all data have been permanently removed",
      });
      queryClient.clear();
      router.push("/");
      router.refresh();
    },
    onError: (error) => {
      toast.error("Failed to delete account", {
        description: error.message,
      });
    },
  });

  const getDeviceIcon = (userAgent: string | null) => {
    const ua = userAgent?.toLowerCase() ?? "";
    if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
      return <Smartphone className="h-5 w-5 text-muted-foreground" />;
    }
    if (ua.includes("tablet") || ua.includes("ipad")) {
      return <Tablet className="h-5 w-5 text-muted-foreground" />;
    }
    return <Monitor className="h-5 w-5 text-muted-foreground" />;
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 animate-fade-in font-mono text-foreground">
        <Skeleton className="h-10 w-64 border-2 border-border" />
        <div className="space-y-3 border-2 border-border bg-card p-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const metrics = [
    {
      label: settingsConfig.account.stats.verification,
      value: session.user.emailVerified
        ? settingsConfig.account.info.verified
        : settingsConfig.account.info.unverified,
    },
    {
      label: settingsConfig.account.stats.sessions,
      value: `${sessions?.length ?? 0}`,
    },
    {
      label: settingsConfig.account.stats.twoFactor,
      value: session.user.twoFactorEnabled
        ? settingsConfig.account.info.twoFactorEnabled
        : settingsConfig.account.info.twoFactorDisabled,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-10 animate-fade-in font-mono text-foreground">
      <section className="border-2 border-border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.35em] text-primary/80">
              {settingsConfig.account.marker}
              <span className="inline-flex items-center gap-2 border-2 border-border bg-background px-3 py-1 text-[10px] tracking-[0.25em] text-muted-foreground">
                <Shield className="h-4 w-4 text-primary" />
                {settingsConfig.account.badge}
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              {settingsConfig.account.headline.line1}
              <br />
              {settingsConfig.account.headline.line2}
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                {settingsConfig.account.headline.line3}
              </span>
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              {settingsConfig.account.description}
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-md">
            {metrics.map((stat) => (
              <div
                key={stat.label}
                className="border-2 border-border bg-background px-4 py-3 text-left"
              >
                <p className="text-[11px] uppercase text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-black">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <SectionHeader
          marker={settingsConfig.account.info.marker}
          title={settingsConfig.account.info.title}
          description={settingsConfig.account.info.description}
        />
        <div className="grid gap-px bg-border/30 sm:grid-cols-2">
          <div className="flex flex-col gap-3 border-2 border-border bg-background p-5">
            <LabelRow
              icon={<Mail className="h-4 w-4" />}
              label={settingsConfig.account.info.emailLabel}
            />
            <div className="flex items-center gap-3">
              <p className="text-base font-bold">{session.user.email}</p>
              {session.user.emailVerified ? (
                <Badge variant="success">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {settingsConfig.account.info.verified}
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="h-3.5 w-3.5" />
                  {settingsConfig.account.info.unverified}
                </Badge>
              )}
            </div>
            {!session.user.emailVerified ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => resendVerification.mutate()}
                disabled={resendVerification.isPending}
                className="h-9 rounded-none border-2 border-border px-4 text-xs font-bold uppercase"
              >
                {resendVerification.isPending
                  ? settingsConfig.account.info.resend.concat("...")
                  : settingsConfig.account.info.resend}
              </Button>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {settingsConfig.account.info.emailFootnote}
            </p>
          </div>

          <div className="flex flex-col gap-3 border-2 border-border bg-background p-5">
            <LabelRow
              icon={<UserIcon className="h-4 w-4" />}
              label={settingsConfig.account.info.usernameLabel}
            />
            <p className="text-xl font-black">@{session.user.handle}</p>
            <p className="text-xs text-muted-foreground">{settingsConfig.account.info.title}</p>
          </div>

          <div className="flex flex-col gap-3 border-2 border-border bg-background p-5">
            <LabelRow
              icon={<Shield className="h-4 w-4" />}
              label={settingsConfig.account.info.roleLabel}
            />
            <Badge variant="outline" className="border-2 px-3 py-1 text-xs font-bold uppercase">
              {session.user.role}
            </Badge>
          </div>

          <div className="flex flex-col gap-3 border-2 border-border bg-background p-5">
            <LabelRow
              icon={<Shield className="h-4 w-4" />}
              label={settingsConfig.account.info.twoFactorLabel}
            />
            <div className="flex items-center gap-3">
              <p className="text-base font-bold">
                {session.user.twoFactorEnabled
                  ? settingsConfig.account.info.twoFactorEnabled
                  : settingsConfig.account.info.twoFactorDisabled}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/settings/security")}
                className="h-9 rounded-none px-3 text-xs font-bold uppercase text-primary hover:bg-accent"
              >
                {settingsConfig.account.info.manageCta}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <SectionHeader
          marker={settingsConfig.account.sessions.marker}
          title={settingsConfig.account.sessions.title}
          description={settingsConfig.account.sessions.description}
        />
        <div className="border-2 border-border bg-background p-4">
          {sessions && sessions.length > 0 ? (
            <div className="space-y-2">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className="flex flex-col gap-3 border-2 border-border bg-card/60 p-4 transition-colors hover:border-primary/50 hover:bg-accent md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center border-2 border-border bg-background">
                      {getDeviceIcon(sess.userAgent)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold">
                          {sess.userAgent || settingsConfig.account.sessions.deviceUnknown}
                        </p>
                        {sess.isCurrent ? (
                          <Badge variant="secondary">
                            {settingsConfig.account.sessions.current}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {sess.ipAddress} · {settingsConfig.account.sessions.lastActive}{" "}
                        {formatDistanceToNow(new Date(sess.lastUsedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  {!sess.isCurrent ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => revokeSessionMutation.mutate({ sessionId: sess.id })}
                      disabled={revokeSessionMutation.isPending}
                      className="h-10 rounded-none border-2 border-border px-4 text-xs font-bold uppercase hover:border-destructive/60 hover:text-destructive"
                    >
                      {revokeSessionMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        settingsConfig.account.sessions.revoke
                      )}
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
              {settingsConfig.account.sessions.empty}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-2 border-warning/40 bg-warning/10 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-warning" />
            <div>
              <p className="text-sm font-bold uppercase">
                {settingsConfig.account.sessions.signOutAll.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {settingsConfig.account.sessions.signOutAll.description}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => signOutAllMutation.mutate()}
            disabled={signOutAllMutation.isPending}
            className="h-10 rounded-none border-2 border-warning/60 px-4 text-xs font-bold uppercase text-warning hover:bg-warning/20"
          >
            {signOutAllMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {settingsConfig.account.sessions.signOutAll.cta}
              </>
            ) : (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                {settingsConfig.account.sessions.signOutAll.cta}
              </>
            )}
          </Button>
        </div>
      </section>

      <section className="space-y-4 border-2 border-destructive/40 bg-background p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-destructive/80">
              {settingsConfig.account.danger.marker}
            </p>
            <h2 className="text-3xl font-black text-destructive">
              {settingsConfig.account.danger.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {settingsConfig.account.danger.description}
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="h-11 rounded-none px-5 font-bold uppercase">
                <Trash2 className="mr-2 h-4 w-4" />
                {settingsConfig.account.danger.deleteTitle}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-xl rounded-none border-2 border-border bg-background font-mono">
              <AlertDialogHeader>
                <AlertDialogTitle>{settingsConfig.account.danger.deleteTitle}</AlertDialogTitle>
                <AlertDialogDescription>
                  {settingsConfig.account.danger.deleteDescription}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-4">
                <div className="border-2 border-destructive/30 bg-destructive/5 p-3 text-xs text-muted-foreground">
                  <p className="font-bold text-destructive">
                    {settingsConfig.account.danger.warningTitle}
                  </p>
                  <ul className="mt-2 list-inside list-disc space-y-1">
                    {settingsConfig.account.danger.bullets.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2 text-sm">
                  <label htmlFor="delete-password" className="font-bold">
                    {settingsConfig.account.danger.passwordLabel}
                  </label>
                  <Input
                    id="delete-password"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder={settingsConfig.account.danger.confirmHelper}
                  />
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-none border-2 border-border bg-background px-4 py-2 font-mono text-sm font-bold uppercase hover:bg-accent">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (deletePassword) {
                      deleteAccountMutation.mutate({ password: deletePassword });
                    }
                  }}
                  disabled={!deletePassword || deleteAccountMutation.isPending}
                  className="rounded-none border-2 border-destructive bg-destructive px-4 py-2 font-mono text-sm font-bold uppercase text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteAccountMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {settingsConfig.account.danger.confirmCta}
                    </>
                  ) : (
                    settingsConfig.account.danger.confirmCta
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary/70">{marker}</p>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <h2 className="text-3xl font-black tracking-tight">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground md:max-w-2xl">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

function LabelRow({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
      {icon}
      {label}
    </div>
  );
}

