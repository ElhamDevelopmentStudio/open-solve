import type { Server as HTTPServer } from "http";
import type { IncomingMessage } from "http";
import type { Socket } from "net";
import { WebSocketServer } from "ws";
import { parse } from "cookie";
import { prisma } from "@/lib/prisma";
import { getSubmissionRealtimeHub } from "@/lib/realtime/submission-hub";
import { getLeaderboardRealtimeHub } from "@/lib/realtime/leaderboard-hub";
import { logger } from "@/lib/logger";

interface RealtimeServer extends HTTPServer {
  submissionWss?: WebSocketServer;
  leaderboardWss?: WebSocketServer;
}

export const installSubmissionWebSocketServer = (server: RealtimeServer) => {
  if (server.submissionWss) {
    return server.submissionWss;
  }
  const wss = new WebSocketServer({ noServer: true });
  const hub = getSubmissionRealtimeHub();

  wss.on("connection", (ws, req) => {
    const userId = (req as IncomingMessage & { userId?: string }).userId;
    if (!userId) {
      logger.warn({ path: req.url }, "submission ws missing user on connection");
      ws.close(4401, "unauthorized");
      return;
    }
    logger.debug({ userId }, "submission ws connected");
    hub.attach(ws, userId);
  });

  server.prependListener("upgrade", (req: IncomingMessage, socket: Socket, head) => {
    if (!req.url?.startsWith("/api/ws/submissions")) {
      return;
    }
    logger.debug({ url: req.url }, "submission ws upgrade received");
    socket.on("error", (error) => {
      logger.error({ error }, "submission ws socket error");
    });
    socket.on("close", () => {
      logger.debug({ url: req.url }, "submission ws socket closed");
    });

    wss.handleUpgrade(req, socket, head, (ws) => {
      void (async () => {
        try {
          const sessionUserId = await resolveUserIdFromRequest(req);
          if (!sessionUserId) {
            logger.debug({ url: req.url }, "submission ws unauthorized");
            ws.close(4401, "unauthorized");
            return;
          }
          (req as IncomingMessage & { userId?: string }).userId = sessionUserId;
          logger.debug({ userId: sessionUserId }, "submission ws handleUpgrade complete");
          wss.emit("connection", ws, req);
        } catch (error) {
          logger.error({ error }, "submission ws handleUpgrade failed");
          ws.close(1011, "internal_error");
        }
      })();
    });
  });

  server.submissionWss = wss;
  return wss;
};

export const installLeaderboardWebSocketServer = (server: RealtimeServer) => {
  if (server.leaderboardWss) {
    return server.leaderboardWss;
  }
  const wss = new WebSocketServer({ noServer: true });
  const hub = getLeaderboardRealtimeHub();

  wss.on("connection", (ws, req) => {
    logger.debug({ path: req.url }, "leaderboard ws connected");
    hub.attach(ws);
  });

  server.prependListener("upgrade", (req: IncomingMessage, socket: Socket, head) => {
    if (!req.url?.startsWith("/api/ws/leaderboard")) {
      return;
    }
    logger.debug({ url: req.url }, "leaderboard ws upgrade received");
    socket.on("error", (error) => {
      logger.error({ error }, "leaderboard ws socket error");
    });
    socket.on("close", () => {
      logger.debug({ url: req.url }, "leaderboard ws socket closed");
    });

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  server.leaderboardWss = wss;
  return wss;
};

const resolveUserIdFromRequest = async (req: IncomingMessage) => {
  const cookies = req.headers.cookie ? parse(req.headers.cookie) : {};
  const sessionToken = cookies["session_token"];
  if (!sessionToken) return null;
  const session = await prisma.session.findUnique({
    where: { sessionToken },
    select: { id: true, userId: true, expires: true },
  });
  if (!session || session.expires < new Date()) {
    return null;
  }
  await prisma.session
    .update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});
  return session.userId;
};
