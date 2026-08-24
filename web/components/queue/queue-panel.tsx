"use client";

import * as React from "react";
import { ListMusic, Music, Plus, Send, Radio } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QueueItemRow } from "./queue-item";
import { SongRequestPanel } from "./song-request-panel";
import { useRoomStore } from "@/lib/stores/room-store";
import type { QueueItem } from "@/lib/types/queue";
import type { SongRequestAction } from "@/lib/types/song-request";

interface QueuePanelProps {
  onPlayQueueItem?: (item: QueueItem) => void;
  onRemoveQueueItem?: (item: QueueItem) => void;
  onRespondSongRequest?: (action: SongRequestAction) => void;
  onOpenSearch?: () => void;
}

export function QueuePanel({
  onPlayQueueItem,
  onRemoveQueueItem,
  onRespondSongRequest,
  onOpenSearch,
}: QueuePanelProps) {
  const { queue, isMaster, pendingSongRequests } = useRoomStore();

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] border border-[#262626] rounded-lg overflow-hidden">
      <Tabs defaultValue="queue" className="flex flex-col h-full">
        {/* Tab Navigation */}
        <div className="p-2 border-b border-[#262626] bg-[#111111] flex items-center justify-between">
          <TabsList className="bg-transparent border-0 p-0 h-auto gap-1">
            <TabsTrigger value="queue" className="gap-1.5 text-xs">
              <ListMusic className="h-3.5 w-3.5" />
              <span>Queue</span>
              <span className="text-[10px] text-[#666666] tabular-nums">
                ({queue.length})
              </span>
            </TabsTrigger>

            <TabsTrigger value="requests" className="gap-1.5 text-xs relative">
              <Send className="h-3.5 w-3.5" />
              <span>Requests</span>
              {pendingSongRequests.length > 0 && isMaster && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1db954] text-[9px] font-bold text-black ml-0.5">
                  {pendingSongRequests.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {isMaster && onOpenSearch && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenSearch}
              className="h-7 px-2 text-xs gap-1"
            >
              <Plus className="h-3 w-3" />
              <span>Add</span>
            </Button>
          )}
        </div>

        {/* Queue Content */}
        <TabsContent value="queue" className="flex-1 overflow-y-auto p-2 m-0 space-y-1.5">
          {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-xs text-[#666666] space-y-2">
              <Music className="h-6 w-6 stroke-1 text-[#444444]" />
              <span>The queue is currently empty</span>
              {isMaster && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onOpenSearch}
                  className="mt-2 text-xs"
                >
                  Add Songs to Queue
                </Button>
              )}
            </div>
          ) : (
            queue.map((item, index) => (
              <QueueItemRow
                key={item.id}
                item={item}
                index={index}
                isMaster={isMaster}
                onPlayNow={onPlayQueueItem}
                onRemove={onRemoveQueueItem}
              />
            ))
          )}
        </TabsContent>

        {/* Requests Content */}
        <TabsContent value="requests" className="flex-1 overflow-y-auto p-0 m-0">
          <SongRequestPanel
            onRespondRequest={onRespondSongRequest}
            onOpenSearch={onOpenSearch}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
