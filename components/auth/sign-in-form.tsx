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
import { Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function SignInForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [sessionId, setSessionId] = useState("");

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
        <form onSubmit={handleTwoFactorSubmit} className="space-y-8">
          <div className="flex items-start gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="font-semibold">Two-factor authentication</div>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code from your authenticator app to complete sign in
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <label htmlFor="code" className="text-sm font-medium">
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
              className="h-14 text-center text-xl tracking-[0.5em] font-mono"
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 font-medium"
              onClick={() => setRequiresTwoFactor(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-11 flex-1 font-medium"
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
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="name@company.com"
                    autoComplete="email"
                    className="h-11"
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
                <FormLabel className="text-sm font-medium">Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Enter password"
                    autoComplete="current-password"
                    className="h-11"
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
                <FormLabel className="cursor-pointer text-sm font-normal leading-none">
                  Keep me signed in for 30 days
                </FormLabel>
              </FormItem>
            )}
          />

          <Button type="submit" className="h-11 w-full font-medium" disabled={signInMutation.isPending}>
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
