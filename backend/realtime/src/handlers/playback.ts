import type { Server } from "socket.io";
import type { AuthenticatedSocket } from "../middleware/auth.js";
import { roomStateManager } from "../state/room-state.js";
import {
  PlayRequestPayloadSchema,
  PauseRequestPayloadSchema,
  SeekRequestPayloadSchema,
  TrackSelectRequestPayloadSchema,
  type PlayAtPayload,
  type PauseAtPayload,
  type SeekAtPayload,
} from "../types/index.js";

const SCHEDULE_LEAD_TIME_MS = 800; // 800ms — fast lead time for direct audio streams

export function registerPlaybackHandlers(io: Server, socket: AuthenticatedSocket) {
  const { userId, roomId } = socket.data;

  // Helper to check playback permission (Master or Co-host if permitted)
  const canControlPlayback = (room: any): boolean => {
    if (userId === room.masterId) return true;
    if (room.coHostIds.includes(userId) && room.settings.collaborationPolicy.coHostPlaybackEnabled) {
      return true;
    }
    return false;
  };

  // play_request
  socket.on("play_request", (payload, ack) => {
    const room = roomStateManager.getRoom(roomId);
    if (!room) {
      if (typeof ack === "function") ack({ error: "Room not found" });
      return;
    }

    if (!canControlPlayback(room)) {
      if (typeof ack === "function") {
        ack({ error: "Permission denied: Only the Master device can start playback" });
      }
      return;
    }

    if (!room.currentTrack) {
      if (typeof ack === "function") ack({ error: "No track selected to play" });
      return;
    }

    const commandId = payload?.commandId || `cmd_${Date.now()}`;
    const now = Date.now();
    const startAtServerMs = now + SCHEDULE_LEAD_TIME_MS;
    const version = roomStateManager.nextPlaybackVersion(roomId, commandId);

    room.playback.status = "playing";
    room.playback.startAtServerMs = startAtServerMs;
    room.playback.changedAtServerMs = now;

    const playAtPayload: PlayAtPayload = {
      type: "play_at",
      roomId,
      commandId,
      version,
      track: room.currentTrack,
      positionSeconds: room.playback.positionSeconds,
      startAtServerMs,
      changedAtServerMs: now,
    };

    io.to(roomId).emit("play_at", playAtPayload);
    console.log(`[Playback] play_at emitted for ${roomId} (version ${version}, start in ${SCHEDULE_LEAD_TIME_MS}ms)`);

    if (typeof ack === "function") {
      ack({ success: true, version, canonicalState: room.playback });
    }
  });

  // pause_request
  socket.on("pause_request", (payload, ack) => {
    const room = roomStateManager.getRoom(roomId);
    if (!room) return;

    if (!canControlPlayback(room)) {
      if (typeof ack === "function") {
        ack({ error: "Permission denied: Only the Master device can pause" });
      }
      return;
    }

    const commandId = payload?.commandId || `cmd_${Date.now()}`;
    const now = Date.now();

    // Freeze position at server-measured time
    if (room.playback.status === "playing" && room.playback.startAtServerMs) {
      const elapsedSinceStart = Math.max(0, (now - room.playback.startAtServerMs) / 1000);
      room.playback.positionSeconds += elapsedSinceStart;
    }

    if (typeof payload?.positionSeconds === "number") {
      room.playback.positionSeconds = payload.positionSeconds;
    }

    const version = roomStateManager.nextPlaybackVersion(roomId, commandId);
    room.playback.status = "paused";
    room.playback.startAtServerMs = null;
    room.playback.changedAtServerMs = now;

    const pauseAtPayload: PauseAtPayload = {
      type: "pause_at",
      roomId,
      commandId,
      version,
      positionSeconds: room.playback.positionSeconds,
      changedAtServerMs: now,
    };

    io.to(roomId).emit("pause_at", pauseAtPayload);
    console.log(`[Playback] pause_at emitted for ${roomId} at ${room.playback.positionSeconds}s`);

    if (typeof ack === "function") {
      ack({ success: true, version, canonicalState: room.playback });
    }
  });

  // seek_request
  socket.on("seek_request", (payload, ack) => {
    const room = roomStateManager.getRoom(roomId);
    if (!room) return;

    if (!canControlPlayback(room)) {
      if (typeof ack === "function") {
        ack({ error: "Permission denied: Only Master can seek" });
      }
      return;
    }

    const targetSeconds = payload?.targetSeconds ?? 0;
    const commandId = payload?.commandId || `cmd_${Date.now()}`;
    const now = Date.now();
    const version = roomStateManager.nextPlaybackVersion(roomId, commandId);

    let startAtServerMs: number | null = null;
    if (room.playback.status === "playing") {
      startAtServerMs = now + SCHEDULE_LEAD_TIME_MS;
    }

    room.playback.positionSeconds = targetSeconds;
    room.playback.startAtServerMs = startAtServerMs;
    room.playback.changedAtServerMs = now;

    const seekAtPayload: SeekAtPayload = {
      type: "seek_at",
      roomId,
      commandId,
      version,
      positionSeconds: targetSeconds,
      startAtServerMs,
      changedAtServerMs: now,
    };

    io.to(roomId).emit("seek_at", seekAtPayload);
    console.log(`[Playback] seek_at emitted for ${roomId} to ${targetSeconds}s`);

    if (typeof ack === "function") {
      ack({ success: true, version, canonicalState: room.playback });
    }
  });

  // track_select_request
  socket.on("track_select_request", (payload, ack) => {
    const room = roomStateManager.getRoom(roomId);
    if (!room) return;

    if (!canControlPlayback(room)) {
      if (typeof ack === "function") {
        ack({ error: "Permission denied: Only the Master device can pick tracks" });
      }
      return;
    }

    const track = payload?.track;
    if (!track || !track.videoId) {
      if (typeof ack === "function") ack({ error: "Invalid track data" });
      return;
    }

    const commandId = payload?.commandId || `cmd_${Date.now()}`;
    const now = Date.now();
    const version = roomStateManager.nextPlaybackVersion(roomId, commandId);
    const startImmediately = payload?.startImmediately ?? true;

    room.currentTrack = track;
    room.playback.currentTrack = track;
    room.playback.positionSeconds = 0;
    room.playback.changedAtServerMs = now;

    if (startImmediately) {
      const startAtServerMs = now + SCHEDULE_LEAD_TIME_MS;
      room.playback.status = "playing";
      room.playback.startAtServerMs = startAtServerMs;

      io.to(roomId).emit("track_changed", {
        track,
        version,
        commandId,
        changedAtServerMs: now,
      });

      io.to(roomId).emit("play_at", {
        type: "play_at",
        roomId,
        commandId: `${commandId}_play`,
        version: version + 1,
        track,
        positionSeconds: 0,
        startAtServerMs,
        changedAtServerMs: now,
      });
    } else {
      room.playback.status = "cued";
      room.playback.startAtServerMs = null;

      io.to(roomId).emit("track_changed", {
        track,
        version,
        commandId,
        changedAtServerMs: now,
      });
    }

    console.log(`[Playback] track_changed in ${roomId}: "${track.title}" by ${track.artist}`);

    if (typeof ack === "function") {
      ack({ success: true, track, canonicalState: room.playback });
    }
  });
}
