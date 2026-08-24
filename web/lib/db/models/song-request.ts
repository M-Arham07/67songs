import mongoose, { Schema, Document, Model } from "mongoose";
import type { NormalizedTrack } from "@/lib/types/music";
import type { SongRequestStatus } from "@/lib/types/song-request";

export interface ISongRequestModel extends Document {
  roomId: mongoose.Types.ObjectId;
  track: NormalizedTrack;
  requestedBy: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
  status: SongRequestStatus;
  respondedBy?: {
    id: string;
    name: string;
  } | null;
  rejectionReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const SongRequestSchema = new Schema<ISongRequestModel>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    track: { type: Schema.Types.Mixed, required: true },
    requestedBy: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      avatarUrl: { type: String, default: null },
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "expired"],
      default: "pending",
      index: true,
    },
    respondedBy: {
      id: { type: String },
      name: { type: String },
    },
    rejectionReason: { type: String, default: null },
  },
  { timestamps: true }
);

SongRequestSchema.index({ roomId: 1, status: 1 });

export const SongRequestModel: Model<ISongRequestModel> =
  mongoose.models.SongRequest || mongoose.model<ISongRequestModel>("SongRequest", SongRequestSchema);
