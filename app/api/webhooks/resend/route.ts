import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

type ResendEvent = {
  type?: string;
  event?: string;
  data?: any;
  id?: string;
  [key: string]: any;
};

function extractMessageId(payload: ResendEvent): string | null {
  const d = payload.data ?? {};
  return d.id || d.email_id || d.emailId || d.email?.id || payload.id || null;
}

function extractRecipient(payload: ResendEvent): string | null {
  const d = payload.data ?? {};
  const email = d.to?.[0] || d.to || d.recipient || d.email?.to?.[0] || d.email?.to || null;
  return typeof email === "string" ? email : Array.isArray(email) ? email[0] : null;
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
  const providerReason = body.data?.reason || body.data?.error || body["error"] || undefined;

  if (!messageId || !status) {
    logger.warn({ body }, "resend webhook: missing messageId or status");
    return NextResponse.json({ ok: true });
  }

  try {
    const sets: any = { status, providerReason };
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
