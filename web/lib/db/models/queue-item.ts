import mongoose, { Schema, Document, Model } from "mongoose";
import type { NormalizedTrack } from "@/lib/types/music";

export interface IQueueItem extends Document {
  roomId: mongoose.Types.ObjectId;
  track: NormalizedTrack;
  addedBy: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
  order: number;
  isPlayed: boolean;
  playedAt?: Date | null;
}

const QueueItemSchema = new Schema<IQueueItem>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    track: { type: Schema.Types.Mixed, required: true },
    addedBy: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      avatarUrl: { type: String, default: null },
    },
    order: { type: Number, required: true },
    isPlayed: { type: Boolean, default: false },
    playedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

QueueItemSchema.index({ roomId: 1, order: 1 });

export const QueueItemModel: Model<IQueueItem> =
  mongoose.models.QueueItem || mongoose.model<IQueueItem>("QueueItem", QueueItemSchema);
