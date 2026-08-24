"use client";

import * as React from "react";
import QRCode from "react-qr-code";
import {
  Users,
  Music,
  Share2,
  Radio,
  Sparkles,
  Copy,
  Check,
  Search,
  Crown,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRoomStore } from "@/lib/stores/room-store";

interface RoomLobbyProps {
  onOpenSearch: () => void;
}

export function RoomLobby({ onOpenSearch }: RoomLobbyProps) {
  const {
    roomId,
    roomCode,
    title,
    isMaster,
    members,
    masterId,
    settings,
  } = useRoomStore();

  const [copiedCode, setCopiedCode] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);

  const fullUrl =
    typeof window !== "undefined" && roomId
      ? `${window.location.origin}/room/${roomId}`
      : "";

  const handleCopyCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      toast.success(`Room code "${roomCode}" copied!`);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const handleCopyLink = async () => {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      toast.success("Invite link copied!");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const memberList = Object.values(members);
  const masterMember = masterId ? members[masterId] : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Session Title & Metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#262626]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#1db954] animate-pulse"></span>
            <span className="text-[11px] font-semibold text-[#1db954] uppercase tracking-wider">
              Lobby • Ready to Jam
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#fafafa] tracking-tight">
            {title || "Listening Room"}
          </h1>
          <p className="text-xs text-[#a1a1a1]">
            Master Device: <span className="text-[#fafafa] font-medium">{masterMember?.name || "Host"}</span> •{" "}
            {memberList.length} participant{memberList.length === 1 ? "" : "s"} connected
          </p>
        </div>

        {/* Master Action: Pick a track */}
        {isMaster ? (
          <Button
            variant="primary"
            onClick={onOpenSearch}
            className="gap-2 shrink-0 shadow-lg shadow-[#1db954]/10"
          >
            <Search className="h-4 w-4" />
            <span>Search & Pick First Song</span>
          </Button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-[#262626] bg-[#111111] text-xs text-[#a1a1a1]">
            <Lock className="h-3.5 w-3.5 text-[#666666]" />
            <span>Waiting for Master to start a song...</span>
          </div>
        )}
      </div>

      {/* Two Column Layout: Invite Tools & Connected Presence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Card: QR & Code Share */}
        <div className="flex flex-col items-center justify-center p-6 rounded-lg border border-[#262626] bg-[#111111] space-y-6 text-center">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-[#fafafa]">
              Scan to Join Synchronized Room
            </h2>
            <p className="text-[11px] text-[#a1a1a1]">
              Point your camera or share the 4-letter code.
            </p>
          </div>

          {/* QR Code */}
          {fullUrl && (
            <div className="p-4 bg-white rounded-lg border border-[#262626] shadow-sm">
              <QRCode
                value={fullUrl}
                size={160}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox={`0 0 256 256`}
              />
            </div>
          )}

          {/* 4-Letter Code Box */}
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between p-3 rounded-md border border-[#262626] bg-[#161616]">
              <div className="text-left">
                <span className="text-[10px] uppercase font-semibold text-[#666666]">
                  Room Code
                </span>
                <div className="text-xl font-mono font-bold tracking-widest text-[#fafafa]">
                  {roomCode}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCode}
                className="gap-1 text-xs"
              >
                {copiedCode ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#1db954]" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyLink}
              className="w-full gap-2 text-xs"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#1db954]" />
                  <span>Link Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Copy Invite Link</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Card: Connected Members */}
        <div className="flex flex-col p-6 rounded-lg border border-[#262626] bg-[#111111] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#fafafa]">
              <Users className="h-4 w-4 text-[#a1a1a1]" />
              <span>In the Lobby ({memberList.length})</span>
            </div>
            <span className="text-[10px] text-[#666666]">
              Max {settings?.capacity || 25}
            </span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {memberList.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-2 rounded-md border border-[#262626] bg-[#161616]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="h-7 w-7">
                    {member.avatarUrl && (
                      <AvatarImage src={member.avatarUrl} alt={member.name} />
                    )}
                    <AvatarFallback className="text-[10px]">
                      {member.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-[#fafafa] truncate">
                    {member.name}
                  </span>
                </div>
                <div>
                  {member.isMaster ? (
                    <Badge variant="master" className="text-[10px] gap-1 py-0">
                      <Crown className="h-3 w-3" /> Master
                    </Badge>
                  ) : member.isCoHost ? (
                    <Badge variant="secondary" className="text-[10px] py-0">
                      Co-Host
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-[#666666]">Member</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {isMaster && (
            <div className="mt-auto pt-4 border-t border-[#262626]">
              <p className="text-[11px] text-[#a1a1a1] mb-2">
                Tip: As Master, click search to pick a song. Everyone in the lobby will start playing simultaneously.
              </p>
              <Button
                variant="primary"
                onClick={onOpenSearch}
                className="w-full gap-2 text-xs"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Search YouTube Music</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
