import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").optional(),
  handle: z
    .string()
    .min(3, "Handle must be at least 3 characters")
    .max(20, "Handle must be at most 20 characters")
    .regex(
      /^[a-z0-9_-]+$/,
      "Handle can only contain lowercase letters, numbers, underscores, and hyphens",
    )
    .optional(),
});

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

export const verifyTwoFactorSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
  sessionId: z.string(),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const changeEmailSchema = z.object({
  newEmail: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const requestMagicLinkSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const verifyEmailSchema = z.object({
  token: z.string(),
});

export const enableTwoFactorSchema = z.object({
  password: z.string().min(1, "Password is required"),
  code: z.string().length(6, "Code must be 6 digits"),
});

export const disableTwoFactorSchema = z.object({
  password: z.string().min(1, "Password is required"),
  code: z.string().length(6, "Code must be 6 digits").optional(),
  recoveryCode: z.string().optional(),
});

export const verifyRecoveryCodeSchema = z.object({
  code: z.string(),
  sessionId: z.string(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  bio: z.string().max(500).optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type VerifyTwoFactorInput = z.infer<typeof verifyTwoFactorSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;
export type RequestMagicLinkInput = z.infer<typeof requestMagicLinkSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type EnableTwoFactorInput = z.infer<typeof enableTwoFactorSchema>;
export type DisableTwoFactorInput = z.infer<typeof disableTwoFactorSchema>;
export type VerifyRecoveryCodeInput = z.infer<typeof verifyRecoveryCodeSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;












