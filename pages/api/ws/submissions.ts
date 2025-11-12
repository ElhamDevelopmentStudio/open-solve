import type { NextApiRequest, NextApiResponse } from "next";
import type { Server as HTTPServer } from "http";
import { installSubmissionWebSocketServer } from "@/lib/realtime/server";

type ResponseWithSocket = NextApiResponse & {
  socket: NextApiResponse["socket"] & {
    server: HTTPServer & {
      submissionWss?: ReturnType<typeof installSubmissionWebSocketServer>;
    };
  };
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: ResponseWithSocket) {
  console.info("api handler invoked", req.headers.upgrade);
  const server = res.socket.server as ResponseWithSocket["socket"]["server"];
  installSubmissionWebSocketServer(server);
  res.end();
}
