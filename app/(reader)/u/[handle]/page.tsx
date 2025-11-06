import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HydrationBoundary } from "@tanstack/react-query";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { publicContentQueryOptions } from "@/lib/react-query/policies";
import { ProfileClient } from "@/components/profile/profile-client";

export const dynamic = "force-dynamic";

type Params = { handle: string };

export async function generateMetadata({ params }: { params: Params | Promise<Params> }): Promise<Metadata> {
  const resolved = await params;
  const caller = await createTRPCCaller();
  try {
    const profile = await caller.profile.detail({ handle: resolved.handle });
    return {
      title: `${profile.name ?? profile.handle} • Profile | OpenSolve`,
      description: `Practice stats and badges for @${profile.handle}.`,
    };
  } catch (error) {
    return {
      title: `${resolved.handle} • Profile | OpenSolve`,
      description: "Explore solver stats and badges on OpenSolve.",
    };
  }
}

export default async function UserProfilePage({ params }: { params: Params | Promise<Params> }) {
  const { handle } = await params;
  const caller = await createTRPCCaller();
  try {
    const state = await buildHydrationState([
      prefetchTrpcQuery(
        "profile.detail",
        () => caller.profile.detail({ handle }),
        {
          input: { handle },
          staleTime: publicContentQueryOptions.staleTime,
        },
      ),
    ]);

    return (
      <HydrationBoundary state={state}>
        <ProfileClient handle={handle} />
      </HydrationBoundary>
    );
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }
}
