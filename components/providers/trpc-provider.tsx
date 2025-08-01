"use client";

import { trpc, createTRPCClient } from "@/lib/trpc/client";
import type { QueryClient } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useState } from "react";

type TrpcProviderProps = PropsWithChildren<{
  queryClient: QueryClient;
}>;

export function TrpcProvider({ children, queryClient }: TrpcProviderProps) {
  const [trpcClient] = useState(() => createTRPCClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      {children}
    </trpc.Provider>
  );
}
