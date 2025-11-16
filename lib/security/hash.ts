import crypto from "node:crypto";

import { env } from "@/lib/env";

export function hashWithSecret(value: string, context: string) {
  if (!value) {
    return null;
  }
  const secret = env.SENSITIVE_DATA_KEY ?? env.SESSION_SECRET;
  return crypto.createHmac("sha256", secret).update(`${context}:${value}`).digest("hex");
}
