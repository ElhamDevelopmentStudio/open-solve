import { describe, expect, it } from "vitest";

import { buildDeletedUserProfile } from "@/lib/security/user";

describe("security/user", () => {
  it("builds anonymized tombstone profile", () => {
    const profile = buildDeletedUserProfile("user_123456");
    expect(profile.email).toContain("deleted+");
    expect(profile.handle).toContain("deleted_user");
    expect(profile.status).toEqual("DELETED");
    expect(profile.emailHash).toBeDefined();
    expect(profile.emailEncrypted).toBeDefined();
    expect(profile.hashedPassword).toBeNull();
  });
});
