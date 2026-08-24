"use client";

import * as React from "react";
import Link from "next/link";
import {
  Crown,
  Settings,
  Share2,
  Users,
  Radio,
  ArrowLeft,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InviteShare } from "@/components/room/invite-share";
import { useRoomStore } from "@/lib/stores/room-store";

interface RoomHeaderProps {
  onOpenSettings?: () => void;
}

export function RoomHeader({ onOpenSettings }: RoomHeaderProps) {
  const {
    roomId,
    roomCode,
    title,
    isMaster,
    members,
    masterId,
  } = useRoomStore();

  const memberCount = Object.keys(members).length;
  const masterMember = masterId ? members[masterId] : null;

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-[#262626] bg-[#0f0f0f]">
      {/* Left: Title & Master Indicator */}
      <div className="flex items-center gap-3 min-w-0">
        <Button asChild variant="ghost" size="icon-sm" className="shrink-0">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-[#fafafa] truncate">
              {title || "Listening Jam"}
            </h1>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {roomCode}
            </Badge>
            {isMaster && (
              <Badge variant="master" className="text-[10px] gap-1 px-1.5 py-0">
                <Crown className="h-3 w-3" /> Master Device
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-[#a1a1a1]">
            <span>Master: {masterMember?.name || "Host"}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {memberCount} connected
            </span>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {roomId && roomCode && (
          <InviteShare
            roomId={roomId}
            roomCode={roomCode}
            title={title || "Jam"}
          />
        )}

        {isMaster && onOpenSettings && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onOpenSettings}
            title="Room Settings"
          >
            <Settings className="h-4 w-4 text-[#a1a1a1]" />
          </Button>
        )}
      </div>
    </header>
  );
}
