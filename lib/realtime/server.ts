import type { Server as HTTPServer } from "http";
import type { IncomingMessage } from "http";
import type { Socket } from "net";
import { WebSocketServer } from "ws";
import { parse } from "cookie";
import { prisma } from "@/lib/prisma";
import { getSubmissionRealtimeHub } from "@/lib/realtime/submission-hub";

interface SubmissionServer extends HTTPServer {
  submissionWss?: WebSocketServer;
}

export const installSubmissionWebSocketServer = (server: SubmissionServer) => {
  if (server.submissionWss) {
    return server.submissionWss;
  }
  const wss = new WebSocketServer({ noServer: true });
  const hub = getSubmissionRealtimeHub();

  wss.on("connection", (ws, req) => {
    const userId = (req as IncomingMessage & { userId?: string }).userId;
    if (!userId) {
      ws.close(4401, "unauthorized");
      return;
    }
    hub.attach(ws, userId);
  });

  server.on("upgrade", async (req: IncomingMessage, socket: Socket, head) => {
    if (!req.url?.startsWith("/api/ws/submissions")) {
      return;
    }
    console.info("upgrade received", req.url);
    socket.on("error", (error) => {
      console.error("upgrade socket error", error);
    });
    socket.on("close", () => {
      console.info("upgrade socket closed");
    });
    const sessionUserId = await resolveUserIdFromRequest(req);
    console.info("resolved user", sessionUserId);
    if (!sessionUserId) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    try {
      (req as IncomingMessage & { userId?: string }).userId = sessionUserId;
      wss.handleUpgrade(req, socket, head, (ws) => {
        console.info("ws attached");
        wss.emit("connection", ws, req);
      });
      console.info("handleUpgrade completed");
    } catch (error) {
      console.error("handleUpgrade failed", error);
    }
  });

  server.submissionWss = wss;
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
