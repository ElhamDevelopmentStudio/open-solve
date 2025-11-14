import type { WebSocket } from "ws";
import type { LeaderboardWindow } from "@/lib/leaderboard/service";
import { logger } from "@/lib/logger";

type ClientMeta = {
  alive: boolean;
};

type LeaderboardServerMessage =
  | { type: "ready" }
  | { type: "update"; windows: LeaderboardWindow[]; at: string };

export class LeaderboardRealtimeHub {
  private clients = new Set<WebSocket>();
  private meta = new WeakMap<WebSocket, ClientMeta>();
  private heartbeat: NodeJS.Timeout;

  constructor() {
    this.heartbeat = setInterval(() => this.tick(), 30_000).unref();
  }

  attach(ws: WebSocket) {
    const meta: ClientMeta = { alive: true };
    this.clients.add(ws);
    this.meta.set(ws, meta);
    ws.on("close", (code) => {
      logger.debug({ code }, "leaderboard realtime socket closed");
      this.detach(ws);
    });
    ws.on("error", (error) => {
      logger.warn({ error }, "leaderboard realtime socket error");
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

  broadcast(windows: LeaderboardWindow[]) {
    if (windows.length === 0) {
      return;
    }
    const unique = Array.from(new Set(windows));
    const payload = JSON.stringify({ type: "update", windows: unique, at: new Date().toISOString() } satisfies LeaderboardServerMessage);
    for (const ws of this.clients) {
      if (ws.readyState !== ws.OPEN) {
        continue;
      }
      ws.send(payload);
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
    this.meta = new WeakMap();
  }

  private detach(ws: WebSocket) {
    this.clients.delete(ws);
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

  private send(ws: WebSocket, message: LeaderboardServerMessage) {
    if (ws.readyState !== ws.OPEN) return;
    ws.send(JSON.stringify(message));
  }
}

export const getLeaderboardRealtimeHub = () => {
  if (!globalThis.__leaderboardHub) {
    globalThis.__leaderboardHub = new LeaderboardRealtimeHub();
  }
  return globalThis.__leaderboardHub;
};

export const hasLeaderboardRealtimeHub = () => Boolean(globalThis.__leaderboardHub);

declare global {
   
  var __leaderboardHub: LeaderboardRealtimeHub | undefined;
}
