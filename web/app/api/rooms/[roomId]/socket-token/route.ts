import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { connectDB } from "@/lib/db/connection";
import { Room } from "@/lib/db/models/room";
import { auth } from "@/lib/auth/config";
import { mintSocketToken } from "@/lib/auth/socket-token";
import { verifyGuestSession } from "@/lib/auth/guest";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const body = await req.json().catch(() => ({}));
    const guestToken = body?.guestToken;

    await connectDB();
    const room = await Room.findById(roomId);
    if (!room || room.status !== "active") {
      return NextResponse.json(
        { error: "Room not found or no longer active" },
        { status: 404 }
      );
    }

    const session = await auth();
    let userId: string;
    let name: string;
    let avatarUrl: string | null = null;
    let role: "master" | "co-host" | "member" | "guest" = "guest";
    let isMaster = false;

    const masterToken = body?.masterToken;
    const isMasterAuth =
      (session?.user?.id && room.masterUserId.toString() === session.user.id) ||
      (masterToken && room.masterToken && masterToken === room.masterToken);

    if (isMasterAuth) {
      userId = room.masterUserId.toString();
      name = session?.user?.name || "Host (Master)";
      avatarUrl = session?.user?.image || null;
      role = "master";
      isMaster = true;
    } else if (session?.user?.id) {
      userId = session.user.id;
      name = session.user.name || "Member";
      avatarUrl = session.user.image || null;
      role = "member";
      isMaster = false;
    } else if (guestToken) {
      const guestSession = await verifyGuestSession(guestToken);
      if (!guestSession || guestSession.roomId !== roomId) {
        return NextResponse.json(
          { error: "Invalid or expired guest session" },
          { status: 401 }
        );
      }

      userId = guestSession.guestId;
      name = guestSession.displayName;
      role = "guest";
    } else {
      // Fallback guest creation if room allows guests
      if (!room.joinPolicy.allowGuests) {
        return NextResponse.json(
          { error: "This room requires sign-in" },
          { status: 403 }
        );
      }

      const displayName = body?.displayName || `Guest_${nanoid(4)}`;
      userId = `guest_${nanoid(10)}`;
      name = displayName.trim();
      role = "guest";
    }

    // Mint Socket.IO JWT
    const socketToken = await mintSocketToken({
      userId,
      name,
      avatarUrl,
      roomId,
      roomCode: room.code,
      title: room.title,
      role,
      isMaster,
    });

    const socketServerUrl = process.env.SOCKET_SERVER_URL || "http://localhost:4000";

    return NextResponse.json({
      success: true,
      token: socketToken,
      socketServerUrl,
      room: {
        id: room._id.toString(),
        code: room.code,
        title: room.title,
        masterUserId: room.masterUserId.toString(),
      },
      user: {
        id: userId,
        name,
        avatarUrl,
        role,
        isMaster,
      },
    });
  } catch (error: any) {
    console.error("[API] Error minting socket token:", error);
    return NextResponse.json(
      { error: error.message || "Failed to mint socket token" },
      { status: 500 }
    );
  }
}
