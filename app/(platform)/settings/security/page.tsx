"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

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
import { CheckCircle2, Copy, Loader2, Shield } from "@/components/icons";
import { settingsConfig } from "@/config/settings";
import { invalidateAuthSession } from "@/lib/react-query/invalidation";
import { sessionQueryOptions } from "@/lib/react-query/policies";
import { trpc } from "@/lib/trpc/client";
import {
  changeEmailSchema,
  changePasswordSchema,
  type ChangeEmailInput,
  type ChangePasswordInput,
} from "@/lib/validators/auth";

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
      description: settingsConfig.security.sections.twoFactor.recoveryDescription,
    });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 animate-fade-in font-mono text-foreground">
        <Skeleton className="h-10 w-64 border-2 border-border" />
        <div className="space-y-3 border-2 border-border bg-card p-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const stats = [
    {
      label: settingsConfig.security.sections.password.title,
      value: settingsConfig.security.sections.password.marker,
    },
    {
      label: settingsConfig.security.sections.email.title,
      value: session.user.email,
    },
    {
      label: settingsConfig.security.sections.twoFactor.title,
      value: session.user.twoFactorEnabled
        ? settingsConfig.security.sections.twoFactor.statusEnabled
        : settingsConfig.security.sections.twoFactor.statusDisabled,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-10 animate-fade-in font-mono text-foreground">
      <section className="border-2 border-border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.35em] text-primary/80">
              {settingsConfig.security.marker}
              <span className="inline-flex items-center gap-2 border-2 border-border bg-background px-3 py-1 text-[10px] tracking-[0.25em] text-muted-foreground">
                <Shield className="h-4 w-4 text-primary" />
                {settingsConfig.security.badge}
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              {settingsConfig.security.headline.line1}
              <br />
              {settingsConfig.security.headline.line2}
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                {settingsConfig.security.headline.line3}
              </span>
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              {settingsConfig.security.description}
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-md">
            {stats.map((stat) => (
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

      <section className="space-y-6">
        <SectionHeader
          marker={settingsConfig.security.sections.password.marker}
          title={settingsConfig.security.sections.password.title}
          description={settingsConfig.security.sections.password.description}
        />
        <Form {...passwordForm}>
          <form
            onSubmit={passwordForm.handleSubmit((data) => changePasswordMutation.mutate(data))}
            className="space-y-5 border-2 border-border bg-card p-6"
          >
            <FormField
              control={passwordForm.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-bold uppercase tracking-[0.15em]">
                    {settingsConfig.security.sections.password.currentLabel}
                  </FormLabel>
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
                  <FormLabel className="text-sm font-bold uppercase tracking-[0.15em]">
                    {settingsConfig.security.sections.password.newLabel}
                  </FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    {settingsConfig.security.sections.password.helper}
                  </p>
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between border-t-2 border-border pt-3">
              <div className="flex items-center gap-2 text-sm">
                {changePasswordMutation.isSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-success">
                      {settingsConfig.security.sections.password.success}
                    </span>
                  </>
                ) : null}
              </div>
              <Button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="h-11 rounded-none border-2 border-primary bg-primary px-6 font-mono text-xs font-bold uppercase text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30"
              >
                {changePasswordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {settingsConfig.security.sections.password.cta}
                  </>
                ) : (
                  settingsConfig.security.sections.password.cta
                )}
              </Button>
            </div>
          </form>
        </Form>
      </section>

      <section className="space-y-6">
        <SectionHeader
          marker={settingsConfig.security.sections.email.marker}
          title={settingsConfig.security.sections.email.title}
          description={settingsConfig.security.sections.email.description}
        />
        <Form {...emailForm}>
          <form
            onSubmit={emailForm.handleSubmit((data) => changeEmailMutation.mutate(data))}
            className="space-y-5 border-2 border-border bg-card p-6"
          >
            <div className="border-2 border-border bg-background px-4 py-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {settingsConfig.security.sections.email.currentLabel}
              </div>
              <p className="mt-2 text-base font-black">{session.user.email}</p>
            </div>

            <FormField
              control={emailForm.control}
              name="newEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-bold uppercase tracking-[0.15em]">
                    {settingsConfig.security.sections.email.newLabel}
                  </FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="your@email.com" {...field} />
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
                  <FormLabel className="text-sm font-bold uppercase tracking-[0.15em]">
                    {settingsConfig.security.sections.email.passwordLabel}
                  </FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Your password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between border-t-2 border-border pt-3">
              <div className="flex items-center gap-2 text-sm">
                {changeEmailMutation.isSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-success">
                      {settingsConfig.security.sections.email.success}
                    </span>
                  </>
                ) : null}
              </div>
              <Button
                type="submit"
                disabled={changeEmailMutation.isPending}
                className="h-11 rounded-none border-2 border-primary bg-primary px-6 font-mono text-xs font-bold uppercase text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30"
              >
                {changeEmailMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {settingsConfig.security.sections.email.cta}
                  </>
                ) : (
                  settingsConfig.security.sections.email.cta
                )}
              </Button>
            </div>
          </form>
        </Form>
      </section>

      <section className="space-y-6 border-2 border-border bg-card p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary/70">
              {settingsConfig.security.sections.twoFactor.marker}
            </p>
            <h2 className="text-3xl font-black tracking-tight">
              {settingsConfig.security.sections.twoFactor.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {settingsConfig.security.sections.twoFactor.description}
            </p>
          </div>
          <Badge
            variant={session.user.twoFactorEnabled ? "success" : "secondary"}
            className="rounded-none border-2 border-border px-3 py-1 font-mono text-[10px] font-bold uppercase"
          >
            {session.user.twoFactorEnabled
              ? settingsConfig.security.sections.twoFactor.statusEnabled
              : settingsConfig.security.sections.twoFactor.statusDisabled}
          </Badge>
        </div>

        <div className="flex flex-col gap-4 border-2 border-border bg-background p-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-bold">
              {session.user.twoFactorEnabled
                ? settingsConfig.security.sections.twoFactor.statusEnabled
                : settingsConfig.security.sections.twoFactor.statusDisabled}
            </p>
            <p className="text-xs text-muted-foreground">
              {session.user.twoFactorEnabled
                ? "Your account is secured with an authenticator app."
                : "Use an authenticator app to generate verification codes."}
            </p>
          </div>

          {!session.user.twoFactorEnabled ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => setupTwoFactorMutation.mutate()}
                  disabled={setupTwoFactorMutation.isPending}
                  className="h-11 rounded-none border-2 border-primary bg-primary px-5 font-mono text-xs font-bold uppercase text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30"
                >
                  {setupTwoFactorMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="mr-2 h-4 w-4" />
                  )}
                  {settingsConfig.security.sections.twoFactor.enableCta}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl rounded-none border-2 border-border bg-background font-mono">
                <DialogHeader>
                  <DialogTitle>{settingsConfig.security.sections.twoFactor.enableCta}</DialogTitle>
                  <DialogDescription>
                    {settingsConfig.security.sections.twoFactor.description}
                  </DialogDescription>
                </DialogHeader>

                {twoFactorSetup && !recoveryCodes.length ? (
                  <div className="space-y-5">
                    <div className="flex justify-center border-2 border-border bg-background p-6">
                      <QRCodeSVG value={twoFactorSetup.uri} size={200} />
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-bold uppercase tracking-[0.15em]">
                        {settingsConfig.security.sections.twoFactor.manualCodeLabel}
                      </p>
                      <div className="border-2 border-border bg-muted/30 p-3">
                        <p className="break-all font-mono text-xs">{twoFactorSetup.secret}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="setup-password"
                        className="text-sm font-bold uppercase tracking-[0.15em]"
                      >
                        {settingsConfig.security.sections.twoFactor.confirmPasswordLabel}
                      </label>
                      <Input
                        id="setup-password"
                        type="password"
                        value={setupPassword}
                        onChange={(e) => setSetupPassword(e.target.value)}
                        placeholder="Your password"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="setup-code"
                        className="text-sm font-bold uppercase tracking-[0.15em]"
                      >
                        {settingsConfig.security.sections.twoFactor.verificationCodeLabel}
                      </label>
                      <Input
                        id="setup-code"
                        type="text"
                        maxLength={6}
                        value={setupCode}
                        onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ""))}
                        placeholder={
                          settingsConfig.security.sections.twoFactor.verificationPlaceholder
                        }
                        className="text-center font-mono text-lg tracking-widest"
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
                      className="h-11 w-full rounded-none border-2 border-primary bg-primary px-5 font-mono text-xs font-bold uppercase text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30"
                    >
                      {enableTwoFactorMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {settingsConfig.security.sections.twoFactor.enableAction}
                        </>
                      ) : (
                        settingsConfig.security.sections.twoFactor.enableAction
                      )}
                    </Button>
                  </div>
                ) : null}

                {recoveryCodes.length > 0 ? (
                  <div className="space-y-5">
                    <div className="border-2 border-success/30 bg-success/5 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-success">
                        <CheckCircle2 className="h-4 w-4" />
                        {settingsConfig.security.sections.twoFactor.statusEnabled}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {settingsConfig.security.sections.twoFactor.recoveryDescription}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold uppercase tracking-[0.15em]">
                          {settingsConfig.security.sections.twoFactor.recoveryTitle}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyRecoveryCodes}
                          className="h-9 rounded-none px-3 text-xs font-bold uppercase"
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          {settingsConfig.security.sections.twoFactor.copyAll}
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 border-2 border-border bg-muted/30 p-4">
                        {recoveryCodes.map((code) => (
                          <div
                            key={code}
                            className="border-2 border-border bg-background p-2 font-mono text-xs"
                          >
                            {code}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-2 border-warning/30 bg-warning/10 p-3 text-xs text-muted-foreground">
                      <p className="font-bold text-warning">Important</p>
                      <p className="mt-1">
                        {settingsConfig.security.sections.twoFactor.importantNote}
                      </p>
                    </div>

                    <Button
                      onClick={() => {
                        setRecoveryCodes([]);
                        setDialogOpen(false);
                      }}
                      className="h-11 w-full rounded-none border-2 border-border bg-background px-5 font-mono text-xs font-bold uppercase hover:border-primary/50 hover:bg-accent"
                    >
                      {settingsConfig.security.sections.twoFactor.done}
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
              className="h-11 rounded-none border-2 border-destructive bg-destructive px-5 font-mono text-xs font-bold uppercase text-destructive-foreground hover:bg-destructive/90"
            >
              {disableTwoFactorMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {settingsConfig.security.sections.twoFactor.disableCta}
                </>
              ) : (
                settingsConfig.security.sections.twoFactor.disableCta
              )}
            </Button>
          )}
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

