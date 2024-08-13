"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, Sparkles } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { authConfig } from "@/config/auth";
import { trpc } from "@/lib/trpc/client";

export default function MagicLinkPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") || "";

  const { magicLink } = authConfig;

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  const verifyMutation = trpc.auth.verifyMagicLink.useMutation({
    onSuccess: () => {
      setStatus("success");
      toast.success("Signed in successfully");
      setTimeout(() => router.push("/dashboard"), 500);
    },
    onError: (error) => {
      setStatus("error");
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (token) {
      verifyMutation.mutate({ token });
    } else {
      setStatus("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (status === "loading") {
    return (
      <section className="border-2 border-border bg-background p-6 shadow-primary/20">
        <div className="mb-6 flex items-center justify-between font-mono text-xs font-bold uppercase tracking-[0.08em]">
          <span className="flex items-center gap-2 text-primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {magicLink.badge}
          </span>
          <span className="text-muted-foreground">[08] Processing</span>
        </div>

        <div className="mb-6 space-y-3">
          <h1 className="bg-linear-to-br from-foreground via-foreground to-foreground/70 bg-clip-text font-mono text-2xl font-black leading-tight text-transparent">
            {magicLink.loading.headline}
          </h1>
          <p className="font-mono text-sm leading-relaxed text-muted-foreground">
            {magicLink.loading.description}
          </p>
        </div>

        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 animate-pulse rounded-none border-2 border-primary/50 bg-primary/5" />
              <Sparkles className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-primary" />
            </div>
            <p className="font-mono text-xs text-muted-foreground">Validating magic link...</p>
          </div>
        </div>

        <div className="border-2 border-border bg-background/50 p-4">
          <div className="mb-2 font-mono text-xs font-bold uppercase text-primary/80">
            Security check
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            We&apos;re verifying your magic link token and establishing a secure session. This may
            take a few seconds.
          </p>
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
            Authenticated
          </span>
          <span className="text-muted-foreground">[09] Success</span>
        </div>

        <div className="mb-6 space-y-3">
          <h1 className="font-mono text-2xl font-black leading-tight text-success">
            {magicLink.success.headline}
          </h1>
          <p className="font-mono text-sm leading-relaxed text-muted-foreground">
            {magicLink.success.description}
          </p>
        </div>

        <div className="mb-6 flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-none border-2 border-success bg-success/10" />
              <CheckCircle2 className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-success" />
            </div>
            <p className="font-mono text-xs text-success">Redirecting to dashboard...</p>
          </div>
        </div>

        <Button
          onClick={() => router.push("/dashboard")}
          className="h-11 w-full rounded-none border-2 border-primary bg-primary font-mono text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:shadow-md hover:shadow-primary/30"
        >
          Go to dashboard now
        </Button>

        <div className="mt-6 border-t border-border pt-6 text-center font-mono text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            Or{" "}
            <button
              onClick={() => router.push("/problems")}
              className="text-foreground underline-offset-4 hover:underline"
            >
              start solving problems
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
        <span className="text-muted-foreground">[10] Error</span>
      </div>

      <div className="mb-6 space-y-3">
        <h1 className="font-mono text-2xl font-black leading-tight text-destructive">
          {magicLink.error.headline}
        </h1>
        <p className="font-mono text-sm leading-relaxed text-muted-foreground">
          {magicLink.error.description}
        </p>
      </div>

      <div className="mb-6 border-2 border-destructive/30 bg-destructive/5 p-4">
        <div className="mb-3 font-mono text-xs font-bold uppercase text-destructive/80">
          Common causes
        </div>
        <div className="space-y-2 font-mono text-xs text-muted-foreground">
          <p>• Link has already been used (single-use only)</p>
          <p>• Link expired (15 minute validity)</p>
          <p>• Token was tampered with or corrupted</p>
          <p>• Network error during validation</p>
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
          <span>Need a new link?</span>
          <button
            onClick={() => router.push("/sign-in")}
            className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
          >
            Request magic link
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span>Use password instead?</span>
          <button
            onClick={() => router.push("/sign-in")}
            className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
          >
            Sign in with password
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
