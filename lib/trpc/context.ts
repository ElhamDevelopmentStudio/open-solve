import type { inferAsyncReturnType } from "@trpc/server";
import { headers as nextHeaders } from "next/headers";

type CreateContextOptions = {
  headers: Headers;
};

export async function createInnerTRPCContext(opts: CreateContextOptions) {
  const headers = opts.headers;
  const requestId = headers.get("x-request-id") ?? crypto.randomUUID();

  return {
    headers,
    requestId,
  };
}

export async function createTRPCContext({ req }: { req: Request }) {
  return createInnerTRPCContext({ headers: new Headers(req.headers) });
}

export async function createCallerContext() {
  const headerStore = await nextHeaders();
  return createInnerTRPCContext({ headers: new Headers(headerStore) });
}

export type TRPCContext = inferAsyncReturnType<typeof createTRPCContext>;
