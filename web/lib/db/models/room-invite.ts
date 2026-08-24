import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRoomInvite extends Document {
  roomId: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  isRevoked: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const RoomInviteSchema = new Schema<IRoomInvite>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: "0s" } }, // TTL index
    isRevoked: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const RoomInvite: Model<IRoomInvite> =
  mongoose.models.RoomInvite || mongoose.model<IRoomInvite>("RoomInvite", RoomInviteSchema);
