import { renderProblemLibraryPage } from "@/components/problems/problem-library-page";
import SidebarPageHeader from "@/components/layout/sidebar-page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function WorkspaceProblemsPage({
  searchParams,
}: {
  searchParams:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const content = await renderProblemLibraryPage({
    searchParams: resolvedSearchParams,
    viewerHasSession: true,
    problemBasePath: "/workspace/problems",
  });
  return (
    <>
      <SidebarPageHeader
        title="Problem library"
        description="Filter by topic, status, and difficulty to curate your queue."
        actions={
          <Button size="sm" asChild>
            <Link href="/workspace/problems?sort=newest">Newest first</Link>
          </Button>
        }
      />
      {content}
    </>
  );
}
