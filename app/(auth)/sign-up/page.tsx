import Link from "next/link";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { ArrowRight } from "@/components/icons";
import { authConfig } from "@/config/auth";

export default function SignUpPage() {
  const { signUp } = authConfig;

  return (
    <section className="border-2 border-border bg-background p-6 shadow-primary/20">
      <div className="flex items-center justify-between font-mono text-xs font-bold uppercase tracking-[0.08em]">
        <span className="flex items-center gap-2 text-primary">[02] Create your profile</span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <ArrowRight className="h-3.5 w-3.5" />
          Two-step onboarding
        </span>
      </div>
      <SignUpForm />
      <div className="space-y-3 border-t border-border pt-3 font-mono text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Already registered?</span>
          <Link
            href={signUp.links.signin.href}
            className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
          >
            {signUp.links.signin.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div>
          By creating an account, you agree to our{" "}
          <Link href={signUp.links.terms.href} className="underline-offset-4 hover:underline">
            {signUp.links.terms.label}
          </Link>{" "}
          and{" "}
          <Link href={signUp.links.privacy.href} className="underline-offset-4 hover:underline">
            {signUp.links.privacy.label}
          </Link>
          .
        </div>
      </div>
    </section>
  );
}
