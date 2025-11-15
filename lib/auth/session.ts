import { prisma } from "@/lib/prisma";
import type { Session, User } from "@prisma/client";
import { cookies } from "next/headers";
import { generateRefreshToken, generateSessionToken } from "./tokens";

const SESSION_COOKIE_NAME = "session_token";
const REFRESH_COOKIE_NAME = "refresh_token";
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours
const REFRESH_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days
const REMEMBER_ME_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days for session if remember me

export interface SessionData {
  session: Session;
  user: User;
  impersonator?: User | null;
}

type CreateSessionOptions = {
  rememberMe?: boolean;
  impersonatorSessionId?: string;
  impersonatorId?: string;
};

export async function createSession(
  userId: string,
  userAgent: string | null,
  ipAddress: string | null,
  options?: CreateSessionOptions,
): Promise<Session> {
  const sessionToken = generateSessionToken();
  const refreshToken = generateRefreshToken();
  const now = new Date();
  const rememberMe = options?.rememberMe ?? false;
  const sessionExpires = new Date(now.getTime() + (rememberMe ? REMEMBER_ME_DURATION : SESSION_DURATION));
  const refreshExpires = new Date(now.getTime() + REFRESH_DURATION);

  const session = await prisma.session.create({
    data: {
      sessionToken,
      refreshToken,
      userId,
      userAgent,
      ipAddress,
      expires: sessionExpires,
      refreshTokenExpires: refreshExpires,
      lastUsedAt: now,
      impersonatorId: options?.impersonatorId,
      impersonatorSessionId: options?.impersonatorSessionId,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: sessionExpires,
    path: "/",
  });

  cookieStore.set(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: refreshExpires,
    path: "/",
  });

  return session;
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  if (session.expires < new Date()) {
    await deleteSession(sessionToken);
    return null;
  }

  // Update last used timestamp
  await prisma.session.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date() },
  });

  let impersonator: User | null = null;
  if (session.impersonatorId) {
    impersonator = await prisma.user.findUnique({
      where: { id: session.impersonatorId },
    });
  }

  return {
    session,
    user: session.user,
    impersonator,
  };
}

export async function deleteSession(sessionToken?: string): Promise<void> {
  const cookieStore = await cookies();

  if (!sessionToken) {
    sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  }

  if (sessionToken) {
    await prisma.session
      .delete({
        where: { sessionToken },
      })
      .catch(() => {
        // Session may already be deleted
      });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(REFRESH_COOKIE_NAME);
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId },
  });
}

export async function refreshSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;

  if (!refreshToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { refreshToken },
  });

  if (!session || session.refreshTokenExpires < new Date()) {
    if (session) {
      await deleteSession(session.sessionToken);
    }
    return null;
  }

  // Create new tokens
  const newSessionToken = generateSessionToken();
  const newRefreshToken = generateRefreshToken();
  const now = new Date();
  const sessionExpires = new Date(now.getTime() + SESSION_DURATION);
  const refreshExpires = new Date(now.getTime() + REFRESH_DURATION);

  const updatedSession = await prisma.session.update({
    where: { id: session.id },
    data: {
      sessionToken: newSessionToken,
      refreshToken: newRefreshToken,
      expires: sessionExpires,
      refreshTokenExpires: refreshExpires,
      lastUsedAt: now,
    },
  });

  cookieStore.set(SESSION_COOKIE_NAME, newSessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: sessionExpires,
    path: "/",
  });

  cookieStore.set(REFRESH_COOKIE_NAME, newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: refreshExpires,
    path: "/",
  });

  return updatedSession;
}

export async function requireSession(): Promise<SessionData> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function restoreSession(sessionId: string): Promise<SessionData | null> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });
  if (!session) {
    return null;
  }
  if (session.expires < new Date()) {
    await prisma.session
      .delete({
        where: { id: session.id },
      })
      .catch(() => {});
    return null;
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, session.sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: session.expires,
    path: "/",
  });
  cookieStore.set(REFRESH_COOKIE_NAME, session.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: session.refreshTokenExpires,
    path: "/",
  });

  await prisma.session.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date() },
  });

  let impersonator: User | null = null;
  if (session.impersonatorId) {
    impersonator = await prisma.user.findUnique({
      where: { id: session.impersonatorId },
    });
  }

  return {
    session,
    user: session.user,
    impersonator,
  };
}
