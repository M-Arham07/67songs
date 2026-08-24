import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { socketAuthMiddleware, type AuthenticatedSocket } from "./middleware/auth.js";
import { registerClockHandlers } from "./sync/clock.js";
import { registerRoomHandlers } from "./handlers/room.js";
import { registerPlaybackHandlers } from "./handlers/playback.js";
import { registerSongRequestHandlers } from "./handlers/song-request.js";
import { registerQueueHandlers } from "./handlers/queue.js";
import { registerMemberHandlers } from "./handlers/member.js";
import { registerChatHandlers } from "./handlers/chat.js";

dotenv.config();

const PORT = Number(process.env.PORT) || 4000;
const MAX_SOCKET_REPLICAS = Number(process.env.MAX_SOCKET_REPLICAS) || 1;
const WEB_APP_ORIGIN = process.env.WEB_APP_ORIGIN || "http://localhost:3000";

if (MAX_SOCKET_REPLICAS > 1) {
  console.error(
    "FATAL: 67Songs v1 does not support multiple Socket.IO replicas without a Redis/pub-sub broker."
  );
  process.exit(1);
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "healthy",
        service: "67songs-realtime",
        replicas: 1,
        timestamp: Date.now(),
      })
    );
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found" }));
});

const io = new Server(server, {
  cors: {
    origin: "*", // Allow web client origins
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 20000,
});

// Authentication middleware
io.use(socketAuthMiddleware as any);

io.on("connection", (rawSocket) => {
  const socket = rawSocket as AuthenticatedSocket;
  const { name, userId, roomId, role, isMaster } = socket.data;
  console.log(`[Socket] Connected: ${name} (${userId}) in room ${roomId} [${role}]`);

  // Register all modular handlers
  registerClockHandlers(io, socket);
  registerRoomHandlers(io, socket);
  registerPlaybackHandlers(io, socket);
  registerSongRequestHandlers(io, socket);
  registerQueueHandlers(io, socket);
  registerMemberHandlers(io, socket);
  registerChatHandlers(io, socket);
});

server.listen(PORT, () => {
  console.log(
    `[67Songs Realtime] Authoritative Socket.IO server running on port ${PORT} (Single-replica)`
  );
});
