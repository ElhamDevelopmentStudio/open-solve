"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc/client";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validators/auth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ArrowRight, CheckCircle2, ShieldCheck, AlertTriangle } from "@/components/icons";
import { authConfig } from "@/config/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") || "";

  const { resetPassword } = authConfig;

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token,
      password: "",
    },
  });

  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      router.push("/sign-in");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (data: ResetPasswordInput) => {
    resetMutation.mutate(data);
  };

  if (!token) {
    return (
      <section className="border-2 border-destructive/50 bg-background p-6 shadow-destructive/20">
        <div className="mb-6 flex items-center justify-between font-mono text-xs font-bold uppercase tracking-[0.08em]">
          <span className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            Invalid token
          </span>
        </div>

        <div className="mb-6 space-y-3">
          <h1 className="font-mono text-2xl font-black leading-tight text-destructive">
            {resetPassword.invalid.headline}
          </h1>
          <p className="font-mono text-sm leading-relaxed text-muted-foreground">
            {resetPassword.invalid.description}
          </p>
        </div>

        <Button
          onClick={() => router.push("/auth/forgot-password")}
          className="h-11 w-full rounded-none border-2 border-primary bg-primary font-mono text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:shadow-md hover:shadow-primary/30"
        >
          Request new reset link
        </Button>

        <div className="mt-6 border-t border-border pt-6 text-center font-mono text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            Or{" "}
            <button
              onClick={() => router.push("/sign-in")}
              className="text-foreground underline-offset-4 hover:underline"
            >
              return to sign in
            </button>
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="border-2 border-border bg-background p-6 shadow-primary/20">
      <div className="mb-6 flex items-center justify-between font-mono text-xs font-bold uppercase tracking-[0.08em]">
        <span className="flex items-center gap-2 text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          {resetPassword.badge}
        </span>
        <span className="text-muted-foreground">[04] New password</span>
      </div>

      <div className="mb-6 space-y-3">
        <h1 className="bg-linear-to-br from-foreground via-foreground to-foreground/70 bg-clip-text font-mono text-2xl font-black leading-tight text-transparent">
          {resetPassword.headline}
        </h1>
        <p className="font-mono text-sm leading-relaxed text-muted-foreground">
          {resetPassword.description}
        </p>
      </div>

      <div className="mb-6 border-2 border-border bg-background/50 p-4">
        <div className="mb-3 font-mono text-xs font-bold uppercase text-primary/80">
          Password requirements
        </div>
        <div className="space-y-2">
          {resetPassword.requirements.map((requirement) => (
            <div key={requirement} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-xs text-muted-foreground">{requirement}</span>
            </div>
          ))}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-mono text-sm font-bold uppercase">
                  New password
                </FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••••••••"
                    autoComplete="new-password"
                    className="h-11 rounded-none border-2 border-border bg-background font-mono text-sm transition-colors focus:border-primary"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="font-mono text-xs" />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={resetMutation.isPending}
            className="h-11 w-full rounded-none border-2 border-primary bg-primary font-mono text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:shadow-md hover:shadow-primary/30"
          >
            {resetMutation.isPending ? "Resetting password..." : "Reset password"}
          </Button>
        </form>
      </Form>

      <div className="mt-6 space-y-3 border-t border-border pt-6 font-mono text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Password reset?</span>
          <button
            onClick={() => router.push("/sign-in")}
            className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
          >
            Sign in now
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

