"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2 } from "@/components/icons";

export default function MagicLinkPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") || "";

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  const verifyMutation = trpc.auth.verifyMagicLink.useMutation({
    onSuccess: () => {
      setStatus("success");
      toast.success("Signed in successfully");
      // Slight delay so user sees success state
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
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Signing You In
          </CardTitle>
          <CardDescription>Validating your magic link…</CardDescription>
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
            Signed In
          </CardTitle>
          <CardDescription>You’re being redirected to your dashboard.</CardDescription>
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
          Link Invalid or Expired
        </CardTitle>
        <CardDescription>This sign-in link is invalid or has expired.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => router.push("/sign-in")} className="w-full">
          Back to Sign In
        </Button>
      </CardContent>
    </Card>
  );
}
