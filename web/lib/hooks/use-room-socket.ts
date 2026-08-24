"use client";

import * as React from "react";
import type { Socket } from "socket.io-client";
import { toast } from "sonner";
import { getSocket, disconnectSocket } from "@/lib/socket/client";
import { clockSynchronizer } from "@/lib/socket/clock-sync";
import { useRoomStore } from "@/lib/stores/room-store";
import { usePlayerStore } from "@/lib/stores/player-store";
import type { NormalizedTrack } from "@/lib/types/music";
import type { SongRequestAction } from "@/lib/types/song-request";

export function useRoomSocket(
  roomId: string,
  token: string | null,
  socketServerUrl: string | null,
  onPlayAt?: (payload: any) => void,
  onPauseAt?: (payload: any) => void,
  onSeekAt?: (payload: any) => void
) {
  const socketRef = React.useRef<Socket | null>(null);

  const {
    setRoomState,
    updatePlayback,
    updateTrack,
    updateQueue,
    addMember,
    removeMember,
    updateMember,
    addChatMessage,
    addReaction,
    addPendingSongRequest,
    updateSongRequestStatus,
    setMasterId,
    setHostGrace,
    setIsConnected,
  } = useRoomStore();

  const { setSyncStatus, setDriftMs } = usePlayerStore();

  React.useEffect(() => {
    if (!roomId || !token || !socketServerUrl) return;

    const socket = getSocket(socketServerUrl, token);
    socketRef.current = socket;

    const joinRoom = async () => {
      setIsConnected(true);
      console.log("[Socket] Connected to realtime server");

      // Run initial clock synchronization & start periodic jitter sync
      setSyncStatus("syncing");
      await clockSynchronizer.syncWithServer(socket);
      clockSynchronizer.startPeriodicSync(socket);
      setSyncStatus("ready");

      // Join room
      socket.emit(
        "room_join",
        {
          roomId,
          token,
          clientTimestamp: Date.now(),
        },
        (res: any) => {
          if (res?.success && res.state) {
            setRoomState({
              roomId,
              roomCode: res.state.roomCode,
              masterId: res.state.masterId,
              currentUserId: res.currentUserId,
              currentUserRole: res.currentUserRole,
              isMasterClaim: Boolean(res.isMaster),
              currentTrack: res.state.currentTrack,
              playback: res.state.playback,
              queue: res.state.queue,
              members: res.state.members,
              settings: res.state.settings,
              chatBuffer: res.state.chatBuffer,
              pendingRequests: res.state.pendingRequests,
            });
          }
        }
      );
    };

    socket.on("connect", joinRoom);
    if (socket.connected) {
      joinRoom();
    }

    socket.on("disconnect", () => {
      clockSynchronizer.stopPeriodicSync();
      setIsConnected(false);
      setSyncStatus("idle");
    });

    socket.on("connect_error", (err) => {
      console.warn("[Socket] Connection error:", err.message);
      setIsConnected(false);
      setSyncStatus("idle");
    });

    // Room & presence events
    socket.on("member_joined", (member: any) => {
      addMember(member);
      toast.success(`👋 ${member.name} joined the jam`, {
        description: "New participant connected",
      });
    });

    socket.on("member_left", ({ memberId }: any) => {
      const existing = useRoomStore.getState().members[memberId];
      const memberName = existing?.name || "A participant";
      removeMember(memberId);
      toast.info(`🚪 ${memberName} left the jam`);
    });

    socket.on("member_updated", (member: any) => {
      updateMember(member);
    });

    // Playback sync events
    socket.on("play_at", (payload: any) => {
      updatePlayback({
        status: "playing",
        currentTrack: payload.track,
        positionSeconds: payload.positionSeconds,
        changedAtServerMs: payload.changedAtServerMs,
        startAtServerMs: payload.startAtServerMs,
        version: payload.version,
        lastCommandId: payload.commandId,
      });
      onPlayAt?.(payload);
    });

    socket.on("pause_at", (payload: any) => {
      updatePlayback({
        status: "paused",
        currentTrack: useRoomStore.getState().currentTrack,
        positionSeconds: payload.positionSeconds,
        changedAtServerMs: payload.changedAtServerMs,
        startAtServerMs: null,
        version: payload.version,
        lastCommandId: payload.commandId,
      });
      onPauseAt?.(payload);
    });

    socket.on("seek_at", (payload: any) => {
      onSeekAt?.(payload);
    });

    socket.on("track_changed", (payload: any) => {
      updateTrack(payload.track);
    });

    socket.on("queue_updated", (payload: any) => {
      updateQueue(payload.queue);
    });

    // Song requests
    socket.on("song_request_received", (request: any) => {
      addPendingSongRequest(request);
      toast.info(`🎵 New song request: "${request.track.title}" from ${request.requestedBy.name}`);
    });

    socket.on("song_request_status", ({ status, trackTitle, reason }: any) => {
      if (status === "accepted") {
        toast.success(`✓ "${trackTitle}" was accepted by the Master!`);
      } else if (status === "rejected") {
        toast.error(`✗ "${trackTitle}" was not added: ${reason || "Master skipped this request"}`);
      }
    });

    // Master transfer & grace period
    socket.on("host_transferred", ({ newMasterId }: any) => {
      setMasterId(newMasterId);
      setHostGrace(false);
      const isMe = useRoomStore.getState().currentUserId === newMasterId;
      useRoomStore.setState({
        isMaster: isMe,
        currentUserRole: isMe ? "master" : "member",
      });
      toast.success(isMe ? "👑 You are now the Master Device!" : "👑 Master playback control was transferred!");
    });

    socket.on("host_grace_started", ({ gracePeriodMs }: any) => {
      setHostGrace(true, Date.now() + gracePeriodMs);
      toast.warning("Master disconnected. Awaiting reconnect...");
    });

    // Chat & Reactions
    socket.on("chat_message", (message: any) => {
      addChatMessage(message);
    });

    socket.on("reaction", (reaction: any) => {
      addReaction(reaction);
    });

    // Errors
    socket.on("error", (err: any) => {
      toast.error(err.message || "An error occurred");
    });

    return () => {
      disconnectSocket();
    };
  }, [roomId, token, socketServerUrl]);

  // Action methods
  const play = React.useCallback(() => {
    socketRef.current?.emit("play_request", {
      roomId,
      commandId: `cmd_${Date.now()}`,
      version: useRoomStore.getState().playback.version,
    });
  }, [roomId]);

  const pause = React.useCallback(() => {
    socketRef.current?.emit("pause_request", {
      roomId,
      commandId: `cmd_${Date.now()}`,
      version: useRoomStore.getState().playback.version,
      positionSeconds: usePlayerStore.getState().currentTime,
    });
  }, [roomId]);

  const seek = React.useCallback(
    (targetSeconds: number) => {
      socketRef.current?.emit("seek_request", {
        roomId,
        commandId: `cmd_${Date.now()}`,
        version: useRoomStore.getState().playback.version,
        targetSeconds,
      });
    },
    [roomId]
  );

  const selectTrack = React.useCallback(
    (track: NormalizedTrack, startImmediately: boolean = true) => {
      socketRef.current?.emit("track_select_request", {
        roomId,
        commandId: `cmd_${Date.now()}`,
        version: useRoomStore.getState().playback.version,
        track,
        startImmediately,
      });
    },
    [roomId]
  );

  const requestSong = React.useCallback(
    (track: NormalizedTrack) => {
      socketRef.current?.emit(
        "song_request",
        { roomId, track },
        (res: any) => {
          if (res?.error) {
            toast.error(res.error);
          } else {
            toast.success(`Request for "${track.title}" sent to the Master!`);
          }
        }
      );
    },
    [roomId]
  );

  const respondSongRequest = React.useCallback(
    (action: SongRequestAction) => {
      socketRef.current?.emit("song_request_response", action, (res: any) => {
        if (res?.error) {
          toast.error(res.error);
        } else {
          updateSongRequestStatus(action.requestId, action.action === "accept" ? "accepted" : "rejected");
        }
      });
    },
    [updateSongRequestStatus]
  );

  const transferMaster = React.useCallback(
    (targetUserId: string) => {
      socketRef.current?.emit(
        "master_transfer_request",
        { roomId, targetUserId },
        (res: any) => {
          if (res?.error) {
            toast.error(res.error);
          }
        }
      );
    },
    [roomId]
  );

  const mutateQueue = React.useCallback(
    (payload: {
      action: "add" | "add_next" | "move" | "remove" | "clear";
      track?: NormalizedTrack;
      queueItemId?: string;
      fromIndex?: number;
      toIndex?: number;
    }) => {
      socketRef.current?.emit("queue_mutation_request", {
        roomId,
        commandId: `cmd_${Date.now()}`,
        version: useRoomStore.getState().playback.version,
        ...payload,
      });
    },
    [roomId]
  );

  const sendChat = React.useCallback(
    (content: string) => {
      if (!content.trim()) return;
      socketRef.current?.emit("chat_send", {
        roomId,
        content: content.trim(),
      });
    },
    [roomId]
  );

  const sendReaction = React.useCallback(
    (emoji: string) => {
      socketRef.current?.emit("reaction_send", {
        roomId,
        emoji,
      });
    },
    [roomId]
  );

  return {
    play,
    pause,
    seek,
    selectTrack,
    requestSong,
    respondSongRequest,
    transferMaster,
    mutateQueue,
    sendChat,
    sendReaction,
  };
}
