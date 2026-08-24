import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { Room } from "@/lib/db/models/room";
import { normalizeRoomCode } from "@/lib/utils/room-code";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code: rawCode } = await params;
    const code = normalizeRoomCode(rawCode);

    if (!code || code.length !== 4) {
      return NextResponse.json(
        { error: "Invalid 4-character room code" },
        { status: 400 }
      );
    }

    await connectDB();
    const room = await Room.findOne({ code, status: "active" }).select(
      "_id code title visibility joinPolicy capacity"
    );

    if (!room) {
      return NextResponse.json(
        { error: "Room not found or session has ended", code: "ROOM_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      roomId: room._id.toString(),
      code: room.code,
      title: room.title,
      visibility: room.visibility,
      joinPolicy: room.joinPolicy,
      capacity: room.capacity,
    });
  } catch (error: any) {
    console.error("[API] Error resolving room code:", error);
    return NextResponse.json(
      { error: error.message || "Failed to resolve room code" },
      { status: 500 }
    );
  }
}
