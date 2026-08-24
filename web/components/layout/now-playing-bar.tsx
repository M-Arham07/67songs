"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  Radio,
  Wifi,
  WifiOff,
  Music2,
  Lock,
  Crown,
  Sliders,
} from "lucide-react";
import { useRoomStore } from "@/lib/stores/room-store";
import { usePlayerStore } from "@/lib/stores/player-store";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AudioAdjusterDialog } from "@/components/player/audio-adjuster";
import { cn } from "@/lib/utils/cn";

function formatSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface NowPlayingBarProps {
  onPlayToggle?: () => void;
  onSkip?: () => void;
  onSeek?: (seconds: number) => void;
}

export function NowPlayingBar({ onPlayToggle, onSkip, onSeek }: NowPlayingBarProps) {
  const {
    roomId,
    roomCode,
    currentTrack,
    playback,
    isMaster,
    members,
    masterId,
  } = useRoomStore();

  const {
    currentTime,
    duration,
    volume,
    isMuted,
    isAutoplayBlocked,
    setIsAutoplayBlocked,
    syncStatus,
    driftMs,
    setVolume,
    setIsMuted,
  } = usePlayerStore();

  const [isAdjusterOpen, setIsAdjusterOpen] = React.useState(false);

  // Find master name
  const masterMember = masterId ? members[masterId] : null;
  const masterName = masterMember ? masterMember.name : "Host";

  if (!roomId && !currentTrack) {
    return null;
  }

  const isPlaying = playback.status === "playing";
  const trackDuration = currentTrack?.durationSeconds || duration || 0;
  const progressPercent =
    trackDuration > 0 ? Math.min(100, (currentTime / trackDuration) * 100) : 0;

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMaster || !onSeek || trackDuration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSeconds = percent * trackDuration;
    onSeek(targetSeconds);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (val === 0) setIsMuted(true);
    else if (isMuted) setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 h-20 border-t border-[#262626] bg-[#0c0c0c]/95 backdrop-blur-md px-4 flex items-center justify-between select-none">
      {/* Left: Track Information */}
      <div className="flex items-center gap-3 w-1/4 min-w-[200px]">
        {currentTrack ? (
          <>
            <div className="relative h-12 w-12 rounded overflow-hidden border border-[#262626] bg-[#181818] shrink-0">
              {currentTrack.thumbnailUrl ? (
                <img
                  src={currentTrack.thumbnailUrl}
                  alt={currentTrack.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[#666666]">
                  <Music2 className="h-5 w-5" />
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <Link
                href={roomId ? `/room/${roomId}` : "#"}
                className="text-xs font-semibold text-[#fafafa] hover:underline truncate"
              >
                {currentTrack.title}
              </Link>
              <span className="text-[11px] text-[#a1a1a1] truncate">
                {currentTrack.artist}
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-xs text-[#666666]">
            <Music2 className="h-4 w-4" />
            <span>No track selected</span>
          </div>
        )}
      </div>

      {/* Center: Playback Controls & Progress */}
      <div className="flex flex-col items-center gap-1.5 w-2/4 max-w-xl">
        <div className="flex items-center gap-4">
          {/* Master Badge / Host Info */}
          {isMaster ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="master" className="text-[10px] gap-1 px-1.5 py-0">
                    <Crown className="h-3 w-3" /> Master
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>You have full playback control</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <div className="flex items-center gap-1 text-[10px] text-[#666666]">
              <Lock className="h-3 w-3" />
              <span>Controlled by {masterName}</span>
            </div>
          )}

          {/* Play/Pause Button / Autoplay Unblock Button */}
          {isAutoplayBlocked ? (
            <button
              onClick={() => {
                setIsAutoplayBlocked(false);
                const gestureBtn = document.querySelector('[data-gesture="start-audio"]') as HTMLButtonElement;
                if (gestureBtn) gestureBtn.click();
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1db954] text-black font-bold text-xs animate-pulse shadow-lg shadow-[#1db954]/30 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Tap to Start Audio</span>
            </button>
          ) : isMaster ? (
            <button
              onClick={onPlayToggle}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fafafa] text-black hover:scale-105 active:scale-95 transition-all shadow-md shadow-white/10"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 fill-current ml-0.5" />
              )}
            </button>
          ) : (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#181818] border border-[#262626] text-[#666666]"
              title="Master controls playback"
            >
              {isPlaying ? (
                <Radio className="h-4 w-4 text-[#1db954] animate-pulse" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
            </div>
          )}

          {/* Skip Button (Master Only) */}
          {isMaster && (
            <button
              onClick={onSkip}
              className="text-[#a1a1a1] hover:text-[#fafafa] p-1 rounded transition-colors cursor-pointer"
              title="Next Track"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-2 w-full text-[11px] text-[#666666] tabular-nums">
          <span className="w-10 text-right">{formatSeconds(currentTime)}</span>
          <div
            onClick={handleSeekClick}
            className={cn(
              "relative flex-1 h-1.5 rounded-full bg-[#262626] overflow-hidden group",
              isMaster ? "cursor-pointer" : "cursor-default"
            )}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all duration-100",
                isMaster ? "bg-[#fafafa] group-hover:bg-[#1db954]" : "bg-[#1db954]"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="w-10 text-left">{formatSeconds(trackDuration)}</span>
        </div>
      </div>

      {/* Right: Sync Status & Volume */}
      <div className="flex items-center justify-end gap-3 w-1/4 min-w-[180px]">
        {/* Sync telemetry badge */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#161616] border border-[#262626] text-[10px] font-medium">
                {syncStatus === "in_sync" && (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1db954] animate-pulse"></span>
                    <span className="text-[#1db954]">Synced ({Math.abs(Math.round(driftMs))}ms)</span>
                  </>
                )}
                {syncStatus === "syncing" && (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0070f3] animate-ping"></span>
                    <span className="text-[#0070f3]">Syncing...</span>
                  </>
                )}
                {syncStatus === "buffering" && (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                    <span className="text-amber-400">Buffering</span>
                  </>
                )}
                {syncStatus === "autoplay_blocked" && (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#e5484d]"></span>
                    <span className="text-[#e5484d]">Tap to Start</span>
                  </>
                )}
                {syncStatus === "idle" && (
                  <span className="text-[#666666]">Ready</span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Synchronized listening telemetry: {Math.abs(Math.round(driftMs))}ms drift offset
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Volume & Audio Adjuster */}
        <div className="flex items-center gap-2 text-[#a1a1a1]">
          <button
            onClick={toggleMute}
            className="hover:text-[#fafafa] p-1 cursor-pointer transition-colors"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4 text-[#e5484d]" />
            ) : volume < 50 ? (
              <Volume1 className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 sm:w-24 h-1 bg-[#262626] rounded-lg appearance-none cursor-pointer accent-[#1db954]"
            title={`Volume: ${volume}%`}
          />

          <button
            onClick={() => setIsAdjusterOpen(true)}
            className="p-1 hover:text-[#fafafa] transition-colors rounded hover:bg-[#1f1f1f] text-[#a1a1a1] cursor-pointer"
            title="Audio & Sync Calibration Adjuster"
          >
            <Sliders className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <AudioAdjusterDialog
        isOpen={isAdjusterOpen}
        onOpenChange={setIsAdjusterOpen}
      />
    </div>
  );
}
