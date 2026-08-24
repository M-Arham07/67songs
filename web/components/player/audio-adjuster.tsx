"use client";

import * as React from "react";
import {
  Volume2,
  VolumeX,
  Volume1,
  Sliders,
  RotateCcw,
  Sparkles,
  Radio,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { usePlayerStore } from "@/lib/stores/player-store";
import { useRoomStore } from "@/lib/stores/room-store";

interface AudioAdjusterProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onReSync?: () => void;
}

export function AudioAdjusterDialog({
  isOpen,
  onOpenChange,
  onReSync,
}: AudioAdjusterProps) {
  const {
    volume,
    isMuted,
    setVolume,
    setIsMuted,
    driftMs,
    syncStatus,
    setIsAutoplayBlocked,
  } = usePlayerStore();

  const { isMaster } = useRoomStore();

  // Local latency offset (e.g. for Bluetooth speaker compensation: -200ms to +200ms)
  const [latencyOffsetMs, setLatencyOffsetMs] = React.useState(0);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (isMuted && val > 0) {
      setIsMuted(false);
    }
  };

  const handleUnmuteClick = () => {
    setIsMuted(!isMuted);
    setIsAutoplayBlocked(false);
  };

  const handleApplyPreset = (offset: number) => {
    setLatencyOffsetMs(offset);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#111111] border-[#262626] text-[#fafafa]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sliders className="h-4 w-4 text-[#1db954]" />
            <span>Audio & Sync Adjuster</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-[#a1a1a1]">
            Calibrate sound output volume and compensate for Bluetooth or mobile speaker delay.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* 1. Volume Control */}
          <div className="space-y-3 p-3.5 rounded-lg border border-[#262626] bg-[#161616]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#fafafa] flex items-center gap-2">
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4 text-[#e5484d]" />
                ) : volume < 50 ? (
                  <Volume1 className="h-4 w-4 text-[#1db954]" />
                ) : (
                  <Volume2 className="h-4 w-4 text-[#1db954]" />
                )}
                <span>Output Volume</span>
              </span>
              <span className="text-xs font-mono text-[#a1a1a1]">
                {isMuted ? "Muted" : `${volume}%`}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleUnmuteClick}
                className="text-[#a1a1a1] hover:text-[#fafafa] transition-colors p-1"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4 text-[#e5484d]" />
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
                className="w-full h-1.5 bg-[#262626] rounded-lg appearance-none cursor-pointer accent-[#1db954]"
              />
            </div>
          </div>

          {/* 2. Bluetooth / Hardware Latency Offset */}
          <div className="space-y-3 p-3.5 rounded-lg border border-[#262626] bg-[#161616]">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-[#fafafa]">
                  Audio Latency Offset (Bluetooth Calibration)
                </span>
                <p className="text-[11px] text-[#a1a1a1]">
                  Compensate if your headphones or phone speaker sound behind or ahead.
                </p>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">
                {latencyOffsetMs > 0 ? `+${latencyOffsetMs}ms` : `${latencyOffsetMs}ms`}
              </Badge>
            </div>

            {/* Quick Offset Presets */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              <Button
                type="button"
                variant={latencyOffsetMs === 0 ? "primary" : "outline"}
                size="sm"
                onClick={() => handleApplyPreset(0)}
                className="text-[10px] h-7 px-1"
              >
                Normal (0ms)
              </Button>
              <Button
                type="button"
                variant={latencyOffsetMs === 50 ? "primary" : "outline"}
                size="sm"
                onClick={() => handleApplyPreset(50)}
                className="text-[10px] h-7 px-1"
              >
                Earbuds (+50ms)
              </Button>
              <Button
                type="button"
                variant={latencyOffsetMs === 120 ? "primary" : "outline"}
                size="sm"
                onClick={() => handleApplyPreset(120)}
                className="text-[10px] h-7 px-1"
              >
                Bluetooth (+120ms)
              </Button>
              <Button
                type="button"
                variant={latencyOffsetMs === -50 ? "primary" : "outline"}
                size="sm"
                onClick={() => handleApplyPreset(-50)}
                className="text-[10px] h-7 px-1"
              >
                Ahead (-50ms)
              </Button>
            </div>
          </div>

          {/* 3. Real-time Status & Re-sync Action */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-[#262626] bg-[#0c0c0c]">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  syncStatus === "in_sync"
                    ? "bg-[#1db954] animate-pulse"
                    : syncStatus === "buffering"
                    ? "bg-amber-400"
                    : "bg-[#666666]"
                }`}
              />
              <span className="text-xs text-[#a1a1a1]">
                Estimated Drift: <strong className="text-[#fafafa]">±{Math.abs(Math.round(driftMs))}ms</strong>
              </span>
            </div>

            {onReSync && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onReSync}
                className="h-7 text-xs gap-1.5"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Re-Sync Now</span>
              </Button>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
