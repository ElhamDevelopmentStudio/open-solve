import type { NextApiRequest, NextApiResponse } from "next";
import type { Server as HTTPServer } from "http";
import { installSubmissionWebSocketServer } from "@/lib/realtime/server";

type ResWithServer = NextApiResponse & {
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

export default function submissionSocketHandler(_req: NextApiRequest, res: ResWithServer) {
  const server = res.socket.server as ResWithServer["socket"]["server"];
  installSubmissionWebSocketServer(server);
  res.end();
}
