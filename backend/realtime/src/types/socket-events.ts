import { z } from "zod";
import { NormalizedTrackSchema } from "./music.js";
import { QueueItemSchema } from "./queue.js";
import { PlayAtPayloadSchema, PauseAtPayloadSchema, SeekAtPayloadSchema, PlaybackStateSchema } from "./playback.js";
import { ActiveMemberSchema } from "./user.js";
import { ChatMessageSchema, ReactionSchema } from "./chat.js";
import { ActiveRoomSettingsSchema } from "./room.js";
import { SongRequestSchema, SongRequestActionSchema } from "./song-request.js";

// Base event payload structure
export const BaseCommandSchema = z.object({
  commandId: z.string(),
  version: z.number().int().nonnegative(),
  roomId: z.string(),
});

// Client -> Server Payloads
export const RoomJoinPayloadSchema = z.object({
  roomId: z.string(),
  token: z.string(),
  clientTimestamp: z.number(),
});

export const ClockPingPayloadSchema = z.object({
  clientTime: z.number(),
});

export const PlayRequestPayloadSchema = z.object({
  roomId: z.string(),
  version: z.number(),
  commandId: z.string(),
});

export const PauseRequestPayloadSchema = z.object({
  roomId: z.string(),
  version: z.number(),
  commandId: z.string(),
  positionSeconds: z.number().optional(),
});

export const SeekRequestPayloadSchema = z.object({
  roomId: z.string(),
  version: z.number(),
  commandId: z.string(),
  targetSeconds: z.number().nonnegative(),
});

export const TrackSelectRequestPayloadSchema = z.object({
  roomId: z.string(),
  version: z.number(),
  commandId: z.string(),
  track: NormalizedTrackSchema,
  startImmediately: z.boolean().default(true),
});

export const QueueMutationPayloadSchema = z.object({
  roomId: z.string(),
  version: z.number(),
  commandId: z.string(),
  action: z.enum(["add", "add_next", "move", "remove", "clear"]),
  track: NormalizedTrackSchema.optional(),
  queueItemId: z.string().optional(),
  fromIndex: z.number().optional(),
  toIndex: z.number().optional(),
});

export const ChatSendPayloadSchema = z.object({
  roomId: z.string(),
  content: z.string().min(1).max(500),
});

export const ReactionSendPayloadSchema = z.object({
  roomId: z.string(),
  emoji: z.string(),
});

export const SongRequestSubmitPayloadSchema = z.object({
  roomId: z.string(),
  track: NormalizedTrackSchema,
});

export const MasterTransferRequestPayloadSchema = z.object({
  roomId: z.string(),
  targetUserId: z.string(),
});

export const MemberActionRequestPayloadSchema = z.object({
  roomId: z.string(),
  targetUserId: z.string(),
  action: z.enum(["remove", "mute", "unmute", "promote_cohost", "demote_cohost", "transfer_master"]),
});

export const PlayerStatusPayloadSchema = z.object({
  roomId: z.string(),
  status: z.enum(["idle", "loading", "ready", "syncing", "in_sync", "buffering", "autoplay_blocked", "unavailable"]),
  currentTime: z.number().optional(),
  bufferedSeconds: z.number().optional(),
});

export const SyncTelemetryPayloadSchema = z.object({
  roomId: z.string(),
  driftMs: z.number(),
  roundTripTimeMs: z.number(),
  playerState: z.string(),
});

// Server -> Client Payloads
export const ClockPongPayloadSchema = z.object({
  clientTime: z.number(),
  serverReceiveTime: z.number(),
  serverSendTime: z.number(),
});

export const HostTransferredPayloadSchema = z.object({
  roomId: z.string(),
  previousMasterId: z.string(),
  newMasterId: z.string(),
  transferredAt: z.number(),
});

export const ErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean().default(false),
  canonicalState: z.any().optional(),
});

// All event names
export type ClientToServerEvents = {
  room_join: (payload: z.infer<typeof RoomJoinPayloadSchema>, ack: (response: any) => void) => void;
  room_leave: (payload: { roomId: string }, ack: (response: any) => void) => void;
  clock_ping: (payload: z.infer<typeof ClockPingPayloadSchema>, ack: (response: z.infer<typeof ClockPongPayloadSchema>) => void) => void;
  state_request: (payload: { roomId: string }, ack: (response: any) => void) => void;
  play_request: (payload: z.infer<typeof PlayRequestPayloadSchema>, ack: (response: any) => void) => void;
  pause_request: (payload: z.infer<typeof PauseRequestPayloadSchema>, ack: (response: any) => void) => void;
  seek_request: (payload: z.infer<typeof SeekRequestPayloadSchema>, ack: (response: any) => void) => void;
  track_select_request: (payload: z.infer<typeof TrackSelectRequestPayloadSchema>, ack: (response: any) => void) => void;
  queue_mutation_request: (payload: z.infer<typeof QueueMutationPayloadSchema>, ack: (response: any) => void) => void;
  chat_send: (payload: z.infer<typeof ChatSendPayloadSchema>) => void;
  reaction_send: (payload: z.infer<typeof ReactionSendPayloadSchema>) => void;
  song_request: (payload: z.infer<typeof SongRequestSubmitPayloadSchema>, ack: (response: any) => void) => void;
  song_request_response: (payload: z.infer<typeof SongRequestActionSchema>, ack: (response: any) => void) => void;
  master_transfer_request: (payload: z.infer<typeof MasterTransferRequestPayloadSchema>, ack: (response: any) => void) => void;
  member_action_request: (payload: z.infer<typeof MemberActionRequestPayloadSchema>, ack: (response: any) => void) => void;
  player_status: (payload: z.infer<typeof PlayerStatusPayloadSchema>) => void;
  sync_telemetry: (payload: z.infer<typeof SyncTelemetryPayloadSchema>) => void;
};

export type ServerToClientEvents = {
  room_state: (state: any) => void;
  member_joined: (member: z.infer<typeof ActiveMemberSchema>) => void;
  member_left: (payload: { memberId: string; reason?: string }) => void;
  member_updated: (member: z.infer<typeof ActiveMemberSchema>) => void;
  play_at: (payload: z.infer<typeof PlayAtPayloadSchema>) => void;
  pause_at: (payload: z.infer<typeof PauseAtPayloadSchema>) => void;
  seek_at: (payload: z.infer<typeof SeekAtPayloadSchema>) => void;
  track_changed: (payload: { track: any; version: number; commandId: string; changedAtServerMs: number }) => void;
  queue_updated: (payload: { queue: any[]; version: number }) => void;
  chat_message: (message: z.infer<typeof ChatMessageSchema>) => void;
  reaction: (reaction: z.infer<typeof ReactionSchema>) => void;
  song_request_received: (request: z.infer<typeof SongRequestSchema>) => void;
  song_request_status: (payload: { requestId: string; status: string; trackTitle: string; reason?: string }) => void;
  host_transferred: (payload: z.infer<typeof HostTransferredPayloadSchema>) => void;
  host_grace_started: (payload: { gracePeriodMs: number; expiresAt: number }) => void;
  room_settings_updated: (settings: z.infer<typeof ActiveRoomSettingsSchema>) => void;
  room_ended: (payload: { reason: string }) => void;
  sync_status: (payload: { status: string; message: string }) => void;
  error: (error: z.infer<typeof ErrorResponseSchema>) => void;
};
