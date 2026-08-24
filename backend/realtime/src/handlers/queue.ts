import type { Server } from "socket.io";
import type { AuthenticatedSocket } from "../middleware/auth.js";
import { roomStateManager } from "../state/room-state.js";
import type { QueueItem } from "../types/index.js";

export function registerQueueHandlers(
  io: Server,
  socket: AuthenticatedSocket
) {
  const { userId, roomId, name, avatarUrl } = socket.data;

  // queue_mutation_request
  socket.on("queue_mutation_request", (payload, ack) => {
    const room = roomStateManager.getRoom(roomId);
    if (!room) return;

    const isMaster = userId === room.masterId;
    const isCoHost = room.coHostIds.includes(userId);
    const guestsCanAdd = room.settings.collaborationPolicy.guestsCanAddDirectly;

    const action = payload?.action;

    // Check permission
    if (action !== "add" && !isMaster && !isCoHost) {
      if (typeof ack === "function") {
        ack({ error: "Permission denied: Only the Master can modify queue ordering" });
      }
      return;
    }

    if (action === "add" && !isMaster && !isCoHost && !guestsCanAdd) {
      if (typeof ack === "function") {
        ack({ error: "Direct queue additions are disabled. Please use 'Request Song' instead." });
      }
      return;
    }

    const commandId = payload?.commandId || `cmd_${Date.now()}`;
    const version = roomStateManager.nextPlaybackVersion(roomId, commandId);

    if (action === "add" && payload.track) {
      const newItem: QueueItem = {
        id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        track: payload.track,
        addedBy: {
          id: userId,
          name,
          avatarUrl: avatarUrl || null,
        },
        addedAt: Date.now(),
        order: room.queue.length,
        isRequested: false,
      };
      room.queue.push(newItem);
    } else if (action === "add_next" && payload.track) {
      const newItem: QueueItem = {
        id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        track: payload.track,
        addedBy: {
          id: userId,
          name,
          avatarUrl: avatarUrl || null,
        },
        addedAt: Date.now(),
        order: 0,
        isRequested: false,
      };
      room.queue.unshift(newItem);
    } else if (action === "remove" && payload.queueItemId) {
      room.queue = room.queue.filter((q) => q.id !== payload.queueItemId);
    } else if (
      action === "move" &&
      typeof payload.fromIndex === "number" &&
      typeof payload.toIndex === "number"
    ) {
      const [moved] = room.queue.splice(payload.fromIndex, 1);
      if (moved) {
        room.queue.splice(payload.toIndex, 0, moved);
      }
    } else if (action === "clear") {
      room.queue = [];
    }

    // Re-index order field
    room.queue.forEach((item, index) => {
      item.order = index;
    });

    io.to(roomId).emit("queue_updated", {
      queue: room.queue,
      version,
    });

    console.log(`[Queue] Queue mutated in ${roomId} (action: ${action}, length: ${room.queue.length})`);

    if (typeof ack === "function") {
      ack({ success: true, queue: room.queue, version });
    }
  });
}
