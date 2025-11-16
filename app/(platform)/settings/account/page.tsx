"use client";

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
import { invalidateAuthSession } from "@/lib/react-query/invalidation";
import { sessionQueryOptions, userScopedListOptions } from "@/lib/react-query/policies";
import { trpc } from "@/lib/trpc/client";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
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
  XCircle
} from "@/components/icons";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

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
      <div className="mx-auto max-w-4xl space-y-8 animate-fade-in">
        <div>
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="mt-2 h-4 w-96 rounded-lg" />
        </div>
        <div className="premium-card space-y-6 rounded-2xl p-8">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-base text-muted-foreground">
          Manage your account details and security preferences
        </p>
      </div>

      <div className="premium-card space-y-6 rounded-2xl p-8">
        <div>
          <h2 className="text-lg font-semibold">Account Information</h2>
          <p className="text-sm text-muted-foreground">Your core account details</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2 rounded-xl border border-border/50 bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              Email Address
            </div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{session.user.email}</p>
              {session.user.emailVerified ? (
                <Badge variant="default" className="h-5 gap-1 rounded-full text-[10px]">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="secondary" className="h-5 gap-1 rounded-full text-[10px]">
                  <XCircle className="h-3 w-3" />
                  Not Verified
                </Badge>
              )}
            </div>
            {!session.user.emailVerified ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => resendVerification.mutate()}
                disabled={resendVerification.isPending}
                className="mt-2 h-8 rounded-lg text-xs"
              >
                {resendVerification.isPending ? "Sending..." : "Resend Verification"}
              </Button>
            ) : null}
          </div>

          <div className="space-y-2 rounded-xl border border-border/50 bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <UserIcon className="h-3.5 w-3.5" />
              Username
            </div>
            <p className="font-medium">@{session.user.handle}</p>
          </div>

          <div className="space-y-2 rounded-xl border border-border/50 bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              Account Role
            </div>
            <Badge variant="outline" className="rounded-full">
              {session.user.role}
            </Badge>
          </div>

          <div className="space-y-2 rounded-xl border border-border/50 bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              Two-Factor Auth
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">
                {session.user.twoFactorEnabled ? "Enabled" : "Disabled"}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/settings/security")}
                className="h-7 rounded-lg text-xs"
              >
                Manage
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="premium-card space-y-6 rounded-2xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Active Sessions</h2>
            <p className="text-sm text-muted-foreground">
              Devices where you&apos;re currently signed in
            </p>
          </div>
          <Badge variant="outline" className="rounded-full">
            {sessions?.length ?? 0} active
          </Badge>
        </div>

        <div className="space-y-3">
          {sessions?.map((sess) => (
            <div
              key={sess.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-card/50 p-4 smooth-transition hover:border-border"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/60">
                  {getDeviceIcon(sess.userAgent)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {sess.userAgent || "Unknown Device"}
                    </p>
                    {sess.isCurrent ? (
                      <Badge variant="default" className="h-5 rounded-full text-[10px]">
                        Current
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {sess.ipAddress} · Last active{" "}
                    {formatDistanceToNow(new Date(sess.lastUsedAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
              {!sess.isCurrent ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revokeSessionMutation.mutate({ sessionId: sess.id })}
                  disabled={revokeSessionMutation.isPending}
                  className="h-8 rounded-lg text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  {revokeSessionMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Revoke"
                  )}
                </Button>
              ) : null}
            </div>
          ))}
        </div>

        <div className="h-px bg-border/50" />

        <div className="flex items-center justify-between rounded-xl border border-warning/30 bg-warning/5 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <div>
              <p className="text-sm font-semibold">Sign out everywhere</p>
              <p className="text-xs text-muted-foreground">
                Terminate all active sessions on all devices
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => signOutAllMutation.mutate()}
            disabled={signOutAllMutation.isPending}
            className="rounded-xl border-warning/40 text-warning hover:bg-warning/10"
          >
            {signOutAllMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            Sign Out All
          </Button>
        </div>
      </div>

      <div className="premium-card space-y-6 rounded-2xl border-destructive/20 p-8">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
            <p className="text-sm text-muted-foreground">
              Irreversible actions. Please proceed with caution.
            </p>
          </div>
        </div>

        <div className="h-px bg-destructive/20" />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="w-full rounded-xl sm:w-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Account Permanently?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your account and
                remove all your data from our servers including submissions, proposals, and
                progress.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-muted-foreground">
                <p className="font-semibold text-destructive">Warning:</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5">
                  <li>All your submissions will be permanently deleted</li>
                  <li>Your profile and statistics will be removed</li>
                  <li>This action cannot be reversed</li>
                </ul>
              </div>
              <div>
                <label htmlFor="delete-password" className="text-sm font-medium">
                  Enter your password to confirm:
                </label>
                <Input
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Your password"
                  className="mt-2 rounded-xl"
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deletePassword) {
                    deleteAccountMutation.mutate({ password: deletePassword });
                  }
                }}
                disabled={!deletePassword || deleteAccountMutation.isPending}
                className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteAccountMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Account"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}









