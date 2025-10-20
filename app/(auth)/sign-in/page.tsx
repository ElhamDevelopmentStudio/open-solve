import { SignInForm } from "@/components/auth/sign-in-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import Link from "next/link";

export default function SignInPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Welcome back! Please sign in to continue.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SignInForm />

        <div className="text-center text-sm space-y-2">
          <Link href="/auth/forgot-password" className="text-primary hover:underline">
            Forgot password?
          </Link>
          <div>
            <span className="text-muted-foreground">Don&apos;t have an account? </span>
            <Link href="/sign-up" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
