import type { Server } from "socket.io";
import type { AuthenticatedSocket } from "../middleware/auth.js";
import { roomStateManager } from "../state/room-state.js";

export function registerMemberHandlers(
  io: Server,
  socket: AuthenticatedSocket
) {
  const { userId, roomId, name } = socket.data;

  // master_transfer_request
  socket.on("master_transfer_request", (payload, ack) => {
    const room = roomStateManager.getRoom(roomId);
    if (!room) return;

    if (userId !== room.masterId) {
      if (typeof ack === "function") {
        ack({ error: "Permission denied: Only the current Master can transfer control" });
      }
      return;
    }

    const targetUserId = payload?.targetUserId;
    const targetMember = room.members[targetUserId];
    if (!targetMember) {
      if (typeof ack === "function") ack({ error: "Target member not found in room" });
      return;
    }

    const previousMasterId = room.masterId;
    const oldMasterMember = room.members[previousMasterId];
    if (oldMasterMember) {
      oldMasterMember.isMaster = false;
      oldMasterMember.role = "member";
    }

    room.masterId = targetUserId;
    targetMember.isMaster = true;
    targetMember.role = "master";

    io.to(roomId).emit("host_transferred", {
      roomId,
      previousMasterId,
      newMasterId: targetUserId,
      transferredAt: Date.now(),
    });

    io.to(roomId).emit("chat_message", {
      id: `sys_${Date.now()}`,
      roomId,
      sender: { id: "system", name: "67Songs", role: "master" },
      content: `👑 Master control was transferred to ${targetMember.name}`,
      isSystem: true,
      timestamp: Date.now(),
    });

    console.log(`[Member] Master transferred in ${roomId} from ${name} to ${targetMember.name}`);

    if (typeof ack === "function") {
      ack({ success: true, newMasterId: targetUserId });
    }
  });

  // member_action_request (remove, mute, promote co-host)
  socket.on("member_action_request", (payload, ack) => {
    const room = roomStateManager.getRoom(roomId);
    if (!room) return;

    if (userId !== room.masterId) {
      if (typeof ack === "function") ack({ error: "Only the Master can perform moderation actions" });
      return;
    }

    const { targetUserId, action } = payload;
    const target = room.members[targetUserId];
    if (!target) return;

    if (action === "promote_cohost") {
      if (!room.coHostIds.includes(targetUserId)) {
        room.coHostIds.push(targetUserId);
        target.isCoHost = true;
        target.role = "co-host";
        io.to(roomId).emit("member_updated", target);
      }
    } else if (action === "demote_cohost") {
      room.coHostIds = room.coHostIds.filter((id) => id !== targetUserId);
      target.isCoHost = false;
      target.role = "member";
      io.to(roomId).emit("member_updated", target);
    } else if (action === "mute") {
      target.isMuted = true;
      io.to(roomId).emit("member_updated", target);
    } else if (action === "unmute") {
      target.isMuted = false;
      io.to(roomId).emit("member_updated", target);
    } else if (action === "remove") {
      delete room.members[targetUserId];
      const targetSocket = io.sockets.sockets.get(target.socketId);
      if (targetSocket) {
        targetSocket.emit("error", {
          code: "REMOVED_BY_HOST",
          message: "You have been removed from the room by the Master.",
          retryable: false,
        });
        targetSocket.leave(roomId);
      }
      io.to(roomId).emit("member_left", { memberId: targetUserId, reason: "removed_by_host" });
    }

    if (typeof ack === "function") {
      ack({ success: true });
    }
  });

  // player_status
  socket.on("player_status", (payload) => {
    const room = roomStateManager.getRoom(roomId);
    if (!room) return;
    const member = room.members[userId];
    if (member && payload?.status) {
      member.playerStatus = payload.status;
    }
  });

  // sync_telemetry
  socket.on("sync_telemetry", (payload) => {
    const room = roomStateManager.getRoom(roomId);
    if (!room) return;
    const member = room.members[userId];
    if (member && typeof payload?.driftMs === "number") {
      member.driftMs = payload.driftMs;
    }
  });
}
