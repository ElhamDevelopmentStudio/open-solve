import Link from "next/link";

import { SignInForm } from "@/components/auth/sign-in-form";
import { ArrowRight } from "@/components/icons";
import { authConfig } from "@/config/auth";

export default function SignInPage() {
  const { signIn } = authConfig;

  return (
    <section className="border-2 border-border bg-background p-6 shadow-primary/20">
      <div className="flex items-center justify-between font-mono text-xs font-bold uppercase tracking-[0.08em]">
        <span className="flex items-center gap-2 text-primary">[02] Sign in</span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <ArrowRight className="h-3.5 w-3.5" />
          Auth required
        </span>
      </div>
      <SignInForm />
      <div className="space-y-3 border-t border-border pt-3 font-mono text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Need a reset?</span>
          <Link
            href={signIn.links.forgot.href}
            className="text-primary underline-offset-4 hover:underline"
          >
            {signIn.links.forgot.label}
          </Link>
        </div>
        <div className="flex items-center justify-between">
          <span>New here?</span>
          <Link
            href={signIn.links.signup.href}
            className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
          >
            {signIn.links.signup.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div>
          By signing in, you agree to our{" "}
          <Link href={signIn.links.terms.href} className="underline-offset-4 hover:underline">
            {signIn.links.terms.label}
          </Link>{" "}
          and{" "}
          <Link href={signIn.links.privacy.href} className="underline-offset-4 hover:underline">
            {signIn.links.privacy.label}
          </Link>
          .
        </div>
      </div>
    </section>
  );
}
