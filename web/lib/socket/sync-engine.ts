import { clockSynchronizer } from "./clock-sync";
import type { YouTubePlayerRef } from "@/components/player/youtube-player";
import type { PlayAtPayload, SeekAtPayload, PlaybackState } from "@/lib/types/playback";

export interface SyncEngineOptions {
  onSyncStatusChange?: (status: "idle" | "loading" | "ready" | "syncing" | "in_sync" | "buffering" | "autoplay_blocked" | "unavailable") => void;
  onDriftUpdate?: (driftMs: number) => void;
}

export class SyncEngine {
  private playerRef: React.RefObject<YouTubePlayerRef | null> | null = null;
  private scheduledTimer: NodeJS.Timeout | null = null;
  private driftCheckInterval: NodeJS.Timeout | null = null;
  private currentPlayback: PlaybackState | null = null;
  private options: SyncEngineOptions;

  constructor(options: SyncEngineOptions = {}) {
    this.options = options;
  }

  public setPlayerRef(ref: React.RefObject<YouTubePlayerRef | null>) {
    this.playerRef = ref;
  }

  public handlePlayAt(payload: PlayAtPayload) {
    if (this.scheduledTimer) {
      clearTimeout(this.scheduledTimer);
      this.scheduledTimer = null;
    }

    const player = this.playerRef?.current;
    if (!player) return;

    const serverNow = clockSynchronizer.getEstimatedServerNow();
    const msUntilStart = payload.startAtServerMs - serverNow;

    this.currentPlayback = {
      status: "playing",
      currentTrack: payload.track,
      positionSeconds: payload.positionSeconds,
      changedAtServerMs: payload.changedAtServerMs,
      startAtServerMs: payload.startAtServerMs,
      version: payload.version,
      lastCommandId: payload.commandId,
    };

    console.log(
      `[SyncEngine] Received play_at for "${payload.track.title}" (start in ${msUntilStart}ms at pos ${payload.positionSeconds}s)`
    );

    if (msUntilStart > 0) {
      // Cue track and seek to start position in advance
      player.cueVideo(payload.track.videoId, payload.positionSeconds);
      this.options.onSyncStatusChange?.("syncing");

      this.scheduledTimer = setTimeout(() => {
        player.play();
        this.options.onSyncStatusChange?.("in_sync");
        this.startDriftMonitoring();
      }, msUntilStart);
    } else {
      // We joined late or delayed: compute current expected position and play immediately
      const lateSeconds = Math.abs(msUntilStart) / 1000;
      const expectedPosition = payload.positionSeconds + lateSeconds;

      player.loadVideo(payload.track.videoId, expectedPosition);
      player.play();
      this.options.onSyncStatusChange?.("in_sync");
      this.startDriftMonitoring();
    }
  }

  public handlePauseAt(positionSeconds: number) {
    if (this.scheduledTimer) {
      clearTimeout(this.scheduledTimer);
      this.scheduledTimer = null;
    }
    this.stopDriftMonitoring();

    const player = this.playerRef?.current;
    if (player) {
      player.pause();
      player.seekTo(positionSeconds);
    }
    this.options.onSyncStatusChange?.("ready");
  }

  public handleSeekAt(payload: SeekAtPayload) {
    const player = this.playerRef?.current;
    if (!player) return;

    if (payload.startAtServerMs) {
      const serverNow = clockSynchronizer.getEstimatedServerNow();
      const msUntilStart = payload.startAtServerMs - serverNow;

      if (msUntilStart > 0) {
        player.seekTo(payload.positionSeconds);
        if (this.scheduledTimer) clearTimeout(this.scheduledTimer);
        this.scheduledTimer = setTimeout(() => {
          player.play();
          this.options.onSyncStatusChange?.("in_sync");
        }, msUntilStart);
        return;
      }
    }

    player.seekTo(payload.positionSeconds);
  }

  public startDriftMonitoring() {
    this.stopDriftMonitoring();

    this.driftCheckInterval = setInterval(() => {
      this.checkDrift();
    }, 4000);
  }

  public stopDriftMonitoring() {
    if (this.driftCheckInterval) {
      clearInterval(this.driftCheckInterval);
      this.driftCheckInterval = null;
    }
  }

  public checkDrift() {
    const player = this.playerRef?.current;
    if (!player || !this.currentPlayback || this.currentPlayback.status !== "playing") {
      return;
    }

    const currentActualTime = player.getCurrentTime();
    const serverNow = clockSynchronizer.getEstimatedServerNow();

    if (!this.currentPlayback.startAtServerMs) return;

    const secondsPlaying = Math.max(0, (serverNow - this.currentPlayback.startAtServerMs) / 1000);
    const expectedCanonicalPosition = this.currentPlayback.positionSeconds + secondsPlaying;

    const driftSeconds = currentActualTime - expectedCanonicalPosition;
    const driftMs = driftSeconds * 1000;

    this.options.onDriftUpdate?.(driftMs);

    const absDrift = Math.abs(driftSeconds);

    // Sync drift correction policy
    if (absDrift < 0.5) {
      // Healthy sync
      this.options.onSyncStatusChange?.("in_sync");
    } else if (absDrift >= 0.5 && absDrift <= 1.5) {
      // Minor drift - report status
      this.options.onSyncStatusChange?.("in_sync");
    } else if (absDrift > 1.5) {
      // Major drift: hard seek to catch up with room
      console.warn(`[SyncEngine] Correcting hard drift of ${driftSeconds.toFixed(2)}s to ${expectedCanonicalPosition.toFixed(2)}s`);
      player.seekTo(expectedCanonicalPosition);
      this.options.onSyncStatusChange?.("syncing");
    }
  }

  public destroy() {
    if (this.scheduledTimer) clearTimeout(this.scheduledTimer);
    this.stopDriftMonitoring();
  }
}
