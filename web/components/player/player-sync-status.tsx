"use client";

import * as React from "react";
import { Radio, AlertCircle, Volume2, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { usePlayerStore } from "@/lib/stores/player-store";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

export function PlayerSyncStatus({ className }: { className?: string }) {
  const { syncStatus, driftMs, isAutoplayBlocked } = usePlayerStore();

  return (
    <div className={cn("inline-flex items-center gap-2 text-xs", className)}>
      {syncStatus === "in_sync" && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#1db954]/30 bg-[#1db954]/10 text-[#1db954]">
          <span className="h-2 w-2 rounded-full bg-[#1db954] animate-pulse"></span>
          <span className="font-semibold">In Sync</span>
          <span className="text-[10px] text-[#1db954]/80 tabular-nums">
            (±{Math.abs(Math.round(driftMs))}ms)
          </span>
        </div>
      )}

      {syncStatus === "syncing" && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#0070f3]/30 bg-[#0070f3]/10 text-[#0070f3]">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Synchronizing time...</span>
        </div>
      )}

      {syncStatus === "buffering" && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Buffering track</span>
        </div>
      )}

      {isAutoplayBlocked && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#e5484d]/30 bg-[#e5484d]/10 text-[#e5484d]">
          <AlertCircle className="h-3 w-3" />
          <span>Audio Blocked — Tap to Resume</span>
        </div>
      )}

      {syncStatus === "ready" && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#262626] bg-[#161616] text-[#a1a1a1]">
          <CheckCircle2 className="h-3 w-3 text-[#1db954]" />
          <span>Player Ready</span>
        </div>
      )}

      {syncStatus === "idle" && (
        <div className="flex items-center gap-1.5 px-2 py-0.5 text-[#666666] text-[11px]">
          <Radio className="h-3 w-3" />
          <span>Idle</span>
        </div>
      )}
    </div>
  );
}
