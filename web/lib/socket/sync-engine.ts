import { clockSynchronizer } from "./clock-sync";
import type { YouTubePlayerRef } from "@/components/player/youtube-player";
import type { PlayAtPayload, SeekAtPayload, PlaybackState } from "@/lib/types/playback";

export interface SyncEngineOptions {
  onSyncStatusChange?: (
    status:
      | "idle"
      | "loading"
      | "ready"
      | "syncing"
      | "in_sync"
      | "buffering"
      | "autoplay_blocked"
      | "unavailable"
  ) => void;
  onDriftUpdate?: (driftMs: number) => void;
}

// Tolerance boundaries
const IN_SYNC_THRESHOLD_SECONDS = 0.35; // 350ms (natural IFrame timer resolution)
const HARD_SEEK_DRIFT_SECONDS = 1.5; // Only seek if drift exceeds 1.5s
const DRIFT_CHECK_INTERVAL_MS = 1000; // Check once per second
const SEEK_COOLDOWN_MS = 5000; // Do not seek more than once per 5 seconds

export class SyncEngine {
  private playerRef: React.RefObject<YouTubePlayerRef | null> | null = null;
  private scheduledTimer: NodeJS.Timeout | null = null;
  private driftCheckInterval: NodeJS.Timeout | null = null;
  private currentPlayback: PlaybackState | null = null;
  private options: SyncEngineOptions;
  private lastCorrectionAtMs: number = 0;
  private playbackStartedAtMs: number = 0;

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
      `[SyncEngine] Received play_at for "${payload.track.title}" (start in ${msUntilStart}ms at ${payload.positionSeconds}s)`
    );

    if (msUntilStart > 0) {
      // Cue track and seek in advance
      player.cueVideo(payload.track.videoId, payload.positionSeconds);
      this.options.onSyncStatusChange?.("syncing");

      this.scheduledTimer = setTimeout(() => {
        player.play();
        this.playbackStartedAtMs = Date.now();
        this.options.onSyncStatusChange?.("in_sync");
        this.startDriftMonitoring();
      }, msUntilStart);
    } else {
      // Late joiner: compute canonical position and play
      const lateSeconds = Math.abs(msUntilStart) / 1000;
      const expectedPosition = payload.positionSeconds + lateSeconds;

      player.loadVideo(payload.track.videoId, expectedPosition);
      player.play();
      this.playbackStartedAtMs = Date.now();
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

    this.lastCorrectionAtMs = Date.now();

    if (payload.startAtServerMs) {
      const serverNow = clockSynchronizer.getEstimatedServerNow();
      const msUntilStart = payload.startAtServerMs - serverNow;

      if (msUntilStart > 0) {
        player.seekTo(payload.positionSeconds);
        if (this.scheduledTimer) clearTimeout(this.scheduledTimer);
        this.scheduledTimer = setTimeout(() => {
          player.play();
          this.playbackStartedAtMs = Date.now();
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
    }, DRIFT_CHECK_INTERVAL_MS);
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

    // Only evaluate drift if player is actively PLAYING (state 1). If buffering (state 3), wait.
    const playerState = player.getPlayerState();
    if (playerState !== 1) {
      return;
    }

    const now = Date.now();
    // Allow a 3-second buffer warm-up grace period after start/seek
    if (now - this.playbackStartedAtMs < 3000) {
      return;
    }

    const currentActualTime = player.getCurrentTime();
    const serverNow = clockSynchronizer.getEstimatedServerNow();

    if (!this.currentPlayback.startAtServerMs) return;

    const secondsPlaying = Math.max(0, (serverNow - this.currentPlayback.startAtServerMs) / 1000);
    const expectedCanonicalPosition = this.currentPlayback.positionSeconds + secondsPlaying;

    const driftSeconds = currentActualTime - expectedCanonicalPosition;
    const driftMs = Math.round(driftSeconds * 1000);
    const absDrift = Math.abs(driftSeconds);

    this.options.onDriftUpdate?.(driftMs);

    // Throttle hard seeks to at most once per 5 seconds
    const canCorrect = now - this.lastCorrectionAtMs > SEEK_COOLDOWN_MS;

    if (absDrift <= IN_SYNC_THRESHOLD_SECONDS) {
      this.options.onSyncStatusChange?.("in_sync");
    } else if (absDrift > HARD_SEEK_DRIFT_SECONDS && canCorrect) {
      this.lastCorrectionAtMs = now;
      console.log(
        `[SyncEngine] Drift ${driftMs}ms exceeded threshold (>1.5s). Re-aligning to ${expectedCanonicalPosition.toFixed(2)}s`
      );
      player.seekTo(expectedCanonicalPosition);
      this.options.onSyncStatusChange?.("syncing");
    }
  }

  public destroy() {
    if (this.scheduledTimer) clearTimeout(this.scheduledTimer);
    this.stopDriftMonitoring();
  }
}
