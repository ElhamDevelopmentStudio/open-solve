import { createAuditLog } from "@/lib/auth/audit";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/auth/password";
import { checkRateLimit, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { createSession, deleteAllUserSessions, deleteSession } from "@/lib/auth/session";
import { createVerificationToken, generateSecureToken } from "@/lib/auth/tokens";
import {
  generateRecoveryCodes,
  generateTOTPSecret,
  generateTOTPUri,
  hashRecoveryCode,
  verifyRecoveryCode,
  verifyTOTP,
} from "@/lib/auth/totp";
import { generateHandle, getClientInfo, normalizeEmail } from "@/lib/auth/utils";
import {
  sendEmailChangedNotification,
  sendMagicLinkEmail,
  sendPasswordResetEmail,
  sendTwoFactorEnabledEmail,
  sendVerificationEmail,
} from "@/lib/email";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { protectedProcedure, publicProcedure, router } from "@/lib/trpc/trpc";
import * as authSchemas from "@/lib/validators/auth";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const authRouter = router({
  getSession: publicProcedure.query(({ ctx }) => {
    if (!ctx.user || !ctx.session) {
      return null;
    }

    return {
      user: {
        id: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name,
        handle: ctx.user.handle,
        avatarUrl: ctx.user.avatarUrl,
        role: ctx.user.role,
        twoFactorEnabled: ctx.user.twoFactorEnabled,
        emailVerified: ctx.user.emailVerified,
      },
      session: {
        id: ctx.session.id,
        expiresAt: ctx.session.expires,
      },
    };
  }),

  signUp: publicProcedure.input(authSchemas.signUpSchema).mutation(async ({ input }) => {
    const { ipAddress, userAgent } = await getClientInfo();

    // Rate limit
    const rateLimit = await checkRateLimit(ipAddress ?? "anonymous", "signup", RATE_LIMITS.SIGNUP);
    if (!rateLimit.allowed) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many signup attempts. Please try again later.",
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(input.password);
    if (!passwordValidation.valid) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: passwordValidation.errors.join(", "),
      });
    }

    const email = normalizeEmail(input.email);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "An account with this email already exists",
      });
    }

    // Generate handle if not provided
    let handle = input.handle;
    if (!handle) {
      handle = generateHandle(input.name || email.split("@")[0]);
    }

    // Check if handle is taken
    const handleExists = await prisma.user.findUnique({
      where: { handle },
    });

    if (handleExists) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This handle is already taken",
      });
    }

    // Create user
    const hashedPassword = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        name: input.name,
        handle,
      },
    });

    // Send verification email (link verifies account email)
    const { token } = createVerificationToken();
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        type: "email_verification",
        userId: user.id,
        expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    });

    await sendVerificationEmail(user.id, email, token);

    // Create session
    await createSession(user.id, userAgent, ipAddress);

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: "SIGN_IN",
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: "Account created successfully. Please check your email to verify your account.",
    };
  }),

  signIn: publicProcedure.input(authSchemas.signInSchema).mutation(async ({ input }) => {
    const { ipAddress, userAgent } = await getClientInfo();

    // Rate limit
    const rateLimit = await checkRateLimit(ipAddress ?? "anonymous", "login", RATE_LIMITS.LOGIN);
    if (!rateLimit.allowed) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many login attempts. Please try again later.",
      });
    }

    const email = normalizeEmail(input.email);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.hashedPassword) {
      await createAuditLog({
        action: "SIGN_IN_FAILED",
        ipAddress,
        userAgent,
        metadata: { reason: "invalid_credentials" },
      });
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    // Check if user is banned
    if (user.bannedAt) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Your account has been banned",
      });
    }

    // Verify password
    const isValid = await verifyPassword(input.password, user.hashedPassword);
    if (!isValid) {
      await createAuditLog({
        userId: user.id,
        action: "SIGN_IN_FAILED",
        ipAddress,
        userAgent,
        metadata: { reason: "invalid_password" },
      });
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    // If 2FA is enabled, don't create session yet
    if (user.twoFactorEnabled) {
      // Create a temporary session marker
      const tempSession = await prisma.session.create({
        data: {
          userId: user.id,
          sessionToken: "temp_" + Math.random().toString(36),
          refreshToken: "temp_" + Math.random().toString(36),
          userAgent,
          ipAddress,
          expires: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
          refreshTokenExpires: new Date(Date.now() + 5 * 60 * 1000),
          twoFactorVerified: false,
        },
      });

      return {
        requiresTwoFactor: true,
        sessionId: tempSession.id,
      };
    }

    // Create session
    await createSession(user.id, userAgent, ipAddress, input.rememberMe);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: "SIGN_IN",
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      requiresTwoFactor: false,
    };
  }),

  verifyTwoFactor: publicProcedure
    .input(authSchemas.verifyTwoFactorSchema)
    .mutation(async ({ input }) => {
      const { ipAddress, userAgent } = await getClientInfo();

      // Rate limit
      const rateLimit = await checkRateLimit(
        ipAddress ?? "anonymous",
        "two_factor",
        RATE_LIMITS.TWO_FACTOR,
      );
      if (!rateLimit.allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many attempts. Please try again later.",
        });
      }

      const tempSession = await prisma.session.findUnique({
        where: { id: input.sessionId },
        include: { user: true },
      });

      if (!tempSession || tempSession.twoFactorVerified || tempSession.expires < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired session",
        });
      }

      const secret = await prisma.twoFactorSecret.findUnique({
        where: { userId: tempSession.userId },
      });

      if (!secret) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Two-factor authentication not set up",
        });
      }

      const isValid = verifyTOTP(input.code, secret.secret);
      if (!isValid) {
        await createAuditLog({
          userId: tempSession.userId,
          action: "TWO_FACTOR_CHALLENGE_FAILED",
          ipAddress,
          userAgent,
        });
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid verification code",
        });
      }

      // Delete temp session and create real one
      await prisma.session.delete({ where: { id: tempSession.id } });
      await createSession(tempSession.userId, userAgent, ipAddress);

      // Update last login
      await prisma.user.update({
        where: { id: tempSession.userId },
        data: { lastLoginAt: new Date() },
      });

      await createAuditLog({
        userId: tempSession.userId,
        action: "SIGN_IN",
        ipAddress,
        userAgent,
      });

      return { success: true };
    }),

  verifyRecoveryCode: publicProcedure
    .input(authSchemas.verifyRecoveryCodeSchema)
    .mutation(async ({ input }) => {
      const { ipAddress, userAgent } = await getClientInfo();

      const tempSession = await prisma.session.findUnique({
        where: { id: input.sessionId },
      });

      if (!tempSession || tempSession.twoFactorVerified || tempSession.expires < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired session",
        });
      }

      const recoveryCodes = await prisma.twoFactorRecoveryCode.findMany({
        where: {
          userId: tempSession.userId,
          consumedAt: null,
        },
      });

      let validCode = null;
      for (const code of recoveryCodes) {
        if (verifyRecoveryCode(input.code, code.codeHash)) {
          validCode = code;
          break;
        }
      }

      if (!validCode) {
        await createAuditLog({
          userId: tempSession.userId,
          action: "TWO_FACTOR_CHALLENGE_FAILED",
          ipAddress,
          userAgent,
          metadata: { method: "recovery_code" },
        });
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid recovery code",
        });
      }

      // Mark recovery code as used
      await prisma.twoFactorRecoveryCode.update({
        where: { id: validCode.id },
        data: { consumedAt: new Date() },
      });

      // Delete temp session and create real one
      await prisma.session.delete({ where: { id: tempSession.id } });
      await createSession(tempSession.userId, userAgent, ipAddress);

      await prisma.user.update({
        where: { id: tempSession.userId },
        data: { lastLoginAt: new Date() },
      });

      await createAuditLog({
        userId: tempSession.userId,
        action: "RECOVERY_CODE_USED",
        ipAddress,
        userAgent,
      });

      return { success: true };
    }),

  signOut: protectedProcedure.mutation(async ({ ctx }) => {
    const { ipAddress, userAgent } = await getClientInfo();

    await deleteSession();

    await createAuditLog({
      userId: ctx.user.id,
      action: "SIGN_OUT",
      ipAddress,
      userAgent,
    });

    return { success: true };
  }),

  signOutAllDevices: protectedProcedure.mutation(async ({ ctx }) => {
    const { ipAddress, userAgent } = await getClientInfo();

    await deleteAllUserSessions(ctx.user.id);

    await createAuditLog({
      userId: ctx.user.id,
      action: "SESSION_REVOKED",
      ipAddress,
      userAgent,
      metadata: { allDevices: true },
    });

    return { success: true };
  }),

  requestPasswordReset: publicProcedure
    .input(authSchemas.requestPasswordResetSchema)
    .mutation(async ({ input }) => {
      const { ipAddress } = await getClientInfo();

      // Rate limit
      const rateLimit = await checkRateLimit(
        ipAddress ?? "anonymous",
        "password_reset",
        RATE_LIMITS.PASSWORD_RESET,
      );
      if (!rateLimit.allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many password reset requests. Please try again later.",
        });
      }

      const email = normalizeEmail(input.email);
      const user = await prisma.user.findUnique({ where: { email } });

      // Always return success to prevent email enumeration
      if (!user) {
        return {
          success: true,
          message: "If an account exists with this email, a password reset link will be sent.",
        };
      }

      const { token } = createVerificationToken();
      await prisma.verificationToken.create({
        data: {
          identifier: email,
          token,
          type: "password_reset",
          userId: user.id,
          expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        },
      });

      await sendPasswordResetEmail(user.id, email, token);

      await createAuditLog({
        userId: user.id,
        action: "PASSWORD_RESET_REQUESTED",
        ipAddress,
        userAgent: null,
      });

      return {
        success: true,
        message: "If an account exists with this email, a password reset link will be sent.",
      };
    }),

  resetPassword: publicProcedure
    .input(authSchemas.resetPasswordSchema)
    .mutation(async ({ input }) => {
      const { ipAddress, userAgent } = await getClientInfo();

      // Validate password strength
      const passwordValidation = validatePasswordStrength(input.password);
      if (!passwordValidation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: passwordValidation.errors.join(", "),
        });
      }

      const verificationToken = await prisma.verificationToken.findUnique({
        where: { token: input.token },
      });

      if (!verificationToken || verificationToken.type !== "password_reset") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired token",
        });
      }

      if (verificationToken.expires < new Date()) {
        await prisma.verificationToken.delete({ where: { token: input.token } });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This password reset link has expired",
        });
      }

      const user = await prisma.user.findUnique({
        where: { email: verificationToken.identifier },
      });

      if (!user) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User not found",
        });
      }

      // Update password
      const hashedPassword = await hashPassword(input.password);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          hashedPassword,
          passwordUpdatedAt: new Date(),
        },
      });

      // Delete the verification token
      await prisma.verificationToken.delete({ where: { token: input.token } });

      // Revoke all sessions
      await deleteAllUserSessions(user.id);

      await createAuditLog({
        userId: user.id,
        action: "PASSWORD_RESET_COMPLETED",
        ipAddress,
        userAgent,
      });

      return { success: true, message: "Password reset successfully" };
    }),

  requestMagicLink: publicProcedure
    .input(authSchemas.requestMagicLinkSchema)
    .mutation(async ({ input }) => {
      const { ipAddress } = await getClientInfo();

      // Rate limit
      const rateLimit = await checkRateLimit(
        ipAddress ?? "anonymous",
        "magic_link",
        RATE_LIMITS.MAGIC_LINK,
      );
      if (!rateLimit.allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many requests. Please try again later.",
        });
      }

      const email = normalizeEmail(input.email);
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        // Return success to prevent email enumeration
        return {
          success: true,
          message: "If an account exists with this email, a sign-in link will be sent.",
        };
      }

      const { token } = createVerificationToken();
      await prisma.verificationToken.create({
        data: {
          identifier: email,
          token,
          type: "magic_link",
          userId: user.id,
          expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        },
      });

      await sendMagicLinkEmail(user.id, email, token);

      await createAuditLog({
        userId: user.id,
        action: "MAGIC_LINK_SENT",
        ipAddress,
        userAgent: null,
      });

      return {
        success: true,
        message: "If an account exists with this email, a sign-in link will be sent.",
      };
    }),

  verifyEmail: publicProcedure.input(authSchemas.verifyEmailSchema).mutation(async ({ input }) => {
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token: input.token },
    });

    if (!verificationToken) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid verification token",
      });
    }

    if (verificationToken.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token: input.token } });
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Verification link has expired",
      });
    }

    if (verificationToken.type === "email_verification") {
      const user = await prisma.user.findUnique({
        where: { email: verificationToken.identifier },
      });

      if (!user) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User not found",
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });

      await prisma.verificationToken.delete({ where: { token: input.token } });
      return { success: true, message: "Email verified successfully" };
    }

    if (verificationToken.type === "email_change") {
      if (!verificationToken.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid token payload" });
      }
      const user = await prisma.user.findUnique({ where: { id: verificationToken.userId } });
      if (!user) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "User not found" });
      }
      const oldEmail = user.email;
      const newEmail = verificationToken.identifier;

      await prisma.user.update({
        where: { id: user.id },
        data: { email: newEmail, emailVerified: new Date() },
      });

      await prisma.verificationToken.delete({ where: { token: input.token } });

      // Notify both addresses
      await sendEmailChangedNotification(user.id, newEmail, oldEmail);

      return { success: true, message: "Email changed and verified successfully" };
    }

    throw new TRPCError({ code: "BAD_REQUEST", message: "Unsupported verification type" });
  }),

  verifyMagicLink: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const { ipAddress, userAgent } = await getClientInfo();

      const record = await prisma.verificationToken.findUnique({ where: { token: input.token } });
      if (!record || record.type !== "magic_link") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired token" });
      }
      if (record.expires < new Date()) {
        await prisma.verificationToken.delete({ where: { token: input.token } });
        throw new TRPCError({ code: "BAD_REQUEST", message: "This link has expired" });
      }

      const user = await prisma.user.findUnique({ where: { email: record.identifier } });
      if (!user) {
        await prisma.verificationToken.delete({ where: { token: input.token } });
        throw new TRPCError({ code: "BAD_REQUEST", message: "User not found" });
      }

      // Consume token and sign the user in
      await prisma.verificationToken.delete({ where: { token: input.token } });
      await createSession(user.id, userAgent, ipAddress);

      await createAuditLog({
        userId: user.id,
        action: "MAGIC_LINK_CONSUMED",
        ipAddress,
        userAgent,
      });

      return { success: true };
    }),

  resendVerificationEmail: protectedProcedure.mutation(async ({ ctx }) => {
    const { ipAddress } = await getClientInfo();

    // Rate limit
    const rateLimit = await checkRateLimit(
      ipAddress ?? "anonymous",
      "email_verify",
      RATE_LIMITS.EMAIL_VERIFY,
    );
    if (!rateLimit.allowed) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many requests. Please try again later.",
      });
    }

    if (ctx.user.emailVerified) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Email is already verified",
      });
    }

    // Delete existing tokens
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: ctx.user.email,
        type: "email_verification",
      },
    });

    const { token } = createVerificationToken();
    await prisma.verificationToken.create({
      data: {
        identifier: ctx.user.email,
        token,
        type: "email_verification",
        userId: ctx.user.id,
        expires: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    await sendVerificationEmail(ctx.user.id, ctx.user.email, token);

    return { success: true, message: "Verification email sent" };
  }),

  setupTwoFactor: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.twoFactorEnabled) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Two-factor authentication is already enabled",
      });
    }

    // Generate secret
    const secret = generateTOTPSecret();
    const uri = generateTOTPUri(ctx.user.email, secret);

    // Store temporarily (will be confirmed when user verifies)
    await prisma.twoFactorSecret.upsert({
      where: { userId: ctx.user.id },
      create: {
        userId: ctx.user.id,
        secret,
      },
      update: {
        secret,
      },
    });

    return {
      secret,
      uri,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}`,
    };
  }),

  enableTwoFactor: protectedProcedure
    .input(authSchemas.enableTwoFactorSchema)
    .mutation(async ({ input, ctx }) => {
      const { ipAddress, userAgent } = await getClientInfo();

      if (!ctx.user.hashedPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Password is required",
        });
      }

      // Verify password
      const isValid = await verifyPassword(input.password, ctx.user.hashedPassword);
      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid password",
        });
      }

      // Get the secret
      const twoFactorSecret = await prisma.twoFactorSecret.findUnique({
        where: { userId: ctx.user.id },
      });

      if (!twoFactorSecret) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Two-factor setup not initiated",
        });
      }

      // Verify TOTP code
      const isValidCode = verifyTOTP(input.code, twoFactorSecret.secret);
      if (!isValidCode) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid verification code",
        });
      }

      // Generate recovery codes
      const codes = generateRecoveryCodes();
      await prisma.twoFactorRecoveryCode.createMany({
        data: codes.map((code) => ({
          userId: ctx.user.id,
          codeHash: hashRecoveryCode(code),
        })),
      });

      // Enable 2FA
      await prisma.user.update({
        where: { id: ctx.user.id },
        data: { twoFactorEnabled: true },
      });

      await sendTwoFactorEnabledEmail(ctx.user.id, ctx.user.email);

      await createAuditLog({
        userId: ctx.user.id,
        action: "TWO_FACTOR_ENABLED",
        ipAddress,
        userAgent,
      });

      return {
        success: true,
        recoveryCodes: codes,
      };
    }),

  disableTwoFactor: protectedProcedure
    .input(authSchemas.disableTwoFactorSchema)
    .mutation(async ({ input, ctx }) => {
      const { ipAddress, userAgent } = await getClientInfo();

      if (!ctx.user.twoFactorEnabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Two-factor authentication is not enabled",
        });
      }

      if (!ctx.user.hashedPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Password is required",
        });
      }

      // Verify password
      const isValid = await verifyPassword(input.password, ctx.user.hashedPassword);
      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid password",
        });
      }

      // Verify either TOTP code or recovery code
      if (input.code) {
        const twoFactorSecret = await prisma.twoFactorSecret.findUnique({
          where: { userId: ctx.user.id },
        });

        if (!twoFactorSecret || !verifyTOTP(input.code, twoFactorSecret.secret)) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid verification code",
          });
        }
      } else if (input.recoveryCode) {
        const recoveryCodes = await prisma.twoFactorRecoveryCode.findMany({
          where: { userId: ctx.user.id, consumedAt: null },
        });

        const validCode = recoveryCodes.find((code) =>
          verifyRecoveryCode(input.recoveryCode!, code.codeHash),
        );

        if (!validCode) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid recovery code",
          });
        }
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either TOTP code or recovery code is required",
        });
      }

      // Disable 2FA
      await prisma.user.update({
        where: { id: ctx.user.id },
        data: { twoFactorEnabled: false },
      });

      // Delete secret and recovery codes
      await prisma.twoFactorSecret.delete({
        where: { userId: ctx.user.id },
      });
      await prisma.twoFactorRecoveryCode.deleteMany({
        where: { userId: ctx.user.id },
      });

      await createAuditLog({
        userId: ctx.user.id,
        action: "TWO_FACTOR_DISABLED",
        ipAddress,
        userAgent,
      });

      return { success: true };
    }),

  changePassword: protectedProcedure
    .input(authSchemas.changePasswordSchema)
    .mutation(async ({ input, ctx }) => {
      const { ipAddress, userAgent } = await getClientInfo();

      if (!ctx.user.hashedPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Password authentication not set up",
        });
      }

      // Verify current password
      const isValid = await verifyPassword(input.currentPassword, ctx.user.hashedPassword);
      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid current password",
        });
      }

      // Validate new password
      const passwordValidation = validatePasswordStrength(input.newPassword);
      if (!passwordValidation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: passwordValidation.errors.join(", "),
        });
      }

      // Update password
      const hashedPassword = await hashPassword(input.newPassword);
      await prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          hashedPassword,
          passwordUpdatedAt: new Date(),
        },
      });

      await createAuditLog({
        userId: ctx.user.id,
        action: "PASSWORD_CHANGED",
        ipAddress,
        userAgent,
      });

      return { success: true, message: "Password changed successfully" };
    }),

  changeEmail: protectedProcedure
    .input(authSchemas.changeEmailSchema)
    .mutation(async ({ input, ctx }) => {
      const { ipAddress, userAgent } = await getClientInfo();

      if (!ctx.user.hashedPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Password is required",
        });
      }

      // Verify password
      const isValid = await verifyPassword(input.password, ctx.user.hashedPassword);
      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid password",
        });
      }

      const newEmail = normalizeEmail(input.newEmail);

      // Check if email is already taken
      const existingUser = await prisma.user.findUnique({
        where: { email: newEmail },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This email is already in use",
        });
      }

      // Create a verification token for email change (do not change yet)
      const { token } = createVerificationToken();
      await prisma.verificationToken.create({
        data: {
          identifier: newEmail,
          token,
          type: "email_change",
          userId: ctx.user.id,
          expires: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      await sendVerificationEmail(ctx.user.id, newEmail, token);

      await createAuditLog({
        userId: ctx.user.id,
        action: "EMAIL_CHANGED",
        ipAddress,
        userAgent,
        metadata: { newEmail, pending: true },
      });

      return { success: true, message: "Please verify your new email to apply the change." };
    }),

  updateProfile: protectedProcedure
    .input(authSchemas.updateProfileSchema)
    .mutation(async ({ input, ctx }) => {
      await prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          name: input.name,
          bio: input.bio,
          country: input.country,
          timezone: input.timezone,
          avatarUrl: input.avatarUrl,
        },
      });

      return { success: true, message: "Profile updated successfully" };
    }),

  getSessions: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await prisma.session.findMany({
      where: { userId: ctx.user.id },
      orderBy: { lastUsedAt: "desc" },
    });

    return sessions.map((session) => ({
      id: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      lastUsedAt: session.lastUsedAt,
      createdAt: session.createdAt,
      isCurrent: session.id === ctx.session.id,
    }));
  }),

  revokeSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { ipAddress, userAgent } = await getClientInfo();

      const session = await prisma.session.findUnique({
        where: { id: input.sessionId },
      });

      if (!session || session.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      await prisma.session.delete({
        where: { id: input.sessionId },
      });

      await createAuditLog({
        userId: ctx.user.id,
        action: "SESSION_REVOKED",
        ipAddress,
        userAgent,
        metadata: { sessionId: input.sessionId },
      });

      return { success: true };
    }),

  deleteAccount: protectedProcedure
    .input(z.object({ password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { ipAddress, userAgent } = await getClientInfo();

      if (!ctx.user.hashedPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Password is required",
        });
      }

      // Verify password
      const isValid = await verifyPassword(input.password, ctx.user.hashedPassword);
      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid password",
        });
      }

      // Delete all related data
      await prisma.$transaction([
        // Delete sessions
        prisma.session.deleteMany({ where: { userId: ctx.user.id } }),
        // Delete 2FA data
        prisma.twoFactorSecret.deleteMany({ where: { userId: ctx.user.id } }),
        prisma.twoFactorRecoveryCode.deleteMany({ where: { userId: ctx.user.id } }),
        // Delete OAuth accounts
        prisma.account.deleteMany({ where: { userId: ctx.user.id } }),
        // Keep audit logs but set userId to null
        prisma.authAuditLog.updateMany({
          where: { userId: ctx.user.id },
          data: { userId: null },
        }),
        // Delete user
        prisma.user.delete({ where: { id: ctx.user.id } }),
      ]);

      await createAuditLog({
        action: "USER_BANNED",
        ipAddress,
        userAgent,
        metadata: { reason: "self_deletion", userId: ctx.user.id },
      });

      await deleteSession();

      return { success: true };
    }),

  getAuditLogs: protectedProcedure.query(async ({ ctx }) => {
    const logs = await prisma.authAuditLog.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return logs;
  }),

  githubLogin: publicProcedure.query(() => {
    const state = generateSecureToken(32);
    const url = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(`${env.APP_URL}/api/auth/github/callback`)}&scope=user:email&state=${state}`;
    return { url };
  }),
});
