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
  const isPlayerReadyRef = React.useRef(false);

  const [isApiLoaded, setIsApiLoaded] = React.useState(false);
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

  // Load YouTube IFrame API script once
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

  // Initialize YT.Player instance ONCE when API is loaded
  React.useEffect(() => {
    if (!isApiLoaded || !containerRef.current || playerRef.current) return;

    const playerId = "yt-player-persistent-frame";
    let el = document.getElementById(playerId);
    if (!el) {
      el = document.createElement("div");
      el.id = playerId;
      containerRef.current.appendChild(el);
    }

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
            isPlayerReadyRef.current = true;
            try {
              playerRef.current.setVolume(isMuted ? 0 : volume);
            } catch {}
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
            if (event.data === 101 || event.data === 150) {
              setErrorMessage("This track is restricted by the content owner on YouTube.");
            } else if (event.data === 100) {
              setErrorMessage("Track not found or removed on YouTube.");
            }
            onError?.(event);
          },
        },
      });
    } catch (e) {
      console.warn("[YouTubePlayer] Init note:", e);
    }
  }, [isApiLoaded]);

  // When videoId changes, update the existing persistent player smoothly
  React.useEffect(() => {
    if (!videoId || !playerRef.current || !isPlayerReadyRef.current) return;
    setErrorMessage(null);

    try {
      if (typeof playerRef.current.cueVideoById === "function") {
        playerRef.current.cueVideoById(videoId);
      }
    } catch (e) {
      console.warn("[YouTubePlayer] Cue video error:", e);
    }
  }, [videoId]);

  // Forward ref methods calling official YouTube IFrame methods
  React.useImperativeHandle(
    ref,
    () => ({
      play: () => {
        if (!playerRef.current) return;
        try {
          if (typeof playerRef.current.playVideo === "function") {
            playerRef.current.playVideo();
          }
        } catch (e) {
          setIsAutoplayBlocked(true);
        }
      },
      pause: () => {
        if (!playerRef.current) return;
        try {
          if (typeof playerRef.current.pauseVideo === "function") {
            playerRef.current.pauseVideo();
          }
        } catch (e) {
          console.error("[YouTubePlayer] Pause error:", e);
        }
      },
      seekTo: (seconds: number, allowSeekAhead: boolean = true) => {
        if (!playerRef.current) return;
        try {
          if (typeof playerRef.current.seekTo === "function") {
            playerRef.current.seekTo(seconds, allowSeekAhead);
          }
        } catch (e) {
          console.error("[YouTubePlayer] Seek error:", e);
        }
      },
      getCurrentTime: () => {
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
        if (!playerRef.current) return;
        try {
          if (typeof playerRef.current.loadVideoById === "function") {
            playerRef.current.loadVideoById(vid, startSeconds);
          }
        } catch (e) {
          console.warn("[YouTubePlayer] loadVideoById error:", e);
        }
      },
      cueVideo: (vid: string, startSeconds: number = 0) => {
        if (!playerRef.current) return;
        try {
          if (typeof playerRef.current.cueVideoById === "function") {
            playerRef.current.cueVideoById(vid, startSeconds);
          }
        } catch (e) {
          console.warn("[YouTubePlayer] cueVideoById error:", e);
        }
      },
      setVolume: (vol: number) => {
        if (!playerRef.current) return;
        try {
          if (typeof playerRef.current.setVolume === "function") {
            playerRef.current.setVolume(vol);
          }
        } catch (e) {
          console.error("[YouTubePlayer] setVolume error:", e);
        }
      },
    }),
    [setIsAutoplayBlocked]
  );

  const handleStartAudioGesture = () => {
    setIsAutoplayBlocked(false);
    if (playerRef.current && typeof playerRef.current.playVideo === "function") {
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
      {/* Persistent YouTube IFrame Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Track Error Banner if embed restricted */}
      {errorMessage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#141414]/95 text-center space-y-3 z-30">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-[#fafafa]">
              Playback Notice
            </h4>
            <p className="text-[11px] text-[#a1a1a1] max-w-xs">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Autoplay Blocked Tap-to-Start User Gesture Overlay */}
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
