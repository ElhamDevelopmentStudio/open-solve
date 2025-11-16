"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2 } from "@/components/icons";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") || "";

  const [status, setStatus] = useState<"loading" | "success" | "error">(token ? "loading" : "error");

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
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Verifying Email
          </CardTitle>
          <CardDescription>Please wait while we verify your email address...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (status === "success") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-6 w-6" />
            Email Verified
          </CardTitle>
          <CardDescription>
            Your email has been successfully verified. You can now access all features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push("/dashboard")} className="w-full">
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <XCircle className="h-6 w-6" />
          Verification Failed
        </CardTitle>
        <CardDescription>This verification link is invalid or has expired.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => router.push("/sign-in")} className="w-full">
          Back to Sign In
        </Button>
      </CardContent>
    </Card>
  );
}









