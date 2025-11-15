import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "./resend";
import * as templates from "./templates";

export async function sendVerificationEmail(
  userId: string,
  email: string,
  token: string,
): Promise<void> {
  const template = templates.getVerifyEmailTemplate(token, email);

  const result = await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
  });

  await prisma.emailMessage.create({
    data: {
      userId,
      type: "verify_email",
      templateVersion: "v1",
      resendMessageId: result.messageId,
      to: email,
      status: result.success ? "sent" : "failed",
      providerReason: result.error,
      sentAt: result.success ? new Date() : null,
      failureAt: result.success ? null : new Date(),
    },
  });

  if (!result.success) {
    logger.error({ email, error: result.error }, "Failed to send verification email");
  }
}

export async function sendPasswordResetEmail(
  userId: string | null,
  email: string,
  token: string,
): Promise<void> {
  const template = templates.getPasswordResetTemplate(token, email);

  const result = await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
  });

  await prisma.emailMessage.create({
    data: {
      userId,
      type: "password_reset",
      templateVersion: "v1",
      resendMessageId: result.messageId,
      to: email,
      status: result.success ? "sent" : "failed",
      providerReason: result.error,
      sentAt: result.success ? new Date() : null,
      failureAt: result.success ? null : new Date(),
    },
  });

  if (!result.success) {
    logger.error({ email, error: result.error }, "Failed to send password reset email");
  }
}

export async function sendMagicLinkEmail(
  userId: string | null,
  email: string,
  token: string,
): Promise<void> {
  const template = templates.getMagicLinkTemplate(token, email);

  const result = await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
  });

  await prisma.emailMessage.create({
    data: {
      userId,
      type: "magic_link",
      templateVersion: "v1",
      resendMessageId: result.messageId,
      to: email,
      status: result.success ? "sent" : "failed",
      providerReason: result.error,
      sentAt: result.success ? new Date() : null,
      failureAt: result.success ? null : new Date(),
    },
  });

  if (!result.success) {
    logger.error({ email, error: result.error }, "Failed to send magic link email");
  }
}

export async function sendTwoFactorEnabledEmail(userId: string, email: string): Promise<void> {
  const template = templates.getTwoFactorEnabledTemplate(email);

  const result = await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
  });

  await prisma.emailMessage.create({
    data: {
      userId,
      type: "two_factor_enabled",
      templateVersion: "v1",
      resendMessageId: result.messageId,
      to: email,
      status: result.success ? "sent" : "failed",
      providerReason: result.error,
      sentAt: result.success ? new Date() : null,
      failureAt: result.success ? null : new Date(),
    },
  });
}

export async function sendEmailChangedNotification(
  userId: string,
  newEmail: string,
  oldEmail: string,
): Promise<void> {
  const template = templates.getEmailChangedTemplate(newEmail, oldEmail);

  // Send to both old and new email
  await Promise.all([
    sendEmail({
      to: oldEmail,
      subject: template.subject,
      html: template.html,
    }),
    sendEmail({
      to: newEmail,
      subject: template.subject,
      html: template.html,
    }),
  ]);
}








