import { createHash } from "node:crypto";

export function hashSourceCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}
