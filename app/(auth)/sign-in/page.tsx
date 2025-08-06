import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export default function SignInPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>Connect OAuth providers and credential flows here.</p>
        <div className="flex gap-2">
          <Button className="flex-1" disabled>
            GitHub
          </Button>
          <Button className="flex-1" disabled>
            Google
          </Button>
        </div>
        <Button variant="outline" className="w-full" disabled>
          Continue with email
        </Button>
      </CardContent>
    </Card>
  );
}
