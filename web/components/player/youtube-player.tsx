"use client";

import * as React from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  AlertTriangle,
  Loader2,
  Radio,
  Sparkles,
  Music2,
  Disc3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePlayerStore } from "@/lib/stores/player-store";
import { useRoomStore } from "@/lib/stores/room-store";
import { cn } from "@/lib/utils/cn";

// Keep the same ref interface so sync-engine, hooks, and room logic don't change
export interface YouTubePlayerRef {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  loadVideo: (videoId: string, startSeconds?: number) => void;
  cueVideo: (videoId: string, startSeconds?: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  getPlaybackRate: () => number;
}

interface YouTubePlayerProps {
  videoId: string | null;
  className?: string;
  onReady?: () => void;
  onStateChange?: (state: number) => void;
  onError?: (error: any) => void;
  onTrackEnded?: () => void;
}

// Audio frequency visualizer bar count
const VISUALIZER_BAR_COUNT = 48;

export const YouTubePlayer = React.forwardRef<
  YouTubePlayerRef,
  YouTubePlayerProps
>(({ videoId, className, onReady, onStateChange, onError, onTrackEnded }, ref) => {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const sourceNodeRef = React.useRef<MediaElementAudioSourceNode | null>(null);
  const animFrameRef = React.useRef<number>(0);
  const currentVideoIdRef = React.useRef<string | null>(null);
  const isCuedRef = React.useRef(false);

  const [isLoading, setIsLoading] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const [errorDetail, setErrorDetail] = React.useState<string>("");

  const {
    isAutoplayBlocked,
    setIsAutoplayBlocked,
    setIsReady,
    setCurrentTime,
    setDuration,
    setPlayerState,
    volume,
    isMuted,
    playerState,
  } = usePlayerStore();

  const currentTrack = useRoomStore((s) => s.currentTrack);

  // Build the stream URL for a given videoId
  const getStreamUrl = (vid: string) =>
    `/api/music/audio/${encodeURIComponent(vid)}`;

  // Initialize Web Audio API analyser for visualization
  const initAudioContext = React.useCallback(() => {
    if (audioContextRef.current || !audioRef.current) return;

    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.82;

      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceNodeRef.current = source;
    } catch (e) {
      // Web Audio not supported or already connected — fine, visualizer just won't render
      console.warn("[AudioPlayer] Web Audio init:", e);
    }
  }, []);

  // Canvas visualizer draw loop
  const drawVisualizer = React.useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const barWidth = width / VISUALIZER_BAR_COUNT;
      const step = Math.floor(bufferLength / VISUALIZER_BAR_COUNT);

      for (let i = 0; i < VISUALIZER_BAR_COUNT; i++) {
        const value = dataArray[i * step] || 0;
        const barHeight = (value / 255) * height * 0.85;
        const x = i * barWidth;
        const y = height - barHeight;

        // Gradient from green to teal
        const hue = 140 + (i / VISUALIZER_BAR_COUNT) * 40;
        const alpha = 0.4 + (value / 255) * 0.6;
        ctx.fillStyle = `hsla(${hue}, 70%, 50%, ${alpha})`;

        const radius = Math.min(barWidth * 0.35, 3);
        ctx.beginPath();
        ctx.roundRect(x + 1, y, barWidth - 2, barHeight, [radius, radius, 0, 0]);
        ctx.fill();
      }
    };

