import type { NextApiRequest, NextApiResponse } from "next";
import type { Server as HTTPServer } from "http";
import { installLeaderboardWebSocketServer } from "@/lib/realtime/server";

type ResponseWithSocket = NextApiResponse & {
  socket: NextApiResponse["socket"] & {
    server: HTTPServer & {
      leaderboardWss?: ReturnType<typeof installLeaderboardWebSocketServer>;
    };
  };
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: ResponseWithSocket) {
  const server = res.socket.server as ResponseWithSocket["socket"]["server"];
  installLeaderboardWebSocketServer(server);
  res.end();
}
