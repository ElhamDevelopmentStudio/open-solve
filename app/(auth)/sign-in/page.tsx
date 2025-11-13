import { SignInForm } from "@/components/auth/sign-in-form";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground">
          Sign in to continue your learning journey
        </p>
      </div>

      <SignInForm />

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <Link
            href="/auth/forgot-password"
            className="text-center text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Forgot your password?
          </Link>
          <div className="text-center text-muted-foreground">
            New to OpenSolve?{" "}
            <Link href="/sign-up" className="font-medium text-foreground underline-offset-4 transition-colors hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>

      <div className="border-l-2 border-muted pl-4 text-xs text-muted-foreground">
        By signing in, you agree to our{" "}
        <Link href="/terms" className="underline-offset-4 hover:underline">Terms</Link> and{" "}
        <Link href="/privacy" className="underline-offset-4 hover:underline">Privacy Policy</Link>
      </div>
    </div>
  );
}
