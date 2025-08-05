import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export default function ContestsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>Live and upcoming contests, standings, and registration will appear here.</p>
        <p>Wire up scheduling and rating logic when the judging service is ready.</p>
      </CardContent>
    </Card>
  );
}
