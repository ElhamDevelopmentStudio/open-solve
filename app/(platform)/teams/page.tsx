import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export default function TeamsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Teams</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>Organize classrooms, bootcamps, or interview pods from this space.</p>
        <p>Collaboration tools, shared problem lists, and analytics can be added iteratively.</p>
      </CardContent>
    </Card>
  );
}
