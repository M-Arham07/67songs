"use client";

import * as React from "react";
import { SyncEngine } from "@/lib/socket/sync-engine";
import { usePlayerStore } from "@/lib/stores/player-store";
import type { YouTubePlayerRef } from "@/components/player/youtube-player";

export function usePlaybackSync() {
  const playerRef = React.useRef<YouTubePlayerRef | null>(null);
  const syncEngineRef = React.useRef<SyncEngine | null>(null);

  const { setSyncStatus, setDriftMs } = usePlayerStore();

  if (!syncEngineRef.current) {
    syncEngineRef.current = new SyncEngine({
      onSyncStatusChange: (status) => setSyncStatus(status),
      onDriftUpdate: (driftMs) => setDriftMs(driftMs),
    });
  }

  React.useEffect(() => {
    if (syncEngineRef.current) {
      syncEngineRef.current.setPlayerRef(playerRef);
    }
    return () => {
      syncEngineRef.current?.destroy();
    };
  }, []);

  const handlePlayAt = React.useCallback((payload: any) => {
    syncEngineRef.current?.handlePlayAt(payload);
  }, []);

  const handlePauseAt = React.useCallback((payload: any) => {
    syncEngineRef.current?.handlePauseAt(payload.positionSeconds);
  }, []);

  const handleSeekAt = React.useCallback((payload: any) => {
    syncEngineRef.current?.handleSeekAt(payload);
  }, []);

  return {
    playerRef,
    handlePlayAt,
    handlePauseAt,
    handleSeekAt,
  };
}
