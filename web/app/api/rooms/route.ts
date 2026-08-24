import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { connectDB } from "@/lib/db/connection";
import { Room } from "@/lib/db/models/room";
import { RoomInvite } from "@/lib/db/models/room-invite";
import { User } from "@/lib/db/models/user";
import { auth } from "@/lib/auth/config";
import { generateRoomCode } from "@/lib/utils/room-code";
import { CreateRoomInputSchema } from "@/lib/types/room";

export async function POST(req: Request) {
  try {
    const session = await auth();
    let userId = session?.user?.id;

    await connectDB();

    // If no authenticated user, create/use an anonymous host account
    if (!userId) {
      const hostName = `Host_${nanoid(4)}`;
      const hostUser = await User.create({
        name: hostName,
        image: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(hostName)}`,
      });
      userId = hostUser._id.toString();
    }

    const body = await req.json();
    const parsed = CreateRoomInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid room configuration", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Pre-flight check: Verify Realtime WebSocket server is reachable and healthy
    const socketServerUrl = process.env.SOCKET_SERVER_URL || "http://localhost:4000";
    try {
      const healthRes = await fetch(`${socketServerUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(2500),
      });

      if (!healthRes.ok) {
        return NextResponse.json(
          {
            error: "Realtime synchronization service is unhealthy. Room creation aborted.",
            code: "REALTIME_SERVICE_UNHEALTHY",
          },
          { status: 503 }
        );
      }
    } catch (healthErr: any) {
      console.warn("[Room Creation] Realtime health check failed:", healthErr.message);
      return NextResponse.json(
        {
          error: "Realtime WebSocket service is currently offline or unreachable. Room creation aborted.",
          code: "REALTIME_SERVICE_OFFLINE",
        },
        { status: 503 }
      );
    }

    // Generate unique 4-character code
    let code = generateRoomCode(4);
    let codeExists = await Room.findOne({ code, status: "active" });
    let attempts = 0;
    while (codeExists && attempts < 10) {
      code = generateRoomCode(4);
      codeExists = await Room.findOne({ code, status: "active" });
      attempts++;
    }

    // Generate unique master token for room creator authentication
    const masterToken = nanoid(32);

    // Create room in MongoDB
    const room = await Room.create({
      code,
      title: data.title,
      masterUserId: userId,
      masterToken,
      visibility: data.visibility,
      joinPolicy: data.joinPolicy,
      collaborationPolicy: data.collaborationPolicy,
      capacity: data.capacity,
      status: "active",
    });

    // Generate high-entropy invite token for link/QR joins
    const rawInviteToken = nanoid(32);
    const tokenHash = crypto.createHash("sha256").update(rawInviteToken).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await RoomInvite.create({
      roomId: room._id,
      tokenHash,
      expiresAt,
      createdBy: userId,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl}/room/${room._id}?token=${rawInviteToken}`;

    return NextResponse.json({
      success: true,
      roomId: room._id.toString(),
      code: room.code,
      title: room.title,
      masterUserId: userId,
      masterToken,
      inviteToken: rawInviteToken,
      inviteUrl,
    });
  } catch (error: any) {
    console.error("[API] Error creating room:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create room" },
      { status: 500 }
    );
  }
}