    draw();
  }, []);

  const stopVisualizer = React.useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
  }, []);

  // Load audio stream for a videoId
  const loadAudio = React.useCallback(
    (vid: string, startSeconds: number = 0, autoPlay: boolean = false) => {
      if (!audioRef.current || !vid) return;

      currentVideoIdRef.current = vid;
      isCuedRef.current = !autoPlay;
      setHasError(false);
      setErrorDetail("");
      setIsLoading(true);

      const audio = audioRef.current;
      audio.src = getStreamUrl(vid);
      audio.currentTime = startSeconds;
      audio.preload = "auto";
      audio.load();

      if (autoPlay) {
        audio
          .play()
          .then(() => {
            initAudioContext();
            drawVisualizer();
          })
          .catch(() => {
            setIsAutoplayBlocked(true);
          });
      }
    },
    [initAudioContext, drawVisualizer, setIsAutoplayBlocked]
  );

  // Apply volume changes
  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : Math.max(0, Math.min(1, volume / 100));
    }
  }, [volume, isMuted]);

  // Forward the ref interface (same contract as the old YouTube player)
  React.useImperativeHandle(
    ref,
    () => ({
      play: () => {
        if (!audioRef.current) return;
        initAudioContext();
        audioRef.current
          .play()
          .then(() => {
            isCuedRef.current = false;
            drawVisualizer();
          })
          .catch(() => {
            setIsAutoplayBlocked(true);
          });
      },
      pause: () => {
        audioRef.current?.pause();
        stopVisualizer();
      },
      seekTo: (seconds: number) => {
        if (audioRef.current) {
          audioRef.current.currentTime = seconds;
        }
      },
      getCurrentTime: () => {
        return audioRef.current?.currentTime || 0;
      },
      getDuration: () => {
        return audioRef.current?.duration || 0;
      },
      getPlayerState: () => {
        const audio = audioRef.current;
        if (!audio) return -1;
        if (audio.ended) return 0; // ended
        if (isCuedRef.current) return 5; // cued
        if (audio.readyState < 3 && !audio.paused) return 3; // buffering
        if (audio.paused) return 2; // paused
        if (!audio.paused && audio.readyState >= 3) return 1; // playing
        return -1; // unstarted
      },
      loadVideo: (vid: string, startSeconds: number = 0) => {
        loadAudio(vid, startSeconds, true);
      },
      cueVideo: (vid: string, startSeconds: number = 0) => {
        loadAudio(vid, startSeconds, false);
      },
      setVolume: (vol: number) => {
        if (audioRef.current) {
          audioRef.current.volume = Math.max(0, Math.min(1, vol / 100));
        }
      },
      setPlaybackRate: (rate: number) => {
        if (audioRef.current) {
          audioRef.current.playbackRate = rate;
        }
      },
      getPlaybackRate: () => {
        return audioRef.current?.playbackRate || 1;
      },
    }),
    [initAudioContext, drawVisualizer, stopVisualizer, loadAudio, setIsAutoplayBlocked]
  );

  // Signal ready once audio element mounts
  React.useEffect(() => {
    if (audioRef.current) {
      setIsReady(true);
      onReady?.();
    }
  }, [setIsReady, onReady]);

  // Handle initial videoId on mount
  React.useEffect(() => {
    if (videoId && videoId !== currentVideoIdRef.current) {
      loadAudio(videoId, 0, false);
    }
  }, [videoId, loadAudio]);

  // Cleanup
  React.useEffect(() => {
    return () => {
      stopVisualizer();
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [stopVisualizer]);

  const handleStartAudioGesture = () => {
    setIsAutoplayBlocked(false);
    if (audioRef.current) {
      initAudioContext();
      audioRef.current
        .play()
        .then(() => drawVisualizer())
        .catch(console.error);
    }
  };

  // Format time as mm:ss
  const formatTime = (s: number) => {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const thumbnailUrl =
    currentTrack?.thumbnails?.[currentTrack.thumbnails.length - 1]?.url ||
    currentTrack?.thumbnailUrl ||
    null;

  return (
    <div
      className={cn(
        "relative w-full rounded-xl overflow-hidden border border-[#1a1a1a] bg-gradient-to-br from-[#0a0a0a] via-[#0d0d0d] to-[#111111] shadow-2xl",
        className
      )}
    >
      {/* Main Player Layout */}
      <div className="flex flex-col sm:flex-row items-center gap-5 p-5 sm:p-6">
        {/* Album Art */}
        <div className="relative shrink-0 group">
          <div
            className={cn(
              "w-36 h-36 sm:w-44 sm:h-44 rounded-lg overflow-hidden border border-[#262626] shadow-xl",
              "bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d]",
              playerState === "playing" && "shadow-[#1db954]/10 shadow-2xl"
            )}
          >
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={currentTrack?.title || "Album art"}
                className={cn(
                  "w-full h-full object-cover transition-transform duration-700",
                  playerState === "playing" && "scale-105"
                )}
                draggable={false}
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <Disc3
                  className={cn(
                    "h-16 w-16 text-[#333333]",
                    playerState === "playing" && "animate-spin text-[#1db954]/40"
                  )}
                  style={{ animationDuration: "3s" }}
                />
              </div>
            )}
          </div>

          {/* Playing indicator glow ring */}
          {playerState === "playing" && (
            <div className="absolute -inset-1 rounded-xl border border-[#1db954]/20 animate-pulse pointer-events-none" />
          )}
        </div>

        {/* Track Info + Visualizer */}
        <div className="flex-1 flex flex-col min-w-0 w-full gap-3">
          {/* Track Metadata */}
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <Badge
                variant="accent"
                className="text-[9px] gap-1 px-1.5 py-0.5 font-medium"
              >
                <Sparkles className="h-2.5 w-2.5" />
                Direct Audio Stream
              </Badge>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#fafafa] truncate leading-tight">
              {currentTrack?.title || "No Track Selected"}
            </h2>
            <p className="text-xs sm:text-sm text-[#a1a1a1] truncate">
              {currentTrack?.artist || "—"}
              {currentTrack?.album && (
                <span className="text-[#666666]"> · {currentTrack.album}</span>
              )}
            </p>
          </div>

          {/* Audio Frequency Visualizer Canvas */}
          <div className="relative w-full h-16 sm:h-20 rounded-lg overflow-hidden bg-[#0a0a0a]/60 border border-[#1a1a1a]">
            <canvas
              ref={canvasRef}
              width={600}
              height={80}
              className="w-full h-full"
            />
            {/* Idle state overlay */}
            {playerState !== "playing" && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]/40">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-[#1db954]/60" />
                ) : (
                  <div className="flex items-center gap-1.5 text-[#444444]">
                    <Music2 className="h-4 w-4" />
                    <span className="text-[10px] font-medium uppercase tracking-wider">
                      {playerState === "paused" ? "Paused" : "Awaiting Playback"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Time Display */}
          <div className="flex items-center justify-between text-[10px] text-[#666666] tabular-nums font-mono px-0.5">
            <span>{formatTime(usePlayerStore.getState().currentTime)}</span>
            <span>{formatTime(usePlayerStore.getState().duration)}</span>
          </div>
        </div>
      </div>

      {/* Hidden <audio> element — the real engine */}
      <audio
        ref={audioRef}
        preload="auto"
        crossOrigin="anonymous"
        onPlay={() => {
          setPlayerState("playing");
          setIsAutoplayBlocked(false);
          setIsLoading(false);
          onStateChange?.(1);
        }}
        onPause={() => {
          setPlayerState("paused");
          stopVisualizer();
          onStateChange?.(2);
        }}
        onEnded={() => {
          setPlayerState("ended");
          stopVisualizer();
          onStateChange?.(0);
          onTrackEnded?.();
        }}
        onWaiting={() => {
          setIsLoading(true);
          setPlayerState("buffering");
          onStateChange?.(3);
        }}
        onCanPlay={() => {
          setIsLoading(false);
          setIsReady(true);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration || 0);
          }
          setIsLoading(false);
        }}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onError={(e) => {
          console.error("[AudioPlayer] Stream error:", e);
          setHasError(true);
          setErrorDetail("Audio stream unavailable. Retrying...");
          setIsLoading(false);
          onError?.(e);
        }}
      />

      {/* Error Overlay */}
      {hasError && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0a0a0a]/95 backdrop-blur-sm p-6 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-[#e5484d]/10 border border-[#e5484d]/30 flex items-center justify-center text-[#e5484d]">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#fafafa]">Stream Error</h3>
            <p className="text-xs text-[#a1a1a1] max-w-xs">{errorDetail}</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (currentVideoIdRef.current) {
                loadAudio(currentVideoIdRef.current, 0, true);
              }
            }}
            className="gap-1.5"
          >
            <Radio className="h-3.5 w-3.5" />
            Retry Stream
          </Button>
        </div>
      )}

      {/* Autoplay Blocked Gesture Overlay */}
      {isAutoplayBlocked && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#0a0a0a]/95 backdrop-blur-md p-6 text-center space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1db954]/20 border border-[#1db954]/40 text-[#1db954]">
            <Volume2 className="h-7 w-7" />
          </div>
          <div className="space-y-1.5 max-w-sm">
            <h3 className="text-sm font-bold text-[#fafafa]">
              Audio Playback Ready
            </h3>
            <p className="text-xs text-[#a1a1a1]">
              Tap below to join the synchronized audio stream.
            </p>
          </div>
          <Button
            variant="primary"
            size="lg"
            data-gesture="start-audio"
            onClick={handleStartAudioGesture}
            className="gap-2 shadow-lg shadow-[#1db954]/20 cursor-pointer"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Start Synced Audio</span>
          </Button>
        </div>
      )}
    </div>
  );
});

YouTubePlayer.displayName = "YouTubePlayer";
