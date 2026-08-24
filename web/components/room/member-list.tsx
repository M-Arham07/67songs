"use client";

import * as React from "react";
import { Users, Crown, Shield, VolumeX, UserMinus, MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRoomStore } from "@/lib/stores/room-store";

interface MemberListProps {
  onTransferMaster?: (userId: string) => void;
  onPromoteCoHost?: (userId: string) => void;
  onRemoveMember?: (userId: string) => void;
}

export function MemberList({
  onTransferMaster,
  onPromoteCoHost,
  onRemoveMember,
}: MemberListProps) {
  const { members, currentUserId, isMaster } = useRoomStore();
  const memberList = Object.values(members);

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] border border-[#262626] rounded-lg overflow-hidden">
      <div className="p-3 border-b border-[#262626] bg-[#111111] flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#fafafa]">
          <Users className="h-4 w-4 text-[#a1a1a1]" />
          <span>Participants ({memberList.length})</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {memberList.map((member) => {
          const isCurrentUser = member.id === currentUserId;

          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-2 rounded-md hover:bg-[#161616] transition-colors group"
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

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#fafafa] truncate">
                      {member.name}
                    </span>
                    {isCurrentUser && (
                      <span className="text-[9px] text-[#666666]">(You)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-[#a1a1a1]">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        member.playerStatus === "in_sync"
                          ? "bg-[#1db954]"
                          : member.playerStatus === "buffering"
                          ? "bg-amber-400"
                          : "bg-[#666666]"
                      }`}
                    />
                    <span className="capitalize">{member.playerStatus.replace("_", " ")}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {member.isMaster && (
                  <Badge variant="master" className="text-[9px] px-1 py-0 gap-0.5">
                    <Crown className="h-2.5 w-2.5" /> Master
                  </Badge>
                )}
                {member.isCoHost && !member.isMaster && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0">
                    Co-Host
                  </Badge>
                )}

                {/* Master Moderation Menu */}
                {isMaster && !member.isMaster && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-3.5 w-3.5 text-[#a1a1a1]" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Participant Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onTransferMaster?.(member.id)}
                      >
                        <Crown className="h-3.5 w-3.5 mr-2 text-amber-400" />
                        <span>Transfer Master</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onPromoteCoHost?.(member.id)}
                      >
                        <Shield className="h-3.5 w-3.5 mr-2 text-[#0070f3]" />
                        <span>
                          {member.isCoHost ? "Demote from Co-Host" : "Promote to Co-Host"}
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="danger"
                        onClick={() => onRemoveMember?.(member.id)}
                      >
                        <UserMinus className="h-3.5 w-3.5 mr-2" />
                        <span>Remove from Room</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
