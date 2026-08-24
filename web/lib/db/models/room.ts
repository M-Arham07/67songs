import mongoose, { Schema, Document, Model } from "mongoose";
import type { NormalizedTrack } from "@/lib/types/music";
import type { JoinPolicy, CollaborationPolicy, RoomVisibility } from "@/lib/types/room";

export interface IRoom extends Document {
  code: string;
  title: string;
  masterUserId: mongoose.Types.ObjectId;
  visibility: RoomVisibility;
  joinPolicy: JoinPolicy;
  collaborationPolicy: CollaborationPolicy;
  capacity: number;
  status: "active" | "ended" | "expired";
  currentTrack?: NormalizedTrack | null;
  createdAt: Date;
  activatedAt?: Date;
  endedAt?: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    masterUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    visibility: {
      type: String,
      enum: ["private", "unlisted", "public", "nearby"],
      default: "unlisted",
      index: true,
    },
    joinPolicy: {
      allowGuests: { type: Boolean, default: true },
      requiresSignIn: { type: Boolean, default: false },
      requiresApproval: { type: Boolean, default: false },
      passwordHash: { type: String, select: false },
    },
    collaborationPolicy: {
      allowSongRequests: { type: Boolean, default: true },
      guestsCanAddDirectly: { type: Boolean, default: false },
      guestsCanReorder: { type: Boolean, default: false },
      votingEnabled: { type: Boolean, default: false },
      chatEnabled: { type: Boolean, default: true },
      reactionsEnabled: { type: Boolean, default: true },
      coHostPlaybackEnabled: { type: Boolean, default: true },
    },
    capacity: { type: Number, default: 25, min: 2, max: 50 },
    status: {
      type: String,
      enum: ["active", "ended", "expired"],
      default: "active",
      index: true,
    },
    currentTrack: { type: Schema.Types.Mixed, default: null },
    activatedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Room: Model<IRoom> =
  mongoose.models.Room || mongoose.model<IRoom>("Room", RoomSchema);
