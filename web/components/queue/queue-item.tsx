"use client";

import * as React from "react";
import { Play, Trash2, GripVertical, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { QueueItem } from "@/lib/types/queue";

interface QueueItemRowProps {
  item: QueueItem;
  index: number;
  isMaster: boolean;
  onPlayNow?: (item: QueueItem) => void;
  onRemove?: (item: QueueItem) => void;
}

export function QueueItemRow({
  item,
  index,
  isMaster,
  onPlayNow,
  onRemove,
}: QueueItemRowProps) {
  return (
    <div className="flex items-center justify-between p-2 rounded-md border border-[#262626] bg-[#141414] hover:border-[#383838] transition-colors group">
      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
        {/* Index number / Grab handle */}
        <span className="w-5 text-center text-[11px] font-mono text-[#666666] shrink-0">
          {index + 1}
        </span>

        {/* Thumbnail */}
        <div className="relative h-9 w-9 rounded overflow-hidden bg-[#1f1f1f] border border-[#262626] shrink-0">
          {item.track.thumbnailUrl ? (
            <img
              src={item.track.thumbnailUrl}
              alt={item.track.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#666666]">
              <Music2 className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Track info */}
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-[#fafafa] truncate">
            {item.track.title}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-[#a1a1a1]">
            <span className="truncate">{item.track.artist}</span>
            {item.track.durationFormatted && (
              <>
                <span>•</span>
                <span className="tabular-nums shrink-0">
                  {item.track.durationFormatted}
                </span>
              </>
            )}
            {item.isRequested && (
              <Badge variant="accent" className="text-[8px] py-0 px-1">
                Requested by {item.requestedBy?.name}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      {isMaster && (
        <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onPlayNow?.(item)}
            title="Play immediately"
            className="hover:text-[#1db954]"
          >
            <Play className="h-3 w-3 fill-current" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onRemove?.(item)}
            title="Remove from queue"
            className="hover:text-[#e5484d]"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
