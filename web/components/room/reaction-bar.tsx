"use client";

import * as React from "react";
import { CURATED_REACTIONS } from "@/lib/types/chat";
import { useRoomStore } from "@/lib/stores/room-store";

interface ReactionBarProps {
  onSendReaction?: (emoji: string) => void;
}

export function ReactionBar({ onSendReaction }: ReactionBarProps) {
  const { reactions } = useRoomStore();

  return (
    <div className="relative">
      {/* Floating Animated Emojis */}
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        {reactions.map((r) => (
          <div
            key={r.animationId}
            className="absolute bottom-24 right-12 animate-in fade-in slide-in-from-bottom-8 duration-500 ease-out text-3xl select-none"
            style={{
              right: `${40 + (Math.sin(r.timestamp) * 30 + 20)}px`,
              animationDuration: "2000ms",
              animationFillMode: "forwards",
            }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {/* Emoji Picker Bar */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-full border border-[#262626] bg-[#111111]/90 backdrop-blur-md shadow-lg">
        {CURATED_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSendReaction?.(emoji)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-sm hover:bg-[#222222] hover:scale-125 transition-all active:scale-95 cursor-pointer"
            title={`Send ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
