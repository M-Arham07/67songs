"use client";

import * as React from "react";
import {
  Check,
  X,
  Music2,
  Clock,
  Sparkles,
  ArrowDownToLine,
  ArrowUpToLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRoomStore } from "@/lib/stores/room-store";
import type { SongRequestAction } from "@/lib/types/song-request";

interface SongRequestPanelProps {
  onRespondRequest?: (action: SongRequestAction) => void;
  onOpenSearch?: () => void;
}

export function SongRequestPanel({
  onRespondRequest,
  onOpenSearch,
}: SongRequestPanelProps) {
  const { isMaster, pendingSongRequests, mySongRequests } = useRoomStore();

  if (isMaster) {
    return (
      <div className="space-y-3 p-2">
        <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#fafafa]">
              Pending Song Requests
            </span>
            <Badge variant="master" className="text-[10px]">
              {pendingSongRequests.length}
            </Badge>
          </div>
          <span className="text-[10px] text-[#a1a1a1]">
            Approve or decline participant requests
          </span>
        </div>

        {pendingSongRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-xs text-[#666666] space-y-1">
            <Music2 className="h-6 w-6 stroke-1 text-[#444444]" />
            <span>No pending song requests</span>
            <p className="text-[10px] text-[#444444]">
              When participants request a track, it will appear here for review.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {pendingSongRequests.map((req) => (
              <div
                key={req.id}
                className="flex flex-col gap-2 p-2.5 rounded-md border border-[#262626] bg-[#141414] hover:border-[#383838] transition-colors"
              >
                {/* Track and requester header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative h-8 w-8 rounded overflow-hidden bg-[#1f1f1f] border border-[#262626] shrink-0">
                      {req.track.thumbnailUrl ? (
                        <img
                          src={req.track.thumbnailUrl}
                          alt={req.track.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#666666]">
                          <Music2 className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-[#fafafa] truncate">
                        {req.track.title}
                      </span>
                      <span className="text-[10px] text-[#a1a1a1] truncate">
                        {req.track.artist}
                      </span>
                    </div>
                  </div>

                  {/* Requester name */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Avatar className="h-5 w-5">
                      {req.requestedBy.avatarUrl && (
                        <AvatarImage src={req.requestedBy.avatarUrl} alt={req.requestedBy.name} />
                      )}
                      <AvatarFallback className="text-[8px]">
                        {req.requestedBy.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] text-[#a1a1a1] max-w-[80px] truncate">
                      {req.requestedBy.name}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-[#222222]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      onRespondRequest?.({
                        requestId: req.id,
                        action: "reject",
                      })
                    }
                    className="h-6 px-2 text-[10px] hover:text-[#e5484d] gap-1"
                  >
                    <X className="h-3 w-3" />
                    <span>Decline</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onRespondRequest?.({
                        requestId: req.id,
                        action: "accept",
                        insertPosition: "next",
                      })
                    }
                    className="h-6 px-2 text-[10px] gap-1"
                    title="Insert immediately after current track"
                  >
                    <ArrowUpToLine className="h-3 w-3" />
                    <span>Play Next</span>
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      onRespondRequest?.({
                        requestId: req.id,
                        action: "accept",
                        insertPosition: "end",
                      })
                    }
                    className="h-6 px-2 text-[10px] gap-1"
                    title="Add to the end of upcoming queue"
                  >
                    <Check className="h-3 w-3" />
                    <span>Accept</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Member View: My Song Requests & Request Button
  return (
    <div className="space-y-4 p-2">
      <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
        <span className="text-xs font-semibold text-[#fafafa]">
          Song Requests
        </span>
        {onOpenSearch && (
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenSearch}
            className="h-7 px-3 text-xs gap-1"
          >
            <Music2 className="h-3 w-3" />
            <span>Request a Song</span>
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs text-[#a1a1a1]">
          The Master controls the music. You can search YouTube Music and request any song to be queued.
        </p>
      </div>
    </div>
  );
}
