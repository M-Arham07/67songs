import { z } from "zod";

export const UserRoleSchema = z.enum(["master", "co-host", "member", "guest"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  image: z.string().url().optional().nullable(),
  isAnonymous: z.boolean().default(false),
  createdAt: z.date().or(z.string()),
});

export type User = z.infer<typeof UserSchema>;

export const GuestSessionSchema = z.object({
  guestId: z.string(),
  displayName: z.string().min(2).max(24),
  roomId: z.string(),
  createdAt: z.number(),
  expiresAt: z.number(),
});

export type GuestSession = z.infer<typeof GuestSessionSchema>;

export const ActiveMemberSchema = z.object({
  id: z.string(),
  socketId: z.string(),
  name: z.string(),
  avatarUrl: z.string().optional().nullable(),
  role: UserRoleSchema,
  isMaster: z.boolean(),
  isCoHost: z.boolean().default(false),
  isMuted: z.boolean().default(false),
  connectedAt: z.number(),
  lastPingAt: z.number(),
  playerStatus: z
    .enum(["idle", "loading", "ready", "syncing", "in_sync", "buffering", "autoplay_blocked", "unavailable"])
    .default("idle"),
  driftMs: z.number().default(0),
});

export type ActiveMember = z.infer<typeof ActiveMemberSchema>;
