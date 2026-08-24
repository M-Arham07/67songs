"use client";

import * as React from "react";
import {
  Search,
  ListMusic,
  Users,
  MessageSquare,
  Radio,
  Sparkles,
  Crown,
} from "lucide-react";
import { YouTubePlayer } from "@/components/player/youtube-player";
import { PlayerSyncStatus } from "@/components/player/player-sync-status";
import { RoomHeader } from "@/components/room/room-header";
import { RoomLobby } from "@/components/room/room-lobby";
import { QueuePanel } from "@/components/queue/queue-panel";
import { MemberList } from "@/components/room/member-list";
import { ChatPanel } from "@/components/room/chat-panel";
import { ReactionBar } from "@/components/room/reaction-bar";
import { SearchDialog } from "@/components/search/search-dialog";
import { RoomSettingsDialog } from "@/components/room/room-settings-dialog";
import { MasterTransferDialog } from "@/components/room/master-transfer-dialog";
import { MasterGraceOverlay } from "@/components/room/master-grace-overlay";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useRoomStore } from "@/lib/stores/room-store";
import { usePlayerStore } from "@/lib/stores/player-store";
import type { YouTubePlayerRef } from "@/components/player/youtube-player";
import type { NormalizedTrack } from "@/lib/types/music";
import type { QueueItem } from "@/lib/types/queue";
import type { SongRequestAction } from "@/lib/types/song-request";

interface ActiveRoomProps {
  playerRef: React.RefObject<YouTubePlayerRef | null>;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (seconds: number) => void;
  onSelectTrack: (track: NormalizedTrack) => void;
  onRequestSong: (track: NormalizedTrack) => void;
  onRespondSongRequest: (action: SongRequestAction) => void;
  onTransferMaster: (targetUserId: string) => void;
  onMutateQueue: (payload: any) => void;
  onSendChat: (content: string) => void;
  onSendReaction: (emoji: string) => void;
}

export function ActiveRoom({
  playerRef,
  onPlay,
  onPause,
  onSeek,
  onSelectTrack,
  onRequestSong,
  onRespondSongRequest,
  onTransferMaster,
  onMutateQueue,
  onSendChat,
  onSendReaction,
}: ActiveRoomProps) {
  const {
    currentTrack,
    playback,
    queue,
    isMaster,
    pendingSongRequests,
  } = useRoomStore();

  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isTransferMasterOpen, setIsTransferMasterOpen] = React.useState(false);
  const [activeSideTab, setActiveSideTab] = React.useState<"queue" | "members" | "chat">("queue");

  const handleTrackEnded = () => {
    // If master, auto-advance to next song in queue
    if (isMaster && queue.length > 0) {
      const nextItem = queue[0];
      onMutateQueue({ action: "remove", queueItemId: nextItem.id });
      onSelectTrack(nextItem.track);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-[#0a0a0a]">
      {/* Master Disconnect Grace Period Overlay */}
      <MasterGraceOverlay />

      {/* Room Header */}
      <RoomHeader onOpenSettings={() => setIsSettingsOpen(true)} />

      {/* If room has no active track, show the interactive Lobby */}
      {!currentTrack ? (
        <RoomLobby onOpenSearch={() => setIsSearchOpen(true)} />
      ) : (
        /* Main Active Listening Layout */
        <div className="flex-1 flex flex-col lg:flex-row p-4 gap-4 max-w-7xl mx-auto w-full">
          {/* Left Column: Player & Active Track Info */}
          <div className="flex-1 flex flex-col space-y-4 min-w-0">
            {/* Official Embedded YouTube Player Frame */}
            <div className="w-full">
              <YouTubePlayer
                ref={playerRef as any}
                videoId={currentTrack.videoId}
                onTrackEnded={handleTrackEnded}
              />
            </div>

            {/* Current Track Metadata Bar */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-[#262626] bg-[#111111]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex flex-col min-w-0">
                  <h2 className="text-sm font-bold text-[#fafafa] truncate">
                    {currentTrack.title}
                  </h2>
                  <p className="text-xs text-[#a1a1a1] truncate">
                    {currentTrack.artist}
                    {currentTrack.album && ` • ${currentTrack.album}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <PlayerSyncStatus />
                {isMaster && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSearchOpen(true)}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>Change Song</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Floating Reactions Bar */}
            <div className="flex justify-end pt-1">
              <ReactionBar onSendReaction={onSendReaction} />
            </div>
          </div>

          {/* Right Column: Contextual Sidebar (Queue / Participants / Chat) */}
          <div className="w-full lg:w-80 xl:w-96 flex flex-col h-[600px] lg:h-auto min-h-[450px]">
            <Tabs
              value={activeSideTab}
              onValueChange={(v: any) => setActiveSideTab(v)}
              className="flex flex-col h-full"
            >
              {/* Tab Selector */}
              <TabsList className="w-full grid grid-cols-3 bg-[#111111] border border-[#262626] p-1 h-9 rounded-t-lg rounded-b-none">
                <TabsTrigger value="queue" className="text-xs gap-1">
                  <ListMusic className="h-3.5 w-3.5" />
                  <span>Queue</span>
                  {pendingSongRequests.length > 0 && isMaster && (
                    <span className="h-2 w-2 rounded-full bg-[#1db954]" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="members" className="text-xs gap-1">
                  <Users className="h-3.5 w-3.5" />
                  <span>People</span>
                </TabsTrigger>
                <TabsTrigger value="chat" className="text-xs gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Chat</span>
                </TabsTrigger>
              </TabsList>

              {/* Panels */}
              <div className="flex-1 min-h-0">
                <TabsContent value="queue" className="h-full m-0">
                  <QueuePanel
                    onPlayQueueItem={(item) => {
                      onMutateQueue({ action: "remove", queueItemId: item.id });
                      onSelectTrack(item.track);
                    }}
                    onRemoveQueueItem={(item) =>
                      onMutateQueue({ action: "remove", queueItemId: item.id })
                    }
                    onRespondSongRequest={onRespondSongRequest}
                    onOpenSearch={() => setIsSearchOpen(true)}
                  />
                </TabsContent>

                <TabsContent value="members" className="h-full m-0">
                  <MemberList
                    onTransferMaster={(userId) => {
                      setIsTransferMasterOpen(true);
                    }}
                    onPromoteCoHost={(userId) => {
                      // Promote cohost action
                    }}
                    onRemoveMember={(userId) => {
                      // Remove member action
                    }}
                  />
                </TabsContent>

                <TabsContent value="chat" className="h-full m-0">
                  <ChatPanel onSendMessage={onSendChat} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      )}

      {/* Global Dialogs */}
      <SearchDialog
        isOpen={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        onPlayNow={(track) => onSelectTrack(track)}
        onAddToQueue={(track) => onMutateQueue({ action: "add", track })}
        onAddNext={(track) => onMutateQueue({ action: "add_next", track })}
        onRequestSong={(track) => onRequestSong(track)}
      />

      <RoomSettingsDialog
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        onTransferMasterOpen={() => setIsTransferMasterOpen(true)}
      />

      <MasterTransferDialog
        isOpen={isTransferMasterOpen}
        onOpenChange={setIsTransferMasterOpen}
        onTransferConfirm={onTransferMaster}
      />
    </div>
  );
}
