import { SignUpForm } from "@/components/auth/sign-up-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create an Account</CardTitle>
        <CardDescription>Join OpenSolve to start solving problems.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SignUpForm />

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Already have an account? </span>
          <Link href="/sign-in" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
