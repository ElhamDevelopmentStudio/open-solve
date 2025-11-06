import { env } from "@/lib/env";
import crypto from "crypto";
import { nanoid } from "nanoid";

export function generateSecureToken(length = 32): string {
  return nanoid(length);
}

export function generateSessionToken(): string {
  return nanoid(48);
}

export function generateRefreshToken(): string {
  return nanoid(64);
}

export function hashToken(token: string): string {
  return crypto
    .createHmac("sha256", env.SESSION_SECRET)
    .update(token)
    .digest("hex");
}

export function createVerificationToken(): {
  token: string;
  hashedToken: string;
} {
  const token = generateSecureToken(48);
  const hashedToken = hashToken(token);
  return { token, hashedToken };
}

export function verifyTokenHash(token: string, hashedToken: string): boolean {
  const computedHash = hashToken(token);
  return crypto.timingSafeEqual(
    Buffer.from(computedHash),
    Buffer.from(hashedToken),
  );
}

