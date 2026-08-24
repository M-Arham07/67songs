import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBlock extends Document {
  blockerUserId: mongoose.Types.ObjectId;
  blockedUserId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const BlockSchema = new Schema<IBlock>(
  {
    blockerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    blockedUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

BlockSchema.index({ blockerUserId: 1, blockedUserId: 1 }, { unique: true });

export const Block: Model<IBlock> =
  mongoose.models.Block || mongoose.model<IBlock>("Block", BlockSchema);
