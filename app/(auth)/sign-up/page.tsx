import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>Implement registration, verification, and onboarding steps here.</p>
        <Button className="w-full" disabled>
          Join waitlist
        </Button>
        <p className="text-xs">
          Already have an account?{" "}
          <Link href="/auth/sign-in" className="font-medium text-foreground">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
