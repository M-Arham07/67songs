import type { Server } from "socket.io";
import type { AuthenticatedSocket } from "../middleware/auth.js";
import { roomStateManager } from "../state/room-state.js";
import type { SongRequest, QueueItem } from "../types/index.js";

const MAX_PENDING_REQUESTS_PER_USER = 3;

export function registerSongRequestHandlers(
  io: Server,
  socket: AuthenticatedSocket
) {
  const { userId, name, avatarUrl, roomId } = socket.data;

  // song_request (from member to master)
  socket.on("song_request", (payload, ack) => {
    const room = roomStateManager.getRoom(roomId);
    if (!room) {
      if (typeof ack === "function") ack({ error: "Room not found" });
      return;
    }

    if (!room.settings.collaborationPolicy.allowSongRequests) {
      if (typeof ack === "function") {
        ack({ error: "Song requests are currently disabled in this room." });
      }
      return;
    }

    const track = payload?.track;
    if (!track || !track.videoId) {
      if (typeof ack === "function") ack({ error: "Invalid track data" });
      return;
    }

    // Check rate limit for this user
    const userPendingCount = room.pendingRequests.filter(
      (r) => r.requestedBy.id === userId && r.status === "pending"
    ).length;

    if (userPendingCount >= MAX_PENDING_REQUESTS_PER_USER) {
      if (typeof ack === "function") {
        ack({
          error: `You already have ${MAX_PENDING_REQUESTS_PER_USER} pending requests. Please wait for the master to review them.`,
        });
      }
      return;
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const songRequest: SongRequest = {
      id: requestId,
      roomId,
      track,
      requestedBy: {
        id: userId,
        name,
        avatarUrl: avatarUrl || null,
      },
      requestedAt: Date.now(),
      status: "pending",
    };

    room.pendingRequests.unshift(songRequest);

    console.log(`[SongRequest] ${name} requested "${track.title}" in room ${roomId}`);

    // Emit to master specifically
    const masterMember = room.members[room.masterId];
    if (masterMember?.socketId) {
      io.to(masterMember.socketId).emit("song_request_received", songRequest);
    }

    // Send system message to chat
    io.to(roomId).emit("chat_message", {
      id: `sys_${Date.now()}`,
      roomId,
      sender: { id: "system", name: "67Songs", role: "master" },
      content: `🎵 ${name} requested "${track.title}"`,
      isSystem: true,
      timestamp: Date.now(),
    });

    if (typeof ack === "function") {
      ack({ success: true, request: songRequest });
    }
  });

  // song_request_response (from master)
  socket.on("song_request_response", (payload, ack) => {
    const room = roomStateManager.getRoom(roomId);
    if (!room) return;

    // Verify master role
    if (userId !== room.masterId) {
      if (typeof ack === "function") {
        ack({ error: "Only the Master device can approve or reject song requests." });
      }
      return;
    }

    const { requestId, action, insertPosition = "end", rejectionReason } = payload;
    const requestIndex = room.pendingRequests.findIndex((r) => r.id === requestId);
    if (requestIndex === -1) {
      if (typeof ack === "function") ack({ error: "Request not found" });
      return;
    }

    const request = room.pendingRequests[requestIndex];
    request.status = action === "accept" ? "accepted" : "rejected";
    request.respondedAt = Date.now();
    request.respondedBy = { id: userId, name };
    request.rejectionReason = rejectionReason;

    // If accepted, insert into queue
    if (action === "accept") {
      const queueItem: QueueItem = {
        id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        track: request.track,
        addedBy: request.requestedBy,
        addedAt: Date.now(),
        order: room.queue.length,
        isRequested: true,
        requestedBy: request.requestedBy,
      };

      if (insertPosition === "next") {
        room.queue.unshift(queueItem);
      } else {
        room.queue.push(queueItem);
      }

      // Re-index queue ordering
      room.queue.forEach((item, idx) => {
        item.order = idx;
      });

      // Broadcast updated queue
      io.to(roomId).emit("queue_updated", {
        queue: room.queue,
        version: room.playback.version,
      });

      // If no track is currently playing, master might start it immediately
      if (!room.currentTrack) {
        room.currentTrack = queueItem.track;
        room.playback.currentTrack = queueItem.track;
      }
    }

    // Notify the requester socket
    const requesterMember = room.members[request.requestedBy.id];
    if (requesterMember?.socketId) {
      io.to(requesterMember.socketId).emit("song_request_status", {
        requestId: request.id,
        status: request.status,
        trackTitle: request.track.title,
        reason: rejectionReason,
      });
    }

    // Remove from pending list
    room.pendingRequests.splice(requestIndex, 1);

    console.log(
      `[SongRequest] Master ${action}ed request for "${request.track.title}" from ${request.requestedBy.name}`
    );

    if (typeof ack === "function") {
      ack({ success: true, status: request.status });
    }
  });
}
