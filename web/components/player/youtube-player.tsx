"use client";

import * as React from "react";
import { Play, Volume2, AlertTriangle, Loader2, Radio, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePlayerStore } from "@/lib/stores/player-store";
import { cn } from "@/lib/utils/cn";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

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
}

interface YouTubePlayerProps {
  videoId: string | null;
  className?: string;
  onReady?: () => void;
  onStateChange?: (state: number) => void;
  onError?: (error: any) => void;
  onTrackEnded?: () => void;
}

export const YouTubePlayer = React.forwardRef<
  YouTubePlayerRef,
  YouTubePlayerProps
>(({ videoId, className, onReady, onStateChange, onError, onTrackEnded }, ref) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const playerRef = React.useRef<any>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const [isApiLoaded, setIsApiLoaded] = React.useState(false);
  const [isAudioFallback, setIsAudioFallback] = React.useState(false);
  const [audioFallbackUrl, setAudioFallbackUrl] = React.useState<string | null>(null);
  const [isExtractingAudio, setIsExtractingAudio] = React.useState(false);
  const [fallbackError, setFallbackError] = React.useState<string | null>(null);

  const {
    isAutoplayBlocked,
    setIsAutoplayBlocked,
    setIsReady,
    setCurrentTime,
    setDuration,
    setPlayerState,
    volume,
    isMuted,
  } = usePlayerStore();

  // Load YouTube IFrame API script
  React.useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsApiLoaded(true);
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevReady) prevReady();
      setIsApiLoaded(true);
    };
  }, []);

  // Function to switch to Audio-Only fallback stream
  const switchToAudioFallback = React.useCallback((vid: string) => {
    if (!vid) return;
    setIsExtractingAudio(true);
    setFallbackError(null);

    const streamUrl = `/api/music/audio/${encodeURIComponent(vid)}`;
    setAudioFallbackUrl(streamUrl);
    setIsAudioFallback(true);
    setIsReady(true);
    setIsExtractingAudio(false);
    onReady?.();
  }, [onReady, setIsReady]);

  // Initialize YT.Player instance once API is loaded
  React.useEffect(() => {
    if (!isApiLoaded || !containerRef.current || isAudioFallback) return;

    const playerId = `yt-player-frame-${Math.random().toString(36).substring(2, 8)}`;
    const el = document.createElement("div");
    el.id = playerId;
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(el);

    try {
      const player = new window.YT.Player(playerId, {
        height: "100%",
        width: "100%",
        videoId: videoId || "",
        playerVars: {
          autoplay: 0,
          controls: 1,
          disablekb: 0,
          enablejsapi: 1,
          fs: 1,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: (event: any) => {
            playerRef.current = event.target;
            playerRef.current.setVolume(isMuted ? 0 : volume);
            setIsReady(true);
            onReady?.();
          },
          onStateChange: (event: any) => {
            const stateCode = event.data;
            // -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
            if (stateCode === 1) {
              setPlayerState("playing");
              setIsAutoplayBlocked(false);
            } else if (stateCode === 2) {
              setPlayerState("paused");
            } else if (stateCode === 3) {
              setPlayerState("buffering");
            } else if (stateCode === 0) {
              setPlayerState("ended");
              onTrackEnded?.();
            } else if (stateCode === 5) {
              setPlayerState("cued");
            }
            onStateChange?.(stateCode);
          },
          onError: (event: any) => {
            console.warn("[YouTubePlayer] Player error code:", event.data);
            // Only switch to audio fallback on embed restricted errors (101 / 150)
            if ((event.data === 101 || event.data === 150) && videoId) {
              switchToAudioFallback(videoId);
            }
            onError?.(event);
          },
        },
      });
    } catch (e) {
      console.warn("[YouTubePlayer] Player initialization note:", e);
    }
  }, [isApiLoaded, videoId, isAudioFallback, onReady, onStateChange, onError, onTrackEnded, switchToAudioFallback, setIsReady, setPlayerState, setIsAutoplayBlocked, volume, isMuted]);

  // When videoId changes, reset fallback state if YouTube player is ready
  React.useEffect(() => {
    setIsAudioFallback(false);
    setAudioFallbackUrl(null);
    setFallbackError(null);
  }, [videoId]);

  // Mobile Autoplay Block Detection
  React.useEffect(() => {
    if (!videoId) return;

    const timer = setTimeout(() => {
      if (isAudioFallback && audioRef.current) {
        if (audioRef.current.paused) {
          setIsAutoplayBlocked(true);
        }
        return;
      }

      if (playerRef.current && typeof playerRef.current.getPlayerState === "function") {
        try {
          const state = playerRef.current.getPlayerState();
          if (state === -1 || state === 2 || state === 5) {
            setIsAutoplayBlocked(true);
          }
        } catch {
          setIsAutoplayBlocked(true);
        }
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [videoId, isAudioFallback, setIsAutoplayBlocked]);

  // Forward ref methods supporting BOTH YouTube IFrame and HTML5 Audio fallback
  React.useImperativeHandle(
    ref,
    () => ({
      play: () => {
        if (isAudioFallback && audioRef.current) {
          audioRef.current.play().catch(() => setIsAutoplayBlocked(true));
          return;
        }

        if (!playerRef.current) return;
        try {
          playerRef.current.playVideo();
        } catch (e) {
          setIsAutoplayBlocked(true);
        }
      },
      pause: () => {
        if (isAudioFallback && audioRef.current) {
          audioRef.current.pause();
          return;
        }

        if (!playerRef.current) return;
        try {
          playerRef.current.pauseVideo();
        } catch (e) {
          console.error("[YouTubePlayer] Pause error:", e);
        }
      },
      seekTo: (seconds: number, allowSeekAhead: boolean = true) => {
        if (isAudioFallback && audioRef.current) {
          audioRef.current.currentTime = seconds;
          return;
        }

        if (!playerRef.current) return;
        try {
          playerRef.current.seekTo(seconds, allowSeekAhead);
        } catch (e) {
          console.error("[YouTubePlayer] Seek error:", e);
        }
      },
      getCurrentTime: () => {
        if (isAudioFallback && audioRef.current) {
          return audioRef.current.currentTime || 0;
        }

        if (!playerRef.current || typeof playerRef.current.getCurrentTime !== "function") {
          return 0;
        }
        try {
          return playerRef.current.getCurrentTime() || 0;
        } catch {
          return 0;
        }
      },
      getDuration: () => {
        if (isAudioFallback && audioRef.current) {
          return audioRef.current.duration || 0;
        }

        if (!playerRef.current || typeof playerRef.current.getDuration !== "function") {
          return 0;
        }
        try {
          return playerRef.current.getDuration() || 0;
        } catch {
          return 0;
        }
      },
      getPlayerState: () => {
        if (isAudioFallback && audioRef.current) {
          if (audioRef.current.ended) return 0;
          if (audioRef.current.paused) return 2;
          return 1;
        }

        if (!playerRef.current || typeof playerRef.current.getPlayerState !== "function") {
          return -1;
        }
        try {
          return playerRef.current.getPlayerState();
        } catch {
          return -1;
        }
      },
      loadVideo: (vid: string, startSeconds: number = 0) => {
        if (isAudioFallback) {
          switchToAudioFallback(vid);
          return;
        }

        if (!playerRef.current) return;
        try {
          if (typeof playerRef.current.loadVideoById === "function") {
            playerRef.current.loadVideoById(vid, startSeconds);
          }
        } catch (e) {
          console.warn("[YouTubePlayer] loadVideo error:", e);
        }
      },
      cueVideo: (vid: string, startSeconds: number = 0) => {
        if (isAudioFallback) {
          switchToAudioFallback(vid);
          return;
        }

        if (!playerRef.current) return;
        try {
          if (typeof playerRef.current.cueVideoById === "function") {
            playerRef.current.cueVideoById(vid, startSeconds);
          }
        } catch (e) {
          console.warn("[YouTubePlayer] cueVideo error:", e);
        }
      },
      setVolume: (vol: number) => {
        if (isAudioFallback && audioRef.current) {
          audioRef.current.volume = Math.max(0, Math.min(1, vol / 100));
          return;
        }

        if (!playerRef.current) return;
        try {
          playerRef.current.setVolume(vol);
        } catch (e) {
          console.error("[YouTubePlayer] Volume error:", e);
        }
      },
    }),
    [isAudioFallback, setIsAutoplayBlocked, switchToAudioFallback]
  );

  const handleStartAudioGesture = () => {
    setIsAutoplayBlocked(false);
    if (isAudioFallback && audioRef.current) {
      audioRef.current.play().catch(console.error);
    } else if (playerRef.current) {
      playerRef.current.playVideo();
    }
  };

  return (
    <div
      className={cn(
        "relative w-full aspect-video rounded-lg overflow-hidden border border-[#262626] bg-[#0c0c0c] shadow-2xl",
        className
      )}
    >
      {/* 1. YouTube IFrame Target Container */}
      {!isAudioFallback && (
        <div ref={containerRef} className="w-full h-full" />
      )}

      {/* 2. Audio-Only Fallback Stream Interface */}
      {isAudioFallback && audioFallbackUrl && (
        <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-[#121212] via-[#0d0d0d] to-[#161616] p-6 text-center space-y-4">
          <audio
            ref={audioRef}
            src={audioFallbackUrl}
            preload="auto"
            onError={() => {
              console.warn("[YouTubePlayer] Audio fallback stream error");
              setFallbackError("Audio stream temporarily unavailable");
            }}
            onPlay={() => {
              setPlayerState("playing");
              setIsAutoplayBlocked(false);
              onStateChange?.(1);
            }}
            onPause={() => {
              setPlayerState("paused");
              onStateChange?.(2);
            }}
            onEnded={() => {
              setPlayerState("ended");
              onStateChange?.(0);
              onTrackEnded?.();
            }}
            onTimeUpdate={() => {
              if (audioRef.current) {
                setCurrentTime(audioRef.current.currentTime);
                setDuration(audioRef.current.duration || 0);
              }
            }}
          />

          <div className="relative flex items-center justify-center h-20 w-20 rounded-full bg-[#1db954]/10 border border-[#1db954]/30 text-[#1db954] shadow-lg shadow-[#1db954]/10 animate-pulse">
            <Radio className="h-9 w-9" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <Badge variant="accent" className="text-[10px] gap-1 px-2 py-0.5">
                <Sparkles className="h-3 w-3" /> Audio-Only Fallback
              </Badge>
            </div>
            <p className="text-xs text-[#a1a1a1]">
              Video embed restricted by YouTube. Audio is streaming in high quality.
            </p>
          </div>
        </div>
      )}

      {/* 3. Audio Extraction Loading State */}
      {isExtractingAudio && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0d0d]/90 backdrop-blur-sm z-30 space-y-2">
          <Loader2 className="h-7 w-7 animate-spin text-[#1db954]" />
          <span className="text-xs text-[#fafafa] font-medium">
            Switching to audio fallback stream...
          </span>
        </div>
      )}

      {/* 4. Fatal Error State */}
      {fallbackError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#141414] text-center space-y-3 z-30">
          <AlertTriangle className="h-8 w-8 text-[#e5484d]" />
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-[#fafafa]">
              Playback Unavailable
            </h4>
            <p className="text-[11px] text-[#a1a1a1] max-w-xs">{fallbackError}</p>
          </div>
          {videoId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => switchToAudioFallback(videoId)}
              className="text-xs"
            >
              Retry Audio Stream
            </Button>
          )}
        </div>
      )}

      {/* 5. Autoplay Blocked Tap-to-Start User Gesture Overlay */}
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
              Your browser paused playback to prevent surprise audio. Tap below to join synchronized audio.
            </p>
          </div>
          <Button
            variant="primary"
            size="lg"
            data-gesture="start-audio"
            onClick={handleStartAudioGesture}
            className="gap-2 shadow-lg shadow-[#1db954]/20"
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
