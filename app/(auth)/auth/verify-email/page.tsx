"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AlertTriangle, ArrowRight, CheckCircle2, Loader2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { authConfig } from "@/config/auth";
import { trpc } from "@/lib/trpc/client";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") || "";

  const { verifyEmail } = authConfig;

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error",
  );

  const verifyMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: (data) => {
      setStatus("success");
      toast.success(data.message);
    },
    onError: (error) => {
      setStatus("error");
      toast.error(error.message);
    },
  });

  const { mutate } = verifyMutation;

  useEffect(() => {
    if (!token) {
      return;
    }
    mutate({ token });
  }, [token, mutate]);

  if (status === "loading") {
    return (
      <section className="border-2 border-border bg-background p-6 shadow-primary/20">
        <div className="mb-6 flex items-center justify-between font-mono text-xs font-bold uppercase tracking-[0.08em]">
          <span className="flex items-center gap-2 text-primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {verifyEmail.badge}
          </span>
          <span className="text-muted-foreground">[05] Processing</span>
        </div>

        <div className="mb-6 space-y-3">
          <h1 className="bg-linear-to-br from-foreground via-foreground to-foreground/70 bg-clip-text font-mono text-2xl font-black leading-tight text-transparent">
            {verifyEmail.loading.headline}
          </h1>
          <p className="font-mono text-sm leading-relaxed text-muted-foreground">
            {verifyEmail.loading.description}
          </p>
        </div>

        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 animate-pulse rounded-none border-2 border-primary/50 bg-primary/5" />
            <p className="font-mono text-xs text-muted-foreground">Validating token...</p>
          </div>
        </div>
      </section>
    );
  }

  if (status === "success") {
    return (
      <section className="border-2 border-success/50 bg-background p-6 shadow-success/20">
        <div className="mb-6 flex items-center justify-between font-mono text-xs font-bold uppercase tracking-[0.08em]">
          <span className="flex items-center gap-2 text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Verified
          </span>
          <span className="text-muted-foreground">[06] Complete</span>
        </div>

        <div className="mb-6 space-y-3">
          <h1 className="font-mono text-2xl font-black leading-tight text-success">
            {verifyEmail.success.headline}
          </h1>
          <p className="font-mono text-sm leading-relaxed text-muted-foreground">
            {verifyEmail.success.description}
          </p>
        </div>

        <div className="mb-6 border-2 border-success/30 bg-success/5 p-4">
          <div className="mb-3 font-mono text-xs font-bold uppercase text-success/80">
            Unlocked features
          </div>
          <div className="space-y-2">
            {verifyEmail.success.features.map((feature) => (
              <div key={feature} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-success" />
                <span className="font-mono text-xs text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={() => router.push("/dashboard")}
          className="h-11 w-full rounded-none border-2 border-primary bg-primary font-mono text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:shadow-md hover:shadow-primary/30"
        >
          Go to dashboard
        </Button>

        <div className="mt-6 border-t border-border pt-6 text-center font-mono text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            Or{" "}
            <button
              onClick={() => router.push("/problems")}
              className="text-foreground underline-offset-4 hover:underline"
            >
              browse problems
            </button>
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="border-2 border-destructive/50 bg-background p-6 shadow-destructive/20">
      <div className="mb-6 flex items-center justify-between font-mono text-xs font-bold uppercase tracking-[0.08em]">
        <span className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" />
          Failed
        </span>
        <span className="text-muted-foreground">[07] Error</span>
      </div>

      <div className="mb-6 space-y-3">
        <h1 className="font-mono text-2xl font-black leading-tight text-destructive">
          {verifyEmail.error.headline}
        </h1>
        <p className="font-mono text-sm leading-relaxed text-muted-foreground">
          {verifyEmail.error.description}
        </p>
      </div>

      <div className="mb-6 border-2 border-destructive/30 bg-destructive/5 p-4">
        <div className="mb-3 font-mono text-xs font-bold uppercase text-destructive/80">
          Next steps
        </div>
        <div className="space-y-2 font-mono text-xs text-muted-foreground">
          <p>1. Sign in to your account</p>
          <p>2. Navigate to Settings → Account</p>
          <p>3. Request a new verification email</p>
        </div>
      </div>

      <Button
        onClick={() => router.push("/sign-in")}
        className="h-11 w-full rounded-none border-2 border-primary bg-primary font-mono text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:shadow-md hover:shadow-primary/30"
      >
        Back to sign in
      </Button>

      <div className="mt-6 space-y-3 border-t border-border pt-6 font-mono text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Need help?</span>
          <button
            onClick={() => router.push("/support")}
            className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
          >
            Contact support
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
