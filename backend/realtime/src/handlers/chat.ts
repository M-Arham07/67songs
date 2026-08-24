import type { Server } from "socket.io";
import type { AuthenticatedSocket } from "../middleware/auth.js";
import { roomStateManager } from "../state/room-state.js";
import { CURATED_REACTIONS, type ChatMessage, type Reaction } from "../types/index.js";

export function registerChatHandlers(
  io: Server,
  socket: AuthenticatedSocket
) {
  const { userId, name, avatarUrl, roomId, role } = socket.data;

  // chat_send
  socket.on("chat_send", (payload) => {
    const room = roomStateManager.getRoom(roomId);
    if (!room) return;

    if (!room.settings.collaborationPolicy.chatEnabled) return;

    const member = room.members[userId];
    if (member?.isMuted) return;

    const content = payload?.content?.trim();
    if (!content || content.length > 500) return;

    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      roomId,
      sender: {
        id: userId,
        name,
        avatarUrl: avatarUrl || null,
        role,
      },
      content,
      isSystem: false,
      timestamp: Date.now(),
    };

    room.chatBuffer.push(message);
    if (room.chatBuffer.length > 100) {
      room.chatBuffer.shift();
    }

    io.to(roomId).emit("chat_message", message);
  });

  // reaction_send
  socket.on("reaction_send", (payload) => {
    const room = roomStateManager.getRoom(roomId);
    if (!room) return;

    if (!room.settings.collaborationPolicy.reactionsEnabled) return;

    const emoji = payload?.emoji;
    if (!emoji || !CURATED_REACTIONS.includes(emoji as any)) return;

    const reaction: Reaction = {
      id: `rx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      roomId,
      senderId: userId,
      senderName: name,
      emoji,
      timestamp: Date.now(),
    };

    io.to(roomId).emit("reaction", reaction);
  });
}
