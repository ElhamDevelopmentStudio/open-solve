import { dehydrate, QueryClient } from "@tanstack/react-query";
import { cache } from "react";
import { queryClientConfig } from "@/lib/react-query/config";
import type { ProcedureName } from "@/lib/react-query/keys";
import { buildTrpcQueryKey } from "@/lib/react-query/keys";

export const getServerQueryClient = cache(() => new QueryClient(queryClientConfig));

export async function prefetchQuery<T>(prefetcher: (queryClient: QueryClient) => Promise<T>) {
  const queryClient = getServerQueryClient();
  await prefetcher(queryClient);
  return queryClient;
}

export function getDehydratedState(queryClient?: QueryClient) {
  const client = queryClient ?? getServerQueryClient();
  return dehydrate(client);
}

export async function buildHydrationState(
  tasks: Array<(queryClient: QueryClient) => Promise<unknown>>,
) {
  const client = getServerQueryClient();
  await Promise.all(tasks.map((task) => task(client)));
  return dehydrate(client);
}

export function prefetchTrpcQuery<TOutput>(
  procedure: ProcedureName,
  fetcher: () => Promise<TOutput>,
  options?: {
    input?: unknown;
    type?: "query" | "infinite";
    staleTime?: number;
  },
) {
  return async (queryClient: QueryClient) =>
    queryClient.prefetchQuery({
      queryKey: buildTrpcQueryKey(procedure, { input: options?.input, type: options?.type }),
      queryFn: fetcher,
      staleTime: options?.staleTime,
    });
}
