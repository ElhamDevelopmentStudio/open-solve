import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  if (!env.RESEND_API_KEY) {
    logger.warn("Resend API key not configured, skipping email send");
    console.log("Email would be sent:", options);
    return { success: true, messageId: "dev-mode-no-send" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL,
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error({ data }, "Failed to send email via Resend");
      return {
        success: false,
        error: data.message || "Failed to send email",
      };
    }

    logger.info({ messageId: data.id, to: options.to }, "Email sent successfully");
    return { success: true, messageId: data.id };
  } catch (error) {
    logger.error({ error }, "Error sending email");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

