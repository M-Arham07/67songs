import { z } from "zod";
import { NormalizedTrackSchema } from "./music.js";

export const PlaybackStatusSchema = z.enum([
  "idle",
  "cued",
  "playing",
  "paused",
  "ended",
  "error",
]);

export type PlaybackStatus = z.infer<typeof PlaybackStatusSchema>;

export const PlaybackStateSchema = z.object({
  status: PlaybackStatusSchema,
  currentTrack: NormalizedTrackSchema.nullable(),
  positionSeconds: z.number().default(0),
  changedAtServerMs: z.number(),
  startAtServerMs: z.number().nullable(),
  version: z.number().int().nonnegative(),
  lastCommandId: z.string().nullable(),
});

export type PlaybackState = z.infer<typeof PlaybackStateSchema>;

export const PlayAtPayloadSchema = z.object({
  type: z.literal("play_at"),
  roomId: z.string(),
  commandId: z.string(),
  version: z.number(),
  track: NormalizedTrackSchema,
  positionSeconds: z.number(),
  startAtServerMs: z.number(),
  changedAtServerMs: z.number(),
});

export type PlayAtPayload = z.infer<typeof PlayAtPayloadSchema>;

export const PauseAtPayloadSchema = z.object({
  type: z.literal("pause_at"),
  roomId: z.string(),
  commandId: z.string(),
  version: z.number(),
  positionSeconds: z.number(),
  changedAtServerMs: z.number(),
});

export type PauseAtPayload = z.infer<typeof PauseAtPayloadSchema>;

export const SeekAtPayloadSchema = z.object({
  type: z.literal("seek_at"),
  roomId: z.string(),
  commandId: z.string(),
  version: z.number(),
  positionSeconds: z.number(),
  startAtServerMs: z.number().nullable(),
  changedAtServerMs: z.number(),
});

export type SeekAtPayload = z.infer<typeof SeekAtPayloadSchema>;
