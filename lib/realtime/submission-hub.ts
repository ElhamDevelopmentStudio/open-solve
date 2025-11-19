import type { WebSocket } from "ws";
import { getSubmissionDetailForUser } from "@/lib/submissions/detail";
import type { SubmissionDetailPayload } from "@/lib/submissions/types";
import { logger } from "@/lib/logger";

type ClientMeta = {
  userId: string;
  subscriptions: Set<string>;
  alive: boolean;
};

type ServerMessage =
  | { type: "ready" }
  | { type: "subscribed"; submissionId: string }
  | { type: "unsubscribed"; submissionId: string }
  | { type: "error"; submissionId?: string; message: string }
  | { type: "update"; submissionId: string; payload: SubmissionDetailPayload };

type ClientMessage =
  | { type: "subscribe"; submissionId: string }
  | { type: "unsubscribe"; submissionId: string }
  | { type: "ping" };

export class SubmissionRealtimeHub {
  private clients = new Set<WebSocket>();
  private meta = new WeakMap<WebSocket, ClientMeta>();
  private subscriptionMap = new Map<string, Set<WebSocket>>();
  private heartbeat: NodeJS.Timeout;

  constructor() {
    this.heartbeat = setInterval(() => this.tick(), 30_000).unref();
  }

  attach(ws: WebSocket, userId: string) {
    const meta: ClientMeta = { userId, subscriptions: new Set(), alive: true };
    this.clients.add(ws);
    this.meta.set(ws, meta);
    ws.on("message", (raw) => this.handleMessage(ws, raw));
    ws.on("close", (code) => {
      logger.debug({ code }, "submission realtime socket closed");
      this.detach(ws);
    });
    ws.on("error", (error) => {
      logger.warn({ error }, "submission realtime socket error");
      this.detach(ws);
    });
    ws.on("pong", () => {
      const ref = this.meta.get(ws);
      if (ref) {
        ref.alive = true;
      }
    });
    this.send(ws, { type: "ready" });
  }

  publish(userId: string, submissionId: string, payload: SubmissionDetailPayload) {
    const sockets = this.subscriptionMap.get(submissionId);
    if (!sockets || sockets.size === 0) {
      return;
    }
    for (const ws of sockets) {
      const meta = this.meta.get(ws);
      if (!meta || meta.userId !== userId) continue;
      this.send(ws, { type: "update", submissionId, payload });
    }
  }

  shutdown() {
    clearInterval(this.heartbeat);
    for (const ws of this.clients) {
      try {
        ws.terminate();
      } catch {
        // ignore
      }
    }
    this.clients.clear();
    this.subscriptionMap.clear();
    this.meta = new WeakMap();
  }

  private async handleMessage(ws: WebSocket, raw: WebSocket.RawData) {
    const meta = this.meta.get(ws);
    if (!meta) {
      return;
    }
    let parsed: ClientMessage | null = null;
    try {
      parsed = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      this.send(ws, { type: "error", message: "invalid_payload" });
      return;
    }
    if (!parsed) return;

    switch (parsed.type) {
      case "ping": {
        this.send(ws, { type: "ready" });
        break;
      }
      case "subscribe": {
        await this.subscribe(ws, meta, parsed.submissionId);
        break;
      }
      case "unsubscribe": {
        this.unsubscribe(ws, parsed.submissionId);
        break;
      }
      default:
        this.send(ws, { type: "error", message: "unknown_event" });
    }
  }

  private async subscribe(ws: WebSocket, meta: ClientMeta, submissionId: string) {
    if (!submissionId) {
      this.send(ws, { type: "error", message: "missing_submission" });
      return;
    }
    try {
      const payload = await getSubmissionDetailForUser(submissionId, meta.userId);
      if (!payload) {
        this.send(ws, { type: "error", submissionId, message: "not_found" });
        return;
      }
      meta.subscriptions.add(submissionId);
      const slots = this.subscriptionMap.get(submissionId) ?? new Set<WebSocket>();
      slots.add(ws);
      this.subscriptionMap.set(submissionId, slots);
      this.send(ws, { type: "subscribed", submissionId });
      this.send(ws, { type: "update", submissionId, payload });
    } catch (error) {
      logger.error({ error, submissionId }, "failed to subscribe to submission realtime feed");
      this.send(ws, { type: "error", submissionId, message: "internal_error" });
    }
  }

  private unsubscribe(ws: WebSocket, submissionId: string) {
    const meta = this.meta.get(ws);
    if (!meta) return;
    if (!submissionId) return;
    meta.subscriptions.delete(submissionId);
    const slots = this.subscriptionMap.get(submissionId);
    if (slots) {
      slots.delete(ws);
      if (slots.size === 0) {
        this.subscriptionMap.delete(submissionId);
      } else {
        this.subscriptionMap.set(submissionId, slots);
      }
    }
    this.send(ws, { type: "unsubscribed", submissionId });
  }

  private detach(ws: WebSocket) {
    const meta = this.meta.get(ws);
    this.clients.delete(ws);
    if (!meta) return;
    for (const submissionId of meta.subscriptions) {
      const slots = this.subscriptionMap.get(submissionId);
      if (slots) {
        slots.delete(ws);
        if (slots.size === 0) {
          this.subscriptionMap.delete(submissionId);
        }
      }
    }
    this.meta.delete(ws);
  }

  private tick() {
    for (const ws of this.clients) {
      const meta = this.meta.get(ws);
      if (!meta) continue;
      if (!meta.alive) {
        try {
          ws.terminate();
        } catch {
          // ignore
        }
        this.detach(ws);
        continue;
      }
      meta.alive = false;
      try {
        ws.ping();
      } catch {
        this.detach(ws);
      }
    }
  }

  private send(ws: WebSocket, message: ServerMessage) {
    if (ws.readyState !== ws.OPEN) return;
    ws.send(JSON.stringify(message));
  }
}

declare global {
  var __submissionHub: SubmissionRealtimeHub | undefined;
}

export const getSubmissionRealtimeHub = () => {
  if (!globalThis.__submissionHub) {
    globalThis.__submissionHub = new SubmissionRealtimeHub();
  }
  return globalThis.__submissionHub;
};

export const hasSubmissionRealtimeHub = () => Boolean(globalThis.__submissionHub);
