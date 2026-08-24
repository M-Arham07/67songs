"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, Radio } from "lucide-react";
import { toast } from "sonner";
import { ActiveRoom } from "@/components/room/active-room";
import { usePlaybackSync } from "@/lib/hooks/use-playback-sync";
import { useRoomSocket } from "@/lib/hooks/use-room-socket";
import { useRoomStore } from "@/lib/stores/room-store";
import { Button } from "@/components/ui/button";

function RoomPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomId = params?.roomId as string;
  const inviteToken = searchParams?.get("token") || null;

  const [token, setToken] = React.useState<string | null>(null);
  const [socketServerUrl, setSocketServerUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Playback sync engine
  const { playerRef, handlePlayAt, handlePauseAt, handleSeekAt } = usePlaybackSync();

  // Socket connection and action dispatchers
  const {
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
  } = useRoomSocket(
    roomId,
    token,
    socketServerUrl,
    handlePlayAt,
    handlePauseAt,
    handleSeekAt
  );

  // Fetch token and authenticate socket
  React.useEffect(() => {
    if (!roomId) return;

    const authenticate = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const guestName =
          sessionStorage.getItem(`guest_name_${roomId}`) || undefined;
        const masterToken =
          localStorage.getItem(`master_token_${roomId}`) || undefined;

        const res = await fetch(`/api/rooms/${roomId}/socket-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName: guestName, masterToken }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to enter room");
        }

        if (json.room && json.user) {
          useRoomStore.setState({
            roomId,
            roomCode: json.room.code,
            title: json.room.title,
            masterId: json.room.masterUserId,
            currentUserId: json.user.id,
            currentUserRole: json.user.role,
            isMaster: Boolean(json.user.isMaster),
          });
        }

        setToken(json.token);
        setSocketServerUrl(json.socketServerUrl || "http://localhost:4000");
      } catch (err: any) {
        console.error("[RoomPage] Auth error:", err);
        setError(err.message || "Failed to load room session");
      } finally {
        setIsLoading(false);
      }
    };

    authenticate();
  }, [roomId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-xs text-[#a1a1a1] space-y-3">
        <Loader2 className="h-6 w-6 animate-spin text-[#1db954]" />
        <span>Joining synchronized room...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center p-6 space-y-4">
        <div className="h-12 w-12 rounded-full bg-[#e5484d]/10 border border-[#e5484d]/30 flex items-center justify-center text-[#e5484d]">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-[#fafafa]">
            Unable to Enter Jam
          </h2>
          <p className="text-xs text-[#a1a1a1] max-w-sm">{error}</p>
        </div>
        <Button variant="primary" onClick={() => router.push("/")}>
          Return Home
        </Button>
      </div>
    );
  }

  return (
    <ActiveRoom
      playerRef={playerRef}
      onPlay={play}
      onPause={pause}
      onSeek={seek}
      onSelectTrack={selectTrack}
      onRequestSong={requestSong}
      onRespondSongRequest={respondSongRequest}
      onTransferMaster={transferMaster}
      onMutateQueue={mutateQueue}
      onSendChat={sendChat}
      onSendReaction={sendReaction}
    />
  );
}

export default function RoomPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen text-xs text-[#666666]">
          Loading Jam...
        </div>
      }
    >
      <RoomPageContent />
    </React.Suspense>
  );
}
