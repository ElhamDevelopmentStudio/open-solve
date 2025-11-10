export const sessionQueryOptions = {
  staleTime: 10_000,
  gcTime: 5 * 60_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const;

export const userScopedListOptions = {
  staleTime: 5_000,
  gcTime: 60_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const;

export const publicContentQueryOptions = {
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

export const leaderboardQueryOptions = {
  staleTime: 60_000,
  gcTime: 5 * 60_000,
  refetchInterval: 30_000,
  refetchIntervalInBackground: true,
  refetchOnWindowFocus: false,
} as const;

export const judgeStatusQueryOptions = {
  staleTime: 0,
  gcTime: 60_000,
  refetchInterval: 2_000,
  refetchIntervalInBackground: true,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
} as const;

export const submissionHistoryQueryOptions = {
  staleTime: 5_000,
  gcTime: 60_000,
  refetchOnWindowFocus: false,
} as const;

export const submissionDraftQueryOptions = {
  staleTime: 0,
  gcTime: 10 * 60_000,
  refetchOnWindowFocus: false,
} as const;

export const nonRetriableMutationOptions = {
  retry: false,
} as const;
