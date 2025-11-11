"use client";

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Skeleton,
} from "@/components/ui";
import { invalidateAuthSession } from "@/lib/react-query/invalidation";
import { sessionQueryOptions } from "@/lib/react-query/policies";
import { trpc } from "@/lib/trpc/client";
import {
  changeEmailSchema,
  changePasswordSchema,
  type ChangeEmailInput,
  type ChangePasswordInput,
} from "@/lib/validators/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Copy, Key, Loader2, Mail, Shield, ShieldCheck } from "@/components/icons";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export default function SecuritySettingsPage() {
  const queryClient = useQueryClient();
  const { data: session, isLoading } = trpc.auth.getSession.useQuery(undefined, {
    ...sessionQueryOptions,
  });
  const [twoFactorSetup, setTwoFactorSetup] = useState<{
    secret: string;
    uri: string;
    qrCodeUrl: string;
  } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [setupCode, setSetupCode] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
    },
  });

  const emailForm = useForm<ChangeEmailInput>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: {
      newEmail: "",
      password: "",
    },
  });

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: (data) => {
      toast.success("Password updated", {
        description: data.message,
      });
      passwordForm.reset();
      invalidateAuthSession(queryClient);
    },
    onError: (error) => {
      toast.error("Failed to update password", {
        description: error.message,
      });
    },
  });

  const changeEmailMutation = trpc.auth.changeEmail.useMutation({
    onSuccess: (data) => {
      toast.success("Email updated", {
        description: data.message,
      });
      emailForm.reset();
      invalidateAuthSession(queryClient);
    },
    onError: (error) => {
      toast.error("Failed to update email", {
        description: error.message,
      });
    },
  });

  const setupTwoFactorMutation = trpc.auth.setupTwoFactor.useMutation({
    onSuccess: (data) => {
      setTwoFactorSetup(data);
      setDialogOpen(true);
    },
    onError: (error) => {
      toast.error("Failed to setup 2FA", {
        description: error.message,
      });
    },
  });

  const enableTwoFactorMutation = trpc.auth.enableTwoFactor.useMutation({
    onSuccess: (data) => {
      setRecoveryCodes(data.recoveryCodes);
      setTwoFactorSetup(null);
      toast.success("2FA enabled", {
        description: "Two-factor authentication is now active",
      });
      invalidateAuthSession(queryClient);
    },
    onError: (error) => {
      toast.error("Failed to enable 2FA", {
        description: error.message,
      });
    },
  });

  const disableTwoFactorMutation = trpc.auth.disableTwoFactor.useMutation({
    onSuccess: () => {
      toast.success("2FA disabled", {
        description: "Two-factor authentication has been turned off",
      });
      setDialogOpen(false);
      invalidateAuthSession(queryClient);
    },
    onError: (error) => {
      toast.error("Failed to disable 2FA", {
        description: error.message,
      });
    },
  });

  const handleCopyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    toast.success("Recovery codes copied", {
      description: "Paste them somewhere safe",
    });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-8 animate-fade-in">
        <div>
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="mt-2 h-4 w-96 rounded-lg" />
        </div>
        <div className="premium-card space-y-6 rounded-2xl p-8">
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
        <p className="text-base text-muted-foreground">
          Manage your password, email, and two-factor authentication
        </p>
      </div>

      <div className="premium-card space-y-6 rounded-2xl p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Key className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Change Password</h2>
            <p className="text-sm text-muted-foreground">Update your password to keep your account secure</p>
          </div>
        </div>

        <div className="h-px bg-border/50" />

        <Form {...passwordForm}>
          <form
            onSubmit={passwordForm.handleSubmit((data) => changePasswordMutation.mutate(data))}
            className="space-y-5"
          >
            <FormField
              control={passwordForm.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Current Password</FormLabel>
                  <FormControl>
                    <Input type="password" className="rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={passwordForm.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">New Password</FormLabel>
                  <FormControl>
                    <Input type="password" className="rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    At least 8 characters with uppercase, lowercase, and numbers
                  </p>
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-sm">
                {changePasswordMutation.isSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-success">Password updated</span>
                  </>
                ) : null}
              </div>
              <Button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="rounded-xl"
              >
                {changePasswordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <div className="premium-card space-y-6 rounded-2xl p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
            <Mail className="h-5 w-5 text-info" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Change Email</h2>
            <p className="text-sm text-muted-foreground">Update your email address</p>
          </div>
        </div>

        <div className="h-px bg-border/50" />

        <Form {...emailForm}>
          <form
            onSubmit={emailForm.handleSubmit((data) => changeEmailMutation.mutate(data))}
            className="space-y-5"
          >
            <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Current Email
              </div>
              <p className="mt-1 font-medium">{session.user.email}</p>
            </div>

            <FormField
              control={emailForm.control}
              name="newEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">New Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="your@email.com" className="rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={emailForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Your password" className="rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-sm">
                {changeEmailMutation.isSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-success">Email updated</span>
                  </>
                ) : null}
              </div>
              <Button
                type="submit"
                disabled={changeEmailMutation.isPending}
                className="rounded-xl"
              >
                {changeEmailMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Email"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <div className="premium-card space-y-6 rounded-2xl p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
            <ShieldCheck className="h-5 w-5 text-success" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Two-Factor Authentication</h2>
            <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
          </div>
          <Badge
            variant={session.user.twoFactorEnabled ? "default" : "secondary"}
            className="rounded-full"
          >
            {session.user.twoFactorEnabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>

        <div className="h-px bg-border/50" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {session.user.twoFactorEnabled
                ? "Two-factor authentication is active"
                : "Protect your account with 2FA"}
            </p>
            <p className="text-xs text-muted-foreground">
              {session.user.twoFactorEnabled
                ? "Your account is secured with an authenticator app"
                : "Use an authenticator app to generate verification codes"}
            </p>
          </div>

          {!session.user.twoFactorEnabled ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => setupTwoFactorMutation.mutate()}
                  disabled={setupTwoFactorMutation.isPending}
                  className="rounded-xl"
                >
                  {setupTwoFactorMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="mr-2 h-4 w-4" />
                  )}
                  Enable 2FA
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
                  <DialogDescription>
                    Scan this QR code with your authenticator app
                  </DialogDescription>
                </DialogHeader>

                {twoFactorSetup && !recoveryCodes.length ? (
                  <div className="space-y-5">
                    <div className="flex justify-center rounded-xl bg-background p-6">
                      <QRCodeSVG value={twoFactorSetup.uri} size={200} />
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Manual Entry Code</p>
                      <div className="rounded-xl border border-border/50 bg-muted/40 p-3">
                        <p className="break-all font-mono text-xs">{twoFactorSetup.secret}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="setup-password" className="text-sm font-semibold">
                        Confirm your password
                      </label>
                      <Input
                        id="setup-password"
                        type="password"
                        value={setupPassword}
                        onChange={(e) => setSetupPassword(e.target.value)}
                        placeholder="Your password"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="setup-code" className="text-sm font-semibold">
                        Enter verification code
                      </label>
                      <Input
                        id="setup-code"
                        type="text"
                        maxLength={6}
                        value={setupCode}
                        onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="000000"
                        className="rounded-xl text-center font-mono text-lg tracking-widest"
                      />
                    </div>

                    <Button
                      onClick={() => {
                        if (setupPassword && setupCode.length === 6) {
                          enableTwoFactorMutation.mutate({
                            password: setupPassword,
                            code: setupCode,
                          });
                        }
                      }}
                      disabled={
                        !setupPassword ||
                        setupCode.length !== 6 ||
                        enableTwoFactorMutation.isPending
                      }
                      className="w-full rounded-xl"
                    >
                      {enableTwoFactorMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enabling...
                        </>
                      ) : (
                        "Enable 2FA"
                      )}
                    </Button>
                  </div>
                ) : null}

                {recoveryCodes.length > 0 ? (
                  <div className="space-y-5">
                    <div className="rounded-xl border border-success/30 bg-success/5 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-success">
                        <CheckCircle2 className="h-4 w-4" />
                        2FA Successfully Enabled
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Save these recovery codes in a secure location
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">Recovery Codes</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyRecoveryCodes}
                          className="h-8 rounded-lg text-xs"
                        >
                          <Copy className="mr-2 h-3.5 w-3.5" />
                          Copy All
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/50 bg-muted/40 p-4">
                        {recoveryCodes.map((code, i) => (
                          <div key={i} className="rounded-lg bg-background p-2 font-mono text-xs">
                            {code}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-muted-foreground">
                      <p className="font-semibold text-warning">Important:</p>
                      <p className="mt-1">
                        You&apos;ll need these codes to access your account if you lose your
                        authenticator device. Store them somewhere safe.
                      </p>
                    </div>

                    <Button
                      onClick={() => {
                        setRecoveryCodes([]);
                        setDialogOpen(false);
                      }}
                      className="w-full rounded-xl"
                    >
                      Done
                    </Button>
                  </div>
                ) : null}
              </DialogContent>
            </Dialog>
          ) : (
            <Button
              variant="destructive"
              onClick={() => {
                const password = prompt("Enter your password to disable 2FA:");
                const code = prompt("Enter your 2FA code or recovery code:");
                if (password && code) {
                  disableTwoFactorMutation.mutate({
                    password,
                    code: code.length === 6 ? code : undefined,
                    recoveryCode: code.length !== 6 ? code : undefined,
                  });
                }
              }}
              disabled={disableTwoFactorMutation.isPending}
              className="rounded-xl"
            >
              {disableTwoFactorMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disabling...
                </>
              ) : (
                "Disable 2FA"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}









