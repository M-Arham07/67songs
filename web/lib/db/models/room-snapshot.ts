import mongoose, { Schema, Document, Model } from "mongoose";
import type { ActiveRoomState } from "@/lib/types/room";

export interface IRoomSnapshot extends Document {
  roomId: string;
  roomCode: string;
  state: ActiveRoomState;
  updatedAt: Date;
}

const RoomSnapshotSchema = new Schema<IRoomSnapshot>(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    roomCode: { type: String, required: true },
    state: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export const RoomSnapshot: Model<IRoomSnapshot> =
  mongoose.models.RoomSnapshot || mongoose.model<IRoomSnapshot>("RoomSnapshot", RoomSnapshotSchema);
