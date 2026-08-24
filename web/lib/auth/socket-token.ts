import { SignJWT, jwtVerify } from "jose";

const SOCKET_TOKEN_SECRET = new TextEncoder().encode(
  process.env.SOCKET_TOKEN_SECRET || "default_socket_jwt_token_secret_minimum_32_chars!!"
);

export interface SocketTokenPayload {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  roomId: string;
  role: "master" | "co-host" | "member" | "guest";
  isMaster: boolean;
}

export async function mintSocketToken(
  payload: SocketTokenPayload,
  expiresInSeconds: number = 3600 // 1 hour token
): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .sign(SOCKET_TOKEN_SECRET);
}

export async function verifySocketToken(token: string): Promise<SocketTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SOCKET_TOKEN_SECRET);
    if (!payload.userId || !payload.roomId || !payload.role) {
      return null;
    }
    return payload as unknown as SocketTokenPayload;
  } catch (err) {
    return null;
  }
}
