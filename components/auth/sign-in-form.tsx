"use client";

import {
  Button,
  Checkbox,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@/components/ui";
import { invalidateAuthSession } from "@/lib/react-query/invalidation";
import { trpc } from "@/lib/trpc/client";
import { signInSchema, type SignInInput } from "@/lib/validators/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "@/components/icons";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function SignInForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const labelClass =
    "font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-foreground flex items-center gap-2";

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const signInMutation = trpc.auth.signIn.useMutation({
    onSuccess: (data) => {
      if (data.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setSessionId(data.sessionId!);
        toast.info("Please enter your two-factor authentication code");
      } else {
        toast.success("Signed in successfully");
        invalidateAuthSession(queryClient);
        router.push("/dashboard");
        router.refresh();
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const verifyTwoFactorMutation = trpc.auth.verifyTwoFactor.useMutation({
    onSuccess: () => {
      toast.success("Signed in successfully");
      invalidateAuthSession(queryClient);
      router.push("/dashboard");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [twoFactorCode, setTwoFactorCode] = useState("");

  const handleSubmit = (data: SignInInput) => {
    signInMutation.mutate(data);
  };

  const handleTwoFactorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyTwoFactorMutation.mutate({
      code: twoFactorCode,
      sessionId,
    });
  };

  return (
    <Form {...form}>
      {requiresTwoFactor ? (
        <form onSubmit={handleTwoFactorSubmit} className="space-y-8 font-mono">
          <div className="flex flex-col gap-4 border-2 border-primary/40 bg-primary/5 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-primary/50 bg-background text-primary shadow-primary/20 shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold uppercase tracking-tight">
                  Two-factor authentication
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code from your authenticator app to complete sign in.
                </p>
              </div>
            </div>
            <div className="grid gap-px bg-border/40 sm:grid-cols-2">
              <div className="bg-background px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                Session
              </div>
              <div className="bg-background px-3 py-2 text-xs font-bold text-foreground">
                Secure challenge
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <label htmlFor="code" className={labelClass}>
              Verification code
            </label>
            <Input
              id="code"
              type="text"
              placeholder="000000"
              maxLength={6}
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
              autoFocus
              className="h-14 border-2 text-center text-xl font-mono tracking-[0.5em]"
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 font-mono font-bold uppercase tracking-tight"
              onClick={() => setRequiresTwoFactor(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-11 flex-1 font-mono font-bold uppercase tracking-tight"
              disabled={verifyTwoFactorMutation.isPending || twoFactorCode.length !== 6}
            >
              {verifyTwoFactorMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying
                </>
              ) : (
                "Verify & sign in"
              )}
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 font-mono">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="name@company.com"
                    autoComplete="email"
                    className="h-12 border-2 font-mono"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Enter password"
                    autoComplete="current-password"
                    className="h-12 border-2 font-mono"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2.5 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="cursor-pointer text-xs font-mono font-bold uppercase leading-none tracking-[0.08em]">
                  Keep me signed in for 30 days
                </FormLabel>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="h-12 w-full font-mono font-bold uppercase tracking-tight"
            disabled={signInMutation.isPending}
          >
            {signInMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
      )}
    </Form>
  );
}

