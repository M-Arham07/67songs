import type { Server } from "socket.io";
import type { AuthenticatedSocket } from "../middleware/auth.js";
import { roomStateManager } from "../state/room-state.js";
import type { ActiveMember } from "../types/index.js";

const GRACE_PERIOD_MS = 60 * 1000; // 60 seconds host grace period
const graceTimers: Map<string, NodeJS.Timeout> = new Map();

export function registerRoomHandlers(io: Server, socket: AuthenticatedSocket) {
  const { userId, name, avatarUrl, roomId, role, isMaster } = socket.data;

  // room_join
  socket.on("room_join", async (_payload, ack) => {
    let room = roomStateManager.getRoom(roomId);

    // If room not in memory, initialize it
    if (!room) {
      room = roomStateManager.createRoom(
        roomId,
        socket.data.roomCode || "----",
        socket.data.isMaster ? userId : "pending",
        {
          title: socket.data.title || "Synchronized Jam",
          visibility: "unlisted",
          joinPolicy: {
            allowGuests: true,
            requiresSignIn: false,
            requiresApproval: false,
          },
          collaborationPolicy: {
            allowSongRequests: true,
            guestsCanAddDirectly: false,
            guestsCanReorder: false,
            votingEnabled: false,
            chatEnabled: true,
            reactionsEnabled: true,
            coHostPlaybackEnabled: true,
          },
          capacity: 25,
        }
      );
    }

    // If socket has Master authority, assert masterId
    if (socket.data.isMaster || room.masterId === "pending") {
      room.masterId = userId;
    }

    // Clear any active host grace period if master reconnected
    if (userId === room.masterId && graceTimers.has(roomId)) {
      clearTimeout(graceTimers.get(roomId)!);
      graceTimers.delete(roomId);
      room.hostGraceExpiresAt = null;
      io.to(roomId).emit("sync_status", {
        status: "master_reconnected",
        message: "Master reconnected and resumed room control.",
      });
    }

    const isMemberMaster = userId === room.masterId || socket.data.isMaster;
    const member: ActiveMember = {
      id: userId,
      socketId: socket.id,
      name,
      avatarUrl: avatarUrl || null,
      role: isMemberMaster ? "master" : role,
      isMaster: isMemberMaster,
      isCoHost: room.coHostIds.includes(userId),
      isMuted: false,
      connectedAt: Date.now(),
      lastPingAt: Date.now(),
      playerStatus: "ready",
      driftMs: 0,
    };

    room.members[userId] = member;
    socket.join(roomId);

    console.log(`[Room] ${name} (${userId}) joined room ${roomId} as ${member.role}`);

    // Broadcast member joined to other sockets
    socket.to(roomId).emit("member_joined", member);

    // Send system message to room chat
    const joinMsg = {
      id: `sys_join_${Date.now()}_${userId}`,
      roomId,
      sender: { id: "system", name: "67Songs", role: "master" as const },
      content: `👋 ${name} joined the jam`,
      isSystem: true,
      timestamp: Date.now(),
    };
    room.chatBuffer.push(joinMsg);
    io.to(roomId).emit("chat_message", joinMsg);

    // Return full state in ack
    if (typeof ack === "function") {
      ack({
        success: true,
        state: room,
        currentUserId: userId,
        currentUserRole: member.role,
        isMaster: member.isMaster,
      });
    }
  });

  // state_request
  socket.on("state_request", (_payload, ack) => {
    const room = roomStateManager.getRoom(roomId);
    if (!room) {
      if (typeof ack === "function") ack({ error: "Room not active" });
      return;
    }
    if (typeof ack === "function") {
      ack({ success: true, state: room });
    }
  });

  // room_leave
  socket.on("room_leave", (_payload, ack) => {
    handleMemberLeave(io, socket);
    if (typeof ack === "function") {
      ack({ success: true });
    }
  });

  // Disconnect handler
  socket.on("disconnect", () => {
    handleMemberLeave(io, socket);
  });
}

function handleMemberLeave(io: Server, socket: AuthenticatedSocket) {
  const { userId, roomId, name } = socket.data;
  const room = roomStateManager.getRoom(roomId);
  if (!room) return;

  delete room.members[userId];
  socket.leave(roomId);

  io.to(roomId).emit("member_left", { memberId: userId });
  console.log(`[Room] ${name} (${userId}) left room ${roomId}`);

  // Send system message to room chat
  const leaveMsg = {
    id: `sys_leave_${Date.now()}_${userId}`,
    roomId,
    sender: { id: "system", name: "67Songs", role: "master" as const },
    content: `🚪 ${name} left the jam`,
    isSystem: true,
    timestamp: Date.now(),
  };
  room.chatBuffer.push(leaveMsg);
  io.to(roomId).emit("chat_message", leaveMsg);

  // If the Master disconnected, initiate 60-second grace period
  if (userId === room.masterId) {
    const expiresAt = Date.now() + GRACE_PERIOD_MS;
    room.hostGraceExpiresAt = expiresAt;

    io.to(roomId).emit("host_grace_started", {
      gracePeriodMs: GRACE_PERIOD_MS,
      expiresAt,
    });

    console.log(`[Room] Master disconnected from ${roomId}. Starting 60s grace period.`);

    const timer = setTimeout(() => {
      graceTimers.delete(roomId);
      const currentRoom = roomStateManager.getRoom(roomId);
      if (!currentRoom) return;

      // Master did not return. Auto-transfer to longest-present eligible member
      const remainingMembers = Object.values(currentRoom.members);
      if (remainingMembers.length > 0) {
        // Sort by connectedAt ascending (longest present)
        remainingMembers.sort((a, b) => a.connectedAt - b.connectedAt);
        const newMaster = remainingMembers[0];

        const previousMasterId = currentRoom.masterId;
        currentRoom.masterId = newMaster.id;
        newMaster.role = "master";
        newMaster.isMaster = true;

        io.to(roomId).emit("host_transferred", {
          roomId,
          previousMasterId,
          newMasterId: newMaster.id,
          transferredAt: Date.now(),
        });

        console.log(`[Room] Master auto-transferred in ${roomId} to ${newMaster.name} (${newMaster.id})`);
      } else {
        // No members left, close the room
        io.to(roomId).emit("room_ended", { reason: "Session ended due to inactivity." });
        roomStateManager.removeRoom(roomId);
      }
    }, GRACE_PERIOD_MS);

    graceTimers.set(roomId, timer);
  }
}
