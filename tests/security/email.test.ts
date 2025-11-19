import { describe, expect, it } from "vitest";

import {
  buildProtectedEmailFields,
  decryptEmail,
  encryptEmail,
  hashEmail,
} from "@/lib/security/email";

describe("security/email", () => {
  it("normalizes email before hashing", () => {
    const first = hashEmail("Example@OpenSolve.dev ");
    const second = hashEmail("example@opensolve.dev");
    expect(first).toEqual(second);
  });

  it("encrypts emails with authenticated cipher", () => {
    const sample = "ops@opensolve.dev";
    const encrypted = encryptEmail(sample);
    expect(encrypted).not.toContain(sample);
    const decrypted = decryptEmail(encrypted);
    expect(decrypted).toEqual(sample);
  });

  it("returns both hash and ciphertext", () => {
    const fields = buildProtectedEmailFields("ops@opensolve.dev");
    expect(fields.emailHash).toMatch(/^[a-f0-9]{64}$/);
    expect(fields.emailEncrypted).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});
