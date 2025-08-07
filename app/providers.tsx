"use client";

import { ThemeProvider, TrpcProvider } from "@/components/providers";
import { queryClientConfig } from "@/lib/react-query/config";
import {
  DehydratedState,
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";

type AppProvidersProps = {
  children: React.ReactNode;
  initialQueryState?: DehydratedState;
};

export function AppProviders({
  children,
  initialQueryState,
}: AppProvidersProps) {
  const [queryClient] = useState(
    () => new QueryClient(queryClientConfig),
  );

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TrpcProvider queryClient={queryClient}>
          <NuqsAdapter>
            <HydrationBoundary state={initialQueryState}>{children}</HydrationBoundary>
            {process.env.NODE_ENV === "development" ? (
              <ReactQueryDevtools position="bottom" />
            ) : null}
          </NuqsAdapter>
        </TrpcProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
