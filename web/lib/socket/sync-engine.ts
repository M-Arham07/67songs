import { clockSynchronizer } from "./clock-sync";
import type { YouTubePlayerRef } from "@/components/player/youtube-player";
import type { PlayAtPayload, SeekAtPayload, PlaybackState } from "@/lib/types/playback";

export interface SyncEngineOptions {
  onSyncStatusChange?: (status: "idle" | "loading" | "ready" | "syncing" | "in_sync" | "buffering" | "autoplay_blocked" | "unavailable") => void;
  onDriftUpdate?: (driftMs: number) => void;
}

// Strict Maximum Allowed Drift Constraint (100ms)
const MAX_ALLOWED_DRIFT_SECONDS = 0.100; // 100ms
const DRIFT_CHECK_INTERVAL_MS = 250; // Check 4 times per second (250ms)

export class SyncEngine {
  private playerRef: React.RefObject<YouTubePlayerRef | null> | null = null;
  private scheduledTimer: NodeJS.Timeout | null = null;
  private driftCheckInterval: NodeJS.Timeout | null = null;
  private currentPlayback: PlaybackState | null = null;
  private options: SyncEngineOptions;
  private lastCorrectionAtMs: number = 0;

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
      `[SyncEngine] Received play_at for "${payload.track.title}" (scheduled start in ${msUntilStart}ms at ${payload.positionSeconds}s)`
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
      // Late joiner: compute current exact canonical position and start
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

    // High-frequency drift evaluation loop (every 250ms)
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

    const currentActualTime = player.getCurrentTime();
    const serverNow = clockSynchronizer.getEstimatedServerNow();

    if (!this.currentPlayback.startAtServerMs) return;

    const secondsPlaying = Math.max(0, (serverNow - this.currentPlayback.startAtServerMs) / 1000);
    const expectedCanonicalPosition = this.currentPlayback.positionSeconds + secondsPlaying;

    const driftSeconds = currentActualTime - expectedCanonicalPosition;
    const driftMs = Math.round(driftSeconds * 1000);
    const absDrift = Math.abs(driftSeconds);

    this.options.onDriftUpdate?.(driftMs);

    const now = Date.now();
    // Throttle hard seeks to at most once every 1000ms to avoid audio stutter
    const canCorrect = now - this.lastCorrectionAtMs > 1000;

    // Strict 100ms Enforcement Rule:
    if (absDrift <= MAX_ALLOWED_DRIFT_SECONDS) {
      // Within strict 100ms threshold
      this.options.onSyncStatusChange?.("in_sync");
    } else if (absDrift > MAX_ALLOWED_DRIFT_SECONDS && canCorrect) {
      // Exceeds 100ms drift boundary: enforce immediate micro-correction
      this.lastCorrectionAtMs = now;
      console.log(
        `[SyncEngine:Enforce100ms] Drift ${driftMs}ms exceeded threshold (±100ms). Re-aligning to ${expectedCanonicalPosition.toFixed(3)}s`
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
