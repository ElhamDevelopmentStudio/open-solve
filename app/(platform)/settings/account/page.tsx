"use client";

import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Separator,
  Badge,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Input,
} from "@/components/ui";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

export default function AccountSettingsPage() {
  const router = useRouter();
  const { data: session } = trpc.auth.getSession.useQuery();
  const { data: sessions } = trpc.auth.getSessions.useQuery();
  const [deletePassword, setDeletePassword] = useState("");

  const signOutAllMutation = trpc.auth.signOutAllDevices.useMutation({
    onSuccess: () => {
      toast.success("Signed out from all devices");
      router.push("/sign-in");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const revokeSessionMutation = trpc.auth.revokeSession.useMutation({
    onSuccess: () => {
      toast.success("Session revoked");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteAccountMutation = trpc.auth.deleteAccount.useMutation({
    onSuccess: () => {
      toast.success("Account deleted");
      router.push("/");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (!session) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and security preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your basic account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium">Email</div>
            <div className="flex items-center gap-2">
              <span>{session.user.email}</span>
              {session.user.emailVerified ? (
                <Badge variant="default">Verified</Badge>
              ) : (
                <Badge variant="secondary">Not Verified</Badge>
              )}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium">Handle</div>
            <div>@{session.user.handle}</div>
          </div>
          <div>
            <div className="text-sm font-medium">Role</div>
            <Badge variant="outline">{session.user.role}</Badge>
          </div>
          <div>
            <div className="text-sm font-medium">Two-Factor Authentication</div>
            <div className="flex items-center gap-2">
              <span>
                {session.user.twoFactorEnabled ? "Enabled" : "Disabled"}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/settings/security")}
              >
                Manage
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>
            Manage devices where you're currently signed in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessions?.map((sess) => (
            <div
              key={sess.id}
              className="flex items-center justify-between border rounded-lg p-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {sess.userAgent || "Unknown Device"}
                  </span>
                  {sess.isCurrent && (
                    <Badge variant="default" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {sess.ipAddress} • Last active{" "}
                  {formatDistanceToNow(new Date(sess.lastUsedAt))} ago
                </div>
              </div>
              {!sess.isCurrent && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => revokeSessionMutation.mutate({ sessionId: sess.id })}
                  disabled={revokeSessionMutation.isPending}
                >
                  Revoke
                </Button>
              )}
            </div>
          ))}

          <Separator />

          <Button
            variant="destructive"
            onClick={() => signOutAllMutation.mutate()}
            disabled={signOutAllMutation.isPending}
          >
            Sign Out All Devices
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions. Please be careful.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your
                  account and remove all your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Enter your password to confirm:
                </label>
                <Input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Password"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (deletePassword) {
                      deleteAccountMutation.mutate({ password: deletePassword });
                    }
                  }}
                  disabled={!deletePassword || deleteAccountMutation.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

