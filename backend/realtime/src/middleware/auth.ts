import jwt from "jsonwebtoken";
import type { Socket } from "socket.io";

export interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    name: string;
    avatarUrl?: string | null;
    roomId: string;
    roomCode?: string;
    title?: string;
    role: "master" | "co-host" | "member" | "guest";
    isMaster: boolean;
  };
}

export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
) {
  const token =
    socket.handshake.auth?.token ||
    (socket.handshake.query?.token as string);

  if (!token) {
    return next(new Error("Authentication token required"));
  }

  const secret =
    process.env.SOCKET_TOKEN_SECRET ||
    "local_socket_jwt_token_secret_minimum_32_chars!";

  try {
    const decoded = jwt.verify(token, secret) as any;
    if (!decoded || !decoded.userId || !decoded.roomId) {
      return next(new Error("Invalid token payload"));
    }

    socket.data = {
      userId: decoded.userId,
      name: decoded.name || "Anonymous",
      avatarUrl: decoded.avatarUrl || null,
      roomId: decoded.roomId,
      roomCode: decoded.roomCode || undefined,
      title: decoded.title || undefined,
      role: decoded.role || "guest",
      isMaster: Boolean(decoded.isMaster),
    };

    next();
  } catch (err: any) {
    console.warn(`[SocketAuth] Verification failed: ${err.message}`);
    next(new Error("Token expired or invalid"));
  }
}
