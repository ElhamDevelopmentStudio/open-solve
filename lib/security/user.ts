import { buildProtectedEmailFields } from "@/lib/security/email";
import { UserStatus } from "@prisma/client";
import { nanoid } from "nanoid";

export function buildDeletedUserProfile(userId: string) {
  const placeholderEmail = `deleted+${userId}@users.opensolve`; // intentionally unique
  const tombstoneHandle = `deleted_user_${userId.slice(0, 6)}_${nanoid(4)}`;
  const protectedEmail = buildProtectedEmailFields(placeholderEmail);
  const now = new Date();
  return {
    email: placeholderEmail,
    ...protectedEmail,
    handle: tombstoneHandle,
    name: null,
    bio: null,
    country: null,
    timezone: null,
    avatarUrl: null,
    socialGithub: null,
    socialLinkedin: null,
    socialTwitter: null,
    socialWebsite: null,
    hashedPassword: null,
    shareAcceptedCode: false,
    showOnLeaderboard: false,
    showCountry: false,
    showSocials: false,
    status: UserStatus.DELETED,
    deletedAt: now,
    piiScrubbedAt: now,
    bannedAt: now,
  } as const;
}
