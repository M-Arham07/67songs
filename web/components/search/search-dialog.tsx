"use client";

import * as React from "react";
import { Search, Loader2, Music2, X, Sparkles, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { SearchResultRow } from "./search-result-row";
import { useMusicSearch } from "@/lib/hooks/use-music-search";
import { useRoomStore } from "@/lib/stores/room-store";
import type { NormalizedTrack, SearchFilter } from "@/lib/types/music";

interface SearchDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPlayNow?: (track: NormalizedTrack) => void;
  onAddNext?: (track: NormalizedTrack) => void;
  onAddToQueue?: (track: NormalizedTrack) => void;
  onRequestSong?: (track: NormalizedTrack) => void;
}

export function SearchDialog({
  isOpen,
  onOpenChange,
  onPlayNow,
  onAddNext,
  onAddToQueue,
  onRequestSong,
}: SearchDialogProps) {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<SearchFilter>("songs");
  const [requestedTrackIds, setRequestedTrackIds] = React.useState<Set<string>>(
    new Set()
  );

  const { isMaster } = useRoomStore();
  const { data, isLoading, error } = useMusicSearch(query, filter);

  // Keyboard shortcut listener (⌘K / Ctrl+K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!isOpen);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onOpenChange]);

  const handleRequestTrack = (track: NormalizedTrack) => {
    setRequestedTrackIds((prev) => new Set([...prev, track.videoId]));
    onRequestSong?.(track);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden bg-[#0e0e0e] border-[#262626]">
        {/* Search Header Bar */}
        <div className="flex items-center gap-3 px-4 border-b border-[#262626]">
          <Search className="h-4 w-4 text-[#666666] shrink-0" />
          <input
            type="text"
            placeholder={
              isMaster
                ? "Search songs, albums, artists to play or queue..."
                : "Search songs to request from the master..."
            }
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
            className="h-14 w-full bg-transparent text-sm text-[#fafafa] placeholder:text-[#666666] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-[#666666] hover:text-[#fafafa] p-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Navigation */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#111111] border-b border-[#262626]">
          <Tabs
            value={filter}
            onValueChange={(val: any) => setFilter(val)}
            className="w-full"
          >
            <TabsList className="bg-transparent border-0 p-0 h-auto gap-1">
              <TabsTrigger value="songs">Songs</TabsTrigger>
              <TabsTrigger value="videos">Videos</TabsTrigger>
              <TabsTrigger value="albums">Albums</TabsTrigger>
              <TabsTrigger value="artists">Artists</TabsTrigger>
            </TabsList>
          </Tabs>

          <Badge variant={isMaster ? "master" : "secondary"} className="text-[10px] shrink-0 ml-2">
            {isMaster ? "Master Control" : "Request Mode"}
          </Badge>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] min-h-[250px] overflow-y-auto p-2">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-xs text-[#a1a1a1]">
              <Loader2 className="h-5 w-5 animate-spin text-[#1db954]" />
              <span>Searching YouTube Music...</span>
            </div>
          )}

          {!isLoading && query && data?.results?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-xs text-[#666666] gap-1">
              <Music2 className="h-6 w-6 stroke-1" />
              <span>No results found for &ldquo;{query}&rdquo;</span>
            </div>
          )}

          {!isLoading && !query && (
            <div className="flex flex-col items-center justify-center py-16 text-xs text-[#666666] space-y-2">
              <p>Type a song, artist, or album name to search.</p>
              <span className="text-[11px] text-[#444444]">
                Powered by unauthenticated YouTube Music catalog
              </span>
            </div>
          )}

          {!isLoading &&
            data?.results &&
            data.results.length > 0 &&
            data.results.map((result) => (
              <SearchResultRow
                key={result.id}
                result={result}
                isMaster={isMaster}
                onPlayNow={(track) => {
                  onPlayNow?.(track);
                  onOpenChange(false);
                }}
                onAddNext={onAddNext}
                onAddToQueue={onAddToQueue}
                onRequestSong={handleRequestTrack}
                isRequested={requestedTrackIds.has(result.videoId || result.id)}
              />
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
