import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;
import type { Prisma } from "@prisma/client";

type ResendEmailEnvelope = {
  id?: string;
  to?: string | string[];
};

type ResendEvent = {
  type?: string;
  event?: string;
  data?: {
    id?: string;
    email_id?: string;
    email?: ResendEmailEnvelope;
    to?: string | string[];
    recipient?: string;
    reason?: string;
    error?: string;
    [key: string]: unknown;
  };
  id?: string;
  error?: string;
  [key: string]: unknown;
};

function extractMessageId(payload: ResendEvent): string | null {
  const d = payload.data ?? {};
  return d.id ?? d.email_id ?? d.email?.id ?? payload.id ?? null;
}

function extractRecipient(payload: ResendEvent): string | null {
  const d = payload.data ?? {};
  const email = d.to || d.recipient || d.email?.to || null;
  if (typeof email === "string") {
    return email;
  }
  if (Array.isArray(email)) {
    return email[0] ?? null;
  }
  return null;
}

function normalizeStatus(evt: string): string | null {
  const e = evt.toLowerCase();
  if (e.includes("delivered")) return "delivered";
  if (e.includes("bounced") || e.includes("blocked")) return "bounced";
  if (e.includes("complained") || e.includes("spam")) return "complained";
  if (e.includes("deferred")) return "deferred";
  if (e.includes("rejected")) return "rejected";
  return null;
}

export async function POST(req: Request) {
  let body: ResendEvent;
  try {
    body = (await req.json()) as ResendEvent;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = body.type || body.event || "";
  const status = normalizeStatus(eventType);
  const messageId = extractMessageId(body);
  const recipient = extractRecipient(body);
  const providerReason = body.data?.reason || body.data?.error || body.error || undefined;

  if (!messageId || !status) {
    logger.warn({ body }, "resend webhook: missing messageId or status");
    return NextResponse.json({ ok: true });
  }

  try {
    const sets: Prisma.EmailMessageUpdateManyMutationInput = { status, providerReason };
    if (status === "delivered") sets.deliveredAt = new Date();
    if (["bounced", "rejected", "complained"].includes(status)) sets.failureAt = new Date();

    await prisma.emailMessage.updateMany({
      where: { resendMessageId: messageId },
      data: sets,
    });

    if (recipient && ["bounced", "complained"].includes(status)) {
      await prisma.emailSuppression.upsert({
        where: { email: recipient },
        update: { reason: status },
        create: { email: recipient, reason: status },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ error, body }, "failed to process resend webhook");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export const runtime = "nodejs";
