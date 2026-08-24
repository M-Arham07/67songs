import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReport extends Document {
  reportedBy: mongoose.Types.ObjectId;
  targetType: "user" | "room" | "chat" | "song";
  targetId: string;
  roomId?: mongoose.Types.ObjectId;
  reason: string;
  details?: string;
  status: "pending" | "reviewed" | "dismissed";
  createdAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reportedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetType: {
      type: String,
      enum: ["user", "room", "chat", "song"],
      required: true,
    },
    targetId: { type: String, required: true },
    roomId: { type: Schema.Types.ObjectId, ref: "Room" },
    reason: { type: String, required: true },
    details: { type: String },
    status: {
      type: String,
      enum: ["pending", "reviewed", "dismissed"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

export const Report: Model<IReport> =
  mongoose.models.Report || mongoose.model<IReport>("Report", ReportSchema);
