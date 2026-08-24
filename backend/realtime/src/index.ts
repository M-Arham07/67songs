import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

const PORT = Number(process.env.PORT) || 4000;
const MAX_SOCKET_REPLICAS = Number(process.env.MAX_SOCKET_REPLICAS) || 1;
const WEB_APP_ORIGIN = process.env.WEB_APP_ORIGIN || "http://localhost:3000";

if (MAX_SOCKET_REPLICAS > 1) {
  console.error("FATAL: 67Songs v1 does not support multiple Socket.IO replicas without a Redis/pub-sub broker.");
  process.exit(1);
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "healthy", service: "67songs-realtime", timestamp: Date.now() }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found" }));
});

const io = new Server(server, {
  cors: {
    origin: WEB_APP_ORIGIN.split(","),
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 20000,
});

io.on("connection", (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.on("disconnect", (reason) => {
    console.log(`[Socket] Client disconnected: ${socket.id} (reason: ${reason})`);
  });
});

server.listen(PORT, () => {
  console.log(`[67Songs Realtime] Socket.IO server running on port ${PORT} (Single-replica mode)`);
});
