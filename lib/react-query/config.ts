import type { QueryClientConfig } from "@tanstack/react-query";

export const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      retry: 2,
      gcTime: 10 * 60_000,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5_000),
    },
    mutations: {
      retry: 0,
    },
  },
};
