"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Plus, Radio, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRoomStore } from "@/lib/stores/room-store";

interface TopBarProps {
  onOpenSearch?: () => void;
}

export function TopBar({ onOpenSearch }: TopBarProps) {
  const { roomId, roomCode, title, isMaster } = useRoomStore();

  return (
    <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-[#262626] bg-[#0a0a0a]/90 backdrop-blur-md px-4 select-none">
      {/* Left: Quick Search trigger button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 rounded-md border border-[#262626] bg-[#111111] px-3 py-1.5 text-xs text-[#a1a1a1] hover:border-[#383838] hover:text-[#fafafa] transition-colors cursor-pointer"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search songs, artists...</span>
          <kbd className="hidden sm:inline-flex h-4 items-center gap-0.5 rounded border border-[#262626] bg-[#181818] px-1 text-[10px] text-[#666666]">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Center/Right: Session Indicator & Quick Actions */}
      <div className="flex items-center gap-2">
        {roomId ? (
          <Link
            href={`/room/${roomId}`}
            className="flex items-center gap-2 rounded-md border border-[#1db954]/30 bg-[#1db954]/5 px-2.5 py-1 text-xs text-[#1db954] hover:bg-[#1db954]/10 transition-colors"
          >
            <Radio className="h-3.5 w-3.5 animate-pulse text-[#1db954]" />
            <span className="font-semibold">{title || "Room"}</span>
            <span className="text-[10px] text-[#a1a1a1]">({roomCode})</span>
            {isMaster && (
              <Badge variant="master" className="text-[9px] px-1 py-0 gap-0.5">
                <Crown className="h-2.5 w-2.5" /> Master
              </Badge>
            )}
          </Link>
        ) : (
          <Button asChild variant="primary" size="sm" className="gap-1.5 text-xs">
            <Link href="/create">
              <Plus className="h-3.5 w-3.5" />
              <span>Start Jam</span>
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
