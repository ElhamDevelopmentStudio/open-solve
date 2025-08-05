import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export default function DashboardPage() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Core metrics, recent submissions, and personalized insights will live here.
        </CardContent>
      </Card>
    </div>
  );
}
