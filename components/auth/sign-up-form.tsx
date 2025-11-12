"use client";

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
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function SignUpForm() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      handle: "",
    },
  });

  const signUpMutation = trpc.auth.signUp.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      invalidateAuthSession(queryClient);
      router.push("/dashboard");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (data: SignUpInput) => {
    signUpMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name (optional)</FormLabel>
              <FormControl>
                <Input type="text" placeholder="John Doe" autoComplete="name" {...field} />
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
              <FormLabel>Handle (optional)</FormLabel>
              <FormControl>
                <Input type="text" placeholder="johndoe" autoComplete="username" {...field} />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground">
                3-20 characters, lowercase letters, numbers, underscores, and hyphens only
              </p>
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
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground">
                At least 8 characters with uppercase, lowercase, and numbers
              </p>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={signUpMutation.isPending}>
          {signUpMutation.isPending ? "Creating account..." : "Sign Up"}
        </Button>
      </form>
    </Form>
  );
}


