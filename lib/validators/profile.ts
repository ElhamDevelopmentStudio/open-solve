import { z } from "zod";

const socialLinkSchema = z
  .string()
  .max(200)
  .trim()
  .optional()
  .nullable();

export const socialLinksSchema = z.object({
  github: socialLinkSchema,
  linkedin: socialLinkSchema,
  twitter: socialLinkSchema,
  website: socialLinkSchema,
});

export const profileSettingsSchema = z.object({
  shareAcceptedCode: z.boolean(),
  showOnLeaderboard: z.boolean(),
  showCountry: z.boolean(),
  showSocials: z.boolean(),
  socials: socialLinksSchema,
});

export type ProfileSettingsInput = z.infer<typeof profileSettingsSchema>;
