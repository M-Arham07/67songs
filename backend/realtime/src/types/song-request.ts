import { z } from "zod";
import { NormalizedTrackSchema } from "./music.js";

export const SongRequestStatusSchema = z.enum([
  "pending",
  "accepted",
  "rejected",
  "expired",
]);

export type SongRequestStatus = z.infer<typeof SongRequestStatusSchema>;

export const SongRequestSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  track: NormalizedTrackSchema,
  requestedBy: z.object({
    id: z.string(),
    name: z.string(),
    avatarUrl: z.string().optional().nullable(),
  }),
  requestedAt: z.number(),
  status: SongRequestStatusSchema.default("pending"),
  respondedAt: z.number().optional().nullable(),
  respondedBy: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .optional()
    .nullable(),
  rejectionReason: z.string().optional().nullable(),
});

export type SongRequest = z.infer<typeof SongRequestSchema>;

export const SongRequestActionSchema = z.object({
  requestId: z.string(),
  action: z.enum(["accept", "reject"]),
  insertPosition: z.enum(["next", "end"]).optional().default("end"),
  rejectionReason: z.string().optional(),
});

export type SongRequestAction = {
  requestId: string;
  action: "accept" | "reject";
  insertPosition?: "next" | "end";
  rejectionReason?: string;
};
