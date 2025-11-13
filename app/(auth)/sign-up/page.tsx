import { SignUpForm } from "@/components/auth/sign-up-form";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
        <p className="text-muted-foreground">
          Start solving problems and competing today
        </p>
      </div>

      <SignUpForm />

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-foreground underline-offset-4 transition-colors hover:underline">
            Sign in
          </Link>
        </div>
      </div>

      <div className="border-l-2 border-muted pl-4 text-xs text-muted-foreground">
        By creating an account, you agree to our{" "}
        <Link href="/terms" className="underline-offset-4 hover:underline">Terms</Link> and{" "}
        <Link href="/privacy" className="underline-offset-4 hover:underline">Privacy Policy</Link>
      </div>
    </div>
  );
}
