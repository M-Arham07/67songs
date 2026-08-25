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

// Precision Sync Boundaries (tuned for native HTML5 <audio> with sub-ms timing)
const PERFECT_SYNC_THRESHOLD_SECONDS = 0.025; // ±25ms (imperceptible audio lockstep)
const MICRO_PITCH_MAX_DRIFT_SECONDS = 0.8; // Use continuous rate micro-adjustments up to 800ms
const HARD_SEEK_DRIFT_SECONDS = 0.8; // Hard seek only if drift exceeds 800ms
const DRIFT_CHECK_INTERVAL_MS = 250; // Evaluate 4 times per second (250ms)
const HARD_SEEK_COOLDOWN_MS = 3000; // 3s cooldown between hard seeks

export class SyncEngine {
  private playerRef: React.RefObject<YouTubePlayerRef | null> | null = null;
  private scheduledTimer: NodeJS.Timeout | null = null;
  private driftCheckInterval: NodeJS.Timeout | null = null;
  private currentPlayback: PlaybackState | null = null;
  private options: SyncEngineOptions;
  private lastHardSeekAtMs: number = 0;
  private playbackStartedAtMs: number = 0;
  private currentRate: number = 1.0;

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

    this.resetPlaybackRate();

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
      `[SyncEngine] Received play_at for "${payload.track.title}" (scheduled start in ${msUntilStart}ms at ${payload.positionSeconds}s)`
    );

    if (msUntilStart > 0) {
      // Cue track and seek in advance to pre-buffer
      player.cueVideo(payload.track.videoId, payload.positionSeconds);
      this.options.onSyncStatusChange?.("syncing");

      this.scheduledTimer = setTimeout(() => {
        player.play();
        this.playbackStartedAtMs = Date.now();
        this.options.onSyncStatusChange?.("in_sync");
        this.startDriftMonitoring();
      }, msUntilStart);
    } else {
      // Late joiner: compute canonical position and play immediately
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
    this.resetPlaybackRate();

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

    this.resetPlaybackRate();
    this.lastHardSeekAtMs = Date.now();

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

    // Only monitor drift when player is actively in PLAYING state (code 1)
    const playerState = player.getPlayerState();
    if (playerState !== 1) {
      return;
    }

    const now = Date.now();
    // Warm-up grace period after start/seek
    if (now - this.playbackStartedAtMs < 1500) {
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

    // 1. Perfect Sync Zone (±35ms)
    if (absDrift <= PERFECT_SYNC_THRESHOLD_SECONDS) {
      this.options.onSyncStatusChange?.("in_sync");
      if (this.currentRate !== 1.0) {
        this.setRate(1.0);
      }
      return;
    }

    // 2. Micro-Pitch Dynamic Correction Zone (35ms < absDrift <= 1.2s)
    // Smoothly warp speed without audio interruption or buffering
    if (absDrift <= MICRO_PITCH_MAX_DRIFT_SECONDS) {
      this.options.onSyncStatusChange?.("syncing");
      if (driftSeconds > 0) {
        // Player is slightly ahead -> temporarily slow down
        const targetRate = absDrift > 0.4 ? 0.95 : 0.98;
        this.setRate(targetRate);
      } else {
        // Player is slightly behind -> temporarily speed up
        const targetRate = absDrift > 0.4 ? 1.05 : 1.02;
        this.setRate(targetRate);
      }
      return;
    }

    // 3. Macro Drift Zone (> 1.2s): Enforce hard seek with cooldown
    const canHardSeek = now - this.lastHardSeekAtMs > HARD_SEEK_COOLDOWN_MS;
    if (absDrift > HARD_SEEK_DRIFT_SECONDS && canHardSeek) {
      this.lastHardSeekAtMs = now;
      this.resetPlaybackRate();
      console.log(
        `[SyncEngine:HardSeek] Large drift ${driftMs}ms (>1.2s). Re-aligning to ${expectedCanonicalPosition.toFixed(2)}s`
      );
      player.seekTo(expectedCanonicalPosition);
      this.options.onSyncStatusChange?.("syncing");
    }
  }

  private setRate(rate: number) {
    if (this.currentRate === rate) return;
    this.currentRate = rate;
    try {
      this.playerRef?.current?.setPlaybackRate(rate);
    } catch {}
  }

  private resetPlaybackRate() {
    this.currentRate = 1.0;
    try {
      this.playerRef?.current?.setPlaybackRate(1.0);
    } catch {}
  }

  public destroy() {
    if (this.scheduledTimer) clearTimeout(this.scheduledTimer);
    this.stopDriftMonitoring();
    this.resetPlaybackRate();
  }
}
