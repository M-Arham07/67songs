import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRoomMember extends Document {
  roomId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId | null;
  guestId?: string | null;
  name: string;
  avatarUrl?: string | null;
  role: "master" | "co-host" | "member" | "guest";
  joinedAt: Date;
  leftAt?: Date | null;
}

const RoomMemberSchema = new Schema<IRoomMember>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    guestId: { type: String, default: null },
    name: { type: String, required: true },
    avatarUrl: { type: String, default: null },
    role: {
      type: String,
      enum: ["master", "co-host", "member", "guest"],
      default: "member",
    },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date, default: null },
  },
  { timestamps: true }
);

RoomMemberSchema.index({ roomId: 1, userId: 1 });
RoomMemberSchema.index({ roomId: 1, guestId: 1 });

export const RoomMember: Model<IRoomMember> =
  mongoose.models.RoomMember || mongoose.model<IRoomMember>("RoomMember", RoomMemberSchema);
