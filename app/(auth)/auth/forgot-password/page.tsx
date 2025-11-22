"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc/client";
import { requestPasswordResetSchema, type RequestPasswordResetInput } from "@/lib/validators/auth";
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
import { ArrowRight, CheckCircle2, Mail } from "@/components/icons";
import { authConfig } from "@/config/auth";

export default function ForgotPasswordPage() {
  const { forgotPassword } = authConfig;

  const form = useForm<RequestPasswordResetInput>({
    resolver: zodResolver(requestPasswordResetSchema),
    defaultValues: {
      email: "",
    },
  });

  const resetMutation = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (data: RequestPasswordResetInput) => {
    resetMutation.mutate(data);
  };

  return (
    <section className="border-2 border-border bg-background p-6 shadow-primary/20">
      <div className="mb-6 flex items-center justify-between font-mono text-xs font-bold uppercase tracking-[0.08em]">
        <span className="flex items-center gap-2 text-primary">
          <Mail className="h-3.5 w-3.5" />
          {forgotPassword.badge}
        </span>
        <span className="text-muted-foreground">[03] Password reset</span>
      </div>

      <div className="mb-6 space-y-3">
        <h1 className="bg-linear-to-br from-foreground via-foreground to-foreground/70 bg-clip-text font-mono text-2xl font-black leading-tight text-transparent">
          {forgotPassword.headline}
        </h1>
        <p className="font-mono text-sm leading-relaxed text-muted-foreground">
          {forgotPassword.description}
        </p>
      </div>

      <div className="mb-6 border-2 border-border bg-background/50 p-4">
        <div className="mb-3 font-mono text-xs font-bold uppercase text-primary/80">
          Security notes
        </div>
        <div className="space-y-2">
          {forgotPassword.security.map((note) => (
            <div key={note} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-xs text-muted-foreground">{note}</span>
            </div>
          ))}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-mono text-sm font-bold uppercase">
                  Email address
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
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
            {resetMutation.isPending ? "Sending reset link..." : "Send reset link"}
          </Button>
        </form>
      </Form>

      <div className="mt-6 space-y-3 border-t border-border pt-6 font-mono text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Remember your password?</span>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
          >
            Back to sign in
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="flex items-center justify-between">
          <span>Need an account?</span>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
          >
            Create account
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

