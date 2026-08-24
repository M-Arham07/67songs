import { z } from "zod";
import { NormalizedTrackSchema } from "./music";

export const QueueItemSchema = z.object({
  id: z.string(),
  track: NormalizedTrackSchema,
  addedBy: z.object({
    id: z.string(),
    name: z.string(),
    avatarUrl: z.string().optional().nullable(),
  }),
  addedAt: z.number(),
  order: z.number(),
  isRequested: z.boolean().default(false),
  requestedBy: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .optional(),
});

export type QueueItem = z.infer<typeof QueueItemSchema>;
