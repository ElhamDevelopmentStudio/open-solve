"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@/components/ui";
import { trpc } from "@/lib/trpc/client";
import { invalidateAuthSession } from "@/lib/react-query/invalidation";
import { signUpSchema, type SignUpInput } from "@/lib/validators/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Loader2 } from "@/components/icons";
import { cn } from "@/lib/utils";
import { signUpDefaultValues, useSignUpStore } from "@/stores/sign-up-store";

export function SignUpForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const step = useSignUpStore((state) => state.step);
  const setStep = useSignUpStore((state) => state.setStep);
  const updateSignUpData = useSignUpStore((state) => state.updateData);
  const resetSignUp = useSignUpStore((state) => state.reset);
  const initialValuesRef = useRef<SignUpInput>({ ...useSignUpStore.getState().data });

  const baseResolver = useMemo(() => zodResolver(signUpSchema), []);
  const resolver = useCallback<Resolver<SignUpInput>>(
    (values, context, options) => {
      const mergedValues = {
        ...signUpDefaultValues(),
        ...useSignUpStore.getState().data,
        ...values,
      };

      return baseResolver(mergedValues, context, options);
    },
    [baseResolver],
  );

  const form = useForm<SignUpInput>({
    resolver,
    shouldUnregister: false,
    defaultValues: initialValuesRef.current,
  });

  useEffect(() => {
    form.reset({ ...useSignUpStore.getState().data });
  }, [form, step]);

  useEffect(() => {
    const subscription = form.watch((values) => {
      const filteredValues = Object.fromEntries(
        Object.entries(values as SignUpInput).filter(([, value]) => value !== undefined),
      ) as Partial<SignUpInput>;

      if (Object.keys(filteredValues).length === 0) {
        return;
      }

      updateSignUpData(filteredValues);
    });

    return () => subscription.unsubscribe();
  }, [form, updateSignUpData]);

  const signUpMutation = trpc.auth.signUp.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      resetSignUp();
      form.reset(signUpDefaultValues());
      invalidateAuthSession(queryClient);
      router.push("/dashboard");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (data: SignUpInput) => {
    signUpMutation.mutate({
      ...data,
      name: data.name?.trim() ? data.name : undefined,
      handle: data.handle?.trim() ? data.handle : undefined,
    });
  };

  const handleContinueToStep2 = async () => {
    const emailValid = await form.trigger("email");
    const passwordValid = await form.trigger("password");

    if (emailValid && passwordValid) {
      setStep(2);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all",
                step === 1
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-primary bg-background text-primary",
              )}
            >
              {step > 1 ? <CheckCircle2 className="h-4 w-4" /> : "1"}
            </div>
            <span
              className={cn(
                "text-sm font-medium",
                step === 1 ? "text-foreground" : "text-muted-foreground",
              )}
            >
              Credentials
            </span>
          </div>
          <div
            className={cn("h-px flex-1 transition-colors", step > 1 ? "bg-primary" : "bg-border")}
          />
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all",
                step === 2
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground",
              )}
            >
              {step === 2 ? "2" : <Circle className="h-3 w-3" />}
            </div>
            <span
              className={cn(
                "text-sm font-medium",
                step === 2 ? "text-foreground" : "text-muted-foreground",
              )}
            >
              Profile
            </span>
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-6">
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
                      placeholder="Create a secure password"
                      autoComplete="new-password"
                      className="h-11"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Minimum 8 characters with uppercase, lowercase, and numbers
                  </p>
                </FormItem>
              )}
            />

            <Button
              type="button"
              className="h-11 w-full font-medium"
              onClick={handleContinueToStep2}
            >
              Continue to profile
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Display name <span className="text-muted-foreground">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Your full name"
                      autoComplete="name"
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
              name="handle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Username <span className="text-muted-foreground">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="unique-handle"
                      autoComplete="username"
                      className="h-11"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    3-20 characters: lowercase, numbers, underscores, hyphens
                  </p>
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-32 font-medium"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="h-11 flex-1 font-medium"
                disabled={signUpMutation.isPending}
              >
                {signUpMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Form>
  );
}
