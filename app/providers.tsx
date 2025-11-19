"use client";

import { ThemeProvider, TrpcProvider } from "@/components/providers";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import { Toaster } from "@/components/ui/sonner";
import { queryClientConfig } from "@/lib/react-query/config";
import {
  DehydratedState,
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Suspense, useState } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { AnalyticsBridge } from "@/components/analytics/analytics-bridge";

type AppProvidersProps = {
  children: React.ReactNode;
  initialQueryState?: DehydratedState;
};

export function AppProviders({ children, initialQueryState }: AppProvidersProps) {
  const [queryClient] = useState(() => new QueryClient(queryClientConfig));

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TrpcProvider queryClient={queryClient}>
          <NuqsAdapter>
            <HydrationBoundary state={initialQueryState}>{children}</HydrationBoundary>
            <ImpersonationBanner />
            <Suspense fallback={null}>
              <AnalyticsBridge />
            </Suspense>
            <Toaster
              position="top-center"
              richColors
              closeButton
              toastOptions={{ duration: 4500 }}
            />
            {process.env.NODE_ENV === "development" ? (
              <ReactQueryDevtools position="bottom" />
            ) : null}
          </NuqsAdapter>
        </TrpcProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
