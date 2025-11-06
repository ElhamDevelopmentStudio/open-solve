"use client";

import { trpc } from "@/lib/trpc/client";
import { invalidateAuthSession } from "@/lib/react-query/invalidation";
import { sessionQueryOptions } from "@/lib/react-query/policies";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  changePasswordSchema,
  changeEmailSchema,
  type ChangePasswordInput,
  type ChangeEmailInput,
} from "@/lib/validators/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Badge,
} from "@/components/ui";
import { toast } from "sonner";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useQueryClient } from "@tanstack/react-query";

export default function SecuritySettingsPage() {
  const queryClient = useQueryClient();
  const { data: session } = trpc.auth.getSession.useQuery(undefined, {
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
      toast.success(data.message);
      passwordForm.reset();
      invalidateAuthSession(queryClient);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const changeEmailMutation = trpc.auth.changeEmail.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      emailForm.reset();
      invalidateAuthSession(queryClient);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const setupTwoFactorMutation = trpc.auth.setupTwoFactor.useMutation({
    onSuccess: (data) => {
      setTwoFactorSetup(data);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const enableTwoFactorMutation = trpc.auth.enableTwoFactor.useMutation({
    onSuccess: (data) => {
      setRecoveryCodes(data.recoveryCodes);
      setTwoFactorSetup(null);
      toast.success("Two-factor authentication enabled");
      invalidateAuthSession(queryClient);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const disableTwoFactorMutation = trpc.auth.disableTwoFactor.useMutation({
    onSuccess: () => {
      toast.success("Two-factor authentication disabled");
      invalidateAuthSession(queryClient);
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
        <h1 className="text-3xl font-bold">Security Settings</h1>
        <p className="text-muted-foreground">Manage your password and security preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form
              onSubmit={passwordForm.handleSubmit((data) => changePasswordMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
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
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      At least 8 characters with uppercase, lowercase, and numbers
                    </p>
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={changePasswordMutation.isPending}>
                {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Email</CardTitle>
          <CardDescription>Update your email address</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...emailForm}>
            <form
              onSubmit={emailForm.handleSubmit((data) => changeEmailMutation.mutate(data))}
              className="space-y-4"
            >
              <div>
                <div className="text-sm font-medium mb-2">Current Email</div>
                <div className="text-sm text-muted-foreground">{session.user.email}</div>
              </div>

              <FormField
                control={emailForm.control}
                name="newEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
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
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={changeEmailMutation.isPending}>
                {changeEmailMutation.isPending ? "Updating..." : "Update Email"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Status</div>
              <div className="text-sm text-muted-foreground">
                {session.user.twoFactorEnabled ? (
                  <Badge variant="default">Enabled</Badge>
                ) : (
                  <Badge variant="secondary">Disabled</Badge>
                )}
              </div>
            </div>
            {!session.user.twoFactorEnabled ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button onClick={() => setupTwoFactorMutation.mutate()}>Enable 2FA</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
                    <DialogDescription>
                      Scan this QR code with your authenticator app
                    </DialogDescription>
                  </DialogHeader>

                  {twoFactorSetup && (
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <QRCodeSVG value={twoFactorSetup.uri} size={200} />
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">Manual Entry</div>
                        <div className="text-xs text-muted-foreground break-all p-2 bg-muted rounded">
                          {twoFactorSetup.secret}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Enter your password</label>
                        <Input
                          type="password"
                          value={setupPassword}
                          onChange={(e) => setSetupPassword(e.target.value)}
                          placeholder="Password"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Enter verification code</label>
                        <Input
                          type="text"
                          maxLength={6}
                          value={setupCode}
                          onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="000000"
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
                        className="w-full"
                      >
                        {enableTwoFactorMutation.isPending ? "Enabling..." : "Enable 2FA"}
                      </Button>
                    </div>
                  )}

                  {recoveryCodes.length > 0 && (
                    <div className="space-y-4">
                      <div className="text-sm font-medium text-center">
                        Save these recovery codes in a safe place!
                      </div>
                      <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded">
                        {recoveryCodes.map((code, i) => (
                          <div key={i} className="text-sm font-mono">
                            {code}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        You'll need these codes to access your account if you lose your
                        authenticator device.
                      </p>
                    </div>
                  )}
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
              >
                Disable 2FA
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}







