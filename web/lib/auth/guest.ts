import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";
import type { GuestSession } from "@/lib/types/user";

const AUTH_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "default_local_auth_secret_must_be_32_chars_long!!"
);

export async function createGuestSession(
  displayName: string,
  roomId: string,
  expiresInSeconds: number = 86400 // 24 hours
): Promise<{ session: GuestSession; token: string }> {
  const guestId = `guest_${nanoid(12)}`;
  const now = Date.now();
  const expiresAt = now + expiresInSeconds * 1000;

  const session: GuestSession = {
    guestId,
    displayName: displayName.trim(),
    roomId,
    createdAt: now,
    expiresAt,
  };

  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .sign(AUTH_SECRET);

  return { session, token };
}

export async function verifyGuestSession(token: string): Promise<GuestSession | null> {
  try {
    const { payload } = await jwtVerify(token, AUTH_SECRET);
    if (!payload.guestId || !payload.displayName || !payload.roomId) {
      return null;
    }
    return payload as unknown as GuestSession;
  } catch (err) {
    return null;
  }
}
