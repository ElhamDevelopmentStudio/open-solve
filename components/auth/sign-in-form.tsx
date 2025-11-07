"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/lib/trpc/client";
import { invalidateAuthSession } from "@/lib/react-query/invalidation";
import { signInSchema, type SignInInput } from "@/lib/validators/auth";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Button,
  Input,
  Checkbox,
} from "@/components/ui";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

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
        <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Two-Factor Code</label>
            <Input
              type="text"
              placeholder="000000"
              maxLength={6}
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
              autoFocus
            />
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={verifyTwoFactorMutation.isPending || twoFactorCode.length !== 6}
          >
            {verifyTwoFactorMutation.isPending ? "Verifying..." : "Verify"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setRequiresTwoFactor(false)}
          >
            Back to sign in
          </Button>
        </form>
      ) : (
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
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
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
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
              <FormItem className="flex items-center space-x-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="cursor-pointer font-normal">
                  Remember me for 30 days
                </FormLabel>
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={signInMutation.isPending}>
            {signInMutation.isPending ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      )}
    </Form>
  );
}







