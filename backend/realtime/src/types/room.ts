import { z } from "zod";
import { NormalizedTrackSchema, type NormalizedTrack } from "./music";
import { QueueItemSchema, type QueueItem } from "./queue";
import { PlaybackStateSchema, type PlaybackState } from "./playback";
import { ActiveMemberSchema, type ActiveMember } from "./user";
import { ChatMessageSchema, type ChatMessage } from "./chat";
import { SongRequestSchema, type SongRequest } from "./song-request";

export const RoomVisibilitySchema = z.enum(["private", "unlisted", "public", "nearby"]);
export type RoomVisibility = z.infer<typeof RoomVisibilitySchema>;

export const JoinPolicySchema = z.object({
  allowGuests: z.boolean().default(true),
  requiresSignIn: z.boolean().default(false),
  requiresApproval: z.boolean().default(false),
  passwordHash: z.string().optional(),
});
export type JoinPolicy = z.infer<typeof JoinPolicySchema>;

export const CollaborationPolicySchema = z.object({
  allowSongRequests: z.boolean().default(true),
  guestsCanAddDirectly: z.boolean().default(false),
  guestsCanReorder: z.boolean().default(false),
  votingEnabled: z.boolean().default(false),
  chatEnabled: z.boolean().default(true),
  reactionsEnabled: z.boolean().default(true),
  coHostPlaybackEnabled: z.boolean().default(true),
});
export type CollaborationPolicy = z.infer<typeof CollaborationPolicySchema>;

export const CreateRoomInputSchema = z.object({
  title: z.string().min(2).max(50),
  visibility: RoomVisibilitySchema.default("unlisted"),
  joinPolicy: JoinPolicySchema.default({
    allowGuests: true,
    requiresSignIn: false,
    requiresApproval: false,
  }),
  collaborationPolicy: CollaborationPolicySchema.default({
    allowSongRequests: true,
    guestsCanAddDirectly: false,
    guestsCanReorder: false,
    votingEnabled: false,
    chatEnabled: true,
    reactionsEnabled: true,
    coHostPlaybackEnabled: true,
  }),
  capacity: z.number().int().min(2).max(50).default(25),
  password: z.string().min(4).max(20).optional(),
});
export type CreateRoomInput = z.infer<typeof CreateRoomInputSchema>;

export const ActiveRoomSettingsSchema = z.object({
  title: z.string(),
  visibility: RoomVisibilitySchema,
  joinPolicy: JoinPolicySchema,
  collaborationPolicy: CollaborationPolicySchema,
  capacity: z.number(),
});
export type ActiveRoomSettings = z.infer<typeof ActiveRoomSettingsSchema>;

export type ActiveRoomState = {
  roomId: string;
  roomCode: string;
  masterId: string;
  coHostIds: string[];
  members: Record<string, ActiveMember>;
  currentTrack: NormalizedTrack | null;
  queue: QueueItem[];
  playback: PlaybackState;
  settings: ActiveRoomSettings;
  chatBuffer: ChatMessage[];
  pendingRequests: SongRequest[];
  createdAtServerMs: number;
  lastSnapshotAtServerMs: number;
  hostGraceExpiresAt?: number | null;
};
