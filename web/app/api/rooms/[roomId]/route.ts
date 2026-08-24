import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { Room } from "@/lib/db/models/room";
import { auth } from "@/lib/auth/config";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    await connectDB();

    const room = await Room.findById(roomId);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      room: {
        id: room._id.toString(),
        code: room.code,
        title: room.title,
        masterUserId: room.masterUserId.toString(),
        visibility: room.visibility,
        joinPolicy: room.joinPolicy,
        collaborationPolicy: room.collaborationPolicy,
        capacity: room.capacity,
        status: room.status,
        createdAt: room.createdAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch room" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const session = await auth();
    const userId = session?.user?.id;

    await connectDB();
    const room = await Room.findById(roomId);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Only current master can update room settings
    if (userId && room.masterUserId.toString() !== userId) {
      return NextResponse.json(
        { error: "Forbidden: Only the Master device can update room settings" },
        { status: 403 }
      );
    }

    const updates = await req.json();
    if (updates.title) room.title = updates.title;
    if (updates.visibility) room.visibility = updates.visibility;
    if (updates.joinPolicy) room.joinPolicy = { ...room.joinPolicy, ...updates.joinPolicy };
    if (updates.collaborationPolicy)
      room.collaborationPolicy = { ...room.collaborationPolicy, ...updates.collaborationPolicy };
    if (updates.capacity) room.capacity = updates.capacity;

    await room.save();

    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update room" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const session = await auth();
    const userId = session?.user?.id;

    await connectDB();
    const room = await Room.findById(roomId);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (userId && room.masterUserId.toString() !== userId) {
      return NextResponse.json(
        { error: "Forbidden: Only the Master device can end the room" },
        { status: 403 }
      );
    }

    room.status = "ended";
    room.endedAt = new Date();
    await room.save();

    return NextResponse.json({ success: true, message: "Room session ended" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to end room" },
      { status: 500 }
    );
  }
}
