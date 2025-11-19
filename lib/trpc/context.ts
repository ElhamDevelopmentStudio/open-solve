import { getSession } from "@/lib/auth/session";
import type { Session, User } from "@prisma/client";
import type { inferAsyncReturnType } from "@trpc/server";
import { headers as nextHeaders } from "next/headers";

type CreateContextOptions = {
  headers: Headers;
  session?: { session: Session; user: User } | null;
};

export async function createInnerTRPCContext(opts: CreateContextOptions) {
  const headers = opts.headers;
  const requestId = headers.get("x-request-id") ?? crypto.randomUUID();

  return {
    headers,
    requestId,
    session: opts.session?.session ?? null,
    user: opts.session?.user ?? null,
  };
}

export async function createTRPCContext({ req }: { req: Request }) {
  const session = await getSession();
  return createInnerTRPCContext({
    headers: new Headers(req.headers),
    session,
  });
}

export async function createCallerContext() {
  const headerStore = await nextHeaders();
  const session = await getSession();
  return createInnerTRPCContext({
    headers: new Headers(headerStore),
    session,
  });
}

export async function createPublicCallerContext() {
  return createInnerTRPCContext({
    headers: new Headers(),
    session: null,
  });
}

export type TRPCContext = inferAsyncReturnType<typeof createTRPCContext>;
