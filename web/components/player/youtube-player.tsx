"use client";

import * as React from "react";
import { Play, Volume2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [isApiLoaded, setIsApiLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

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

  // Initialize YT.Player instance once API is loaded
  React.useEffect(() => {
    if (!isApiLoaded || !containerRef.current) return;

    const playerId = `yt-player-frame-${Math.random().toString(36).substring(2, 8)}`;
    const el = document.createElement("div");
    el.id = playerId;
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(el);

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
        origin: typeof window !== "undefined" ? window.location.origin : "",
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
          console.error("[YouTubePlayer] Player error code:", event.data);
          setHasError(true);
          let msg = "An error occurred with the YouTube player.";
          if (event.data === 101 || event.data === 150) {
            msg = "This video is not embeddable or restricted by YouTube.";
          } else if (event.data === 100) {
            msg = "Video was not found or has been deleted.";
          }
          setErrorMessage(msg);
          onError?.(event);
        },
      },
    });

    return () => {
      try {
        if (player && typeof player.destroy === "function") {
          player.destroy();
        }
      } catch (e) {
        // Ignore destroy error
      }
    };
  }, [isApiLoaded]);

  // Sync volume changes
  React.useEffect(() => {
    if (playerRef.current && typeof playerRef.current.setVolume === "function") {
      playerRef.current.setVolume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted]);

  // Load new videoId when changed
  React.useEffect(() => {
    if (videoId && playerRef.current) {
      setHasError(false);
      setErrorMessage(null);
      try {
        const currentVideoUrl = playerRef.current.getVideoUrl?.() || "";
        if (!currentVideoUrl.includes(videoId)) {
          playerRef.current.cueVideoById(videoId);
        }
      } catch (e) {
        console.warn("[YouTubePlayer] Error cueing video:", e);
      }
    }
  }, [videoId]);

  // Polling current playback time
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
        try {
          const t = playerRef.current.getCurrentTime();
          const d = playerRef.current.getDuration();
          if (typeof t === "number" && !isNaN(t)) {
            setCurrentTime(t);
          }
          if (typeof d === "number" && !isNaN(d) && d > 0) {
            setDuration(d);
          }
        } catch {
          // Ignore polling error
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [setCurrentTime, setDuration]);

  // Expose imperative API
  React.useImperativeHandle(
    ref,
    () => ({
      play: () => {
        try {
          if (playerRef.current && typeof playerRef.current.playVideo === "function") {
            const playPromise = playerRef.current.playVideo();
            if (playPromise && typeof playPromise.catch === "function") {
              playPromise.catch(() => {
                setIsAutoplayBlocked(true);
              });
            }
          }
        } catch (e) {
          setIsAutoplayBlocked(true);
        }
      },
      pause: () => {
        try {
          if (playerRef.current && typeof playerRef.current.pauseVideo === "function") {
            playerRef.current.pauseVideo();
          }
        } catch (e) {}
      },
      seekTo: (seconds: number, allowSeekAhead: boolean = true) => {
        try {
          if (playerRef.current && typeof playerRef.current.seekTo === "function") {
            playerRef.current.seekTo(seconds, allowSeekAhead);
          }
        } catch (e) {}
      },
      getCurrentTime: () => {
        try {
          return playerRef.current?.getCurrentTime?.() || 0;
        } catch {
          return 0;
        }
      },
      getDuration: () => {
        try {
          return playerRef.current?.getDuration?.() || 0;
        } catch {
          return 0;
        }
      },
      getPlayerState: () => {
        try {
          return playerRef.current?.getPlayerState?.() || -1;
        } catch {
          return -1;
        }
      },
      loadVideo: (vid: string, startSeconds: number = 0) => {
        try {
          playerRef.current?.loadVideoById?.({
            videoId: vid,
            startSeconds,
          });
        } catch (e) {}
      },
      cueVideo: (vid: string, startSeconds: number = 0) => {
        try {
          playerRef.current?.cueVideoById?.({
            videoId: vid,
            startSeconds,
          });
        } catch (e) {}
      },
      setVolume: (v: number) => {
        try {
          playerRef.current?.setVolume?.(v);
        } catch (e) {}
      },
    }),
    [setIsAutoplayBlocked]
  );

  const handleUserGestureStart = () => {
    setIsAutoplayBlocked(false);
    try {
      playerRef.current?.playVideo();
    } catch (e) {}
  };

  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-lg border border-[#262626] bg-[#0c0c0c] shadow-lg",
        className
      )}
    >
      {/* YouTube iframe container */}
      <div ref={containerRef} className="h-full w-full" />

      {/* Autoplay Blocked User Gesture Prompt */}
      {isAutoplayBlocked && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 p-4 text-center backdrop-blur-xs space-y-3">
          <div className="h-12 w-12 rounded-full bg-[#1db954]/20 border border-[#1db954]/40 flex items-center justify-center text-[#1db954]">
            <Play className="h-6 w-6 fill-current ml-0.5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-[#fafafa]">
              Browser Autoplay Blocked
            </h4>
            <p className="text-xs text-[#a1a1a1] max-w-xs">
              Click below to allow browser audio and sync with the room.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleUserGestureStart}
            className="gap-2"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Start Synced Audio</span>
          </Button>
        </div>
      )}

      {/* Track Error / Unavailable State */}
      {hasError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 p-4 text-center space-y-2">
          <AlertTriangle className="h-8 w-8 text-[#e5484d]" />
          <h4 className="text-sm font-semibold text-[#fafafa]">
            Playback Unavailable
          </h4>
          <p className="text-xs text-[#a1a1a1] max-w-sm">
            {errorMessage || "The track could not be played. The master can pick another song."}
          </p>
        </div>
      )}

      {/* No Video Cued State */}
      {!videoId && !hasError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0d0d0d] p-4 text-center space-y-2">
          <div className="h-10 w-10 rounded-full bg-[#181818] border border-[#262626] flex items-center justify-center text-[#666666]">
            <Play className="h-5 w-5 fill-current ml-0.5" />
          </div>
          <p className="text-xs text-[#666666]">
            No track currently playing
          </p>
        </div>
      )}
    </div>
  );
});
YouTubePlayer.displayName = "YouTubePlayer";
