import { z } from "zod";

export const ChatMessageSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  sender: z.object({
    id: z.string(),
    name: z.string(),
    avatarUrl: z.string().optional().nullable(),
    role: z.enum(["master", "co-host", "member", "guest"]),
  }),
  content: z.string().min(1).max(500),
  isSystem: z.boolean().default(false),
  timestamp: z.number(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const CURATED_REACTIONS = ["🔥", "❤️", "👏", "😂", "🎵", "👀", "💀", "🙌"] as const;

export const ReactionSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  senderId: z.string(),
  senderName: z.string(),
  emoji: z.string(),
  timestamp: z.number(),
});

export type Reaction = z.infer<typeof ReactionSchema>;
