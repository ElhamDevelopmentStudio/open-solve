import type { Server as HTTPServer } from "http";
import type { IncomingMessage } from "http";
import type { Socket } from "net";
import { WebSocketServer } from "ws";
import { parse } from "cookie";
import { prisma } from "@/lib/prisma";
import { getSubmissionRealtimeHub } from "@/lib/realtime/submission-hub";

type SubmissionServer = HTTPServer & {
  submissionWss?: WebSocketServer;
};

export const installSubmissionWebSocketServer = (server: SubmissionServer) => {
  if (server.submissionWss) {
    return server.submissionWss;
  }
  const wss = new WebSocketServer({ noServer: true });
  const hub = getSubmissionRealtimeHub();

  server.on("upgrade", async (req: IncomingMessage, socket: Socket, head) => {
    if (!req.url?.startsWith("/api/ws/submissions")) {
      return;
    }
    const sessionUserId = await resolveUserIdFromRequest(req);
    if (!sessionUserId) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      hub.attach(ws, sessionUserId);
    });
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
