import type { Server } from "socket.io";
import type { AuthenticatedSocket } from "../middleware/auth.js";

export function registerClockHandlers(io: Server, socket: AuthenticatedSocket) {
  socket.on("clock_ping", (payload, callback) => {
    const serverReceiveTime = Date.now();
    const clientTime = payload?.clientTime || 0;
    const serverSendTime = Date.now();

    if (typeof callback === "function") {
      callback({
        clientTime,
        serverReceiveTime,
        serverSendTime,
      });
    }
  });
}
