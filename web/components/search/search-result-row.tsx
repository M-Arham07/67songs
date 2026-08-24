"use client";

import * as React from "react";
import { Play, Plus, ListPlus, Send, Music2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SearchResult, NormalizedTrack } from "@/lib/types/music";

interface SearchResultRowProps {
  result: SearchResult;
  isMaster: boolean;
  onPlayNow?: (track: NormalizedTrack) => void;
  onAddNext?: (track: NormalizedTrack) => void;
  onAddToQueue?: (track: NormalizedTrack) => void;
  onRequestSong?: (track: NormalizedTrack) => void;
  isRequested?: boolean;
}

export function SearchResultRow({
  result,
  isMaster,
  onPlayNow,
  onAddNext,
  onAddToQueue,
  onRequestSong,
  isRequested = false,
}: SearchResultRowProps) {
  const track: NormalizedTrack = {
    videoId: result.videoId || result.id,
    title: result.title,
    artist: result.artist,
    album: result.album,
    durationSeconds: result.durationSeconds || 0,
    durationFormatted: result.durationFormatted,
    thumbnailUrl: result.thumbnailUrl,
    source: "ytmusic",
  };

  const isPlayable = Boolean(result.videoId || result.type === "song" || result.type === "video");

  return (
    <div className="flex items-center justify-between p-2 rounded-md hover:bg-[#161616] transition-colors group">
      {/* Track Artwork & Info */}
      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
        <div className="relative h-10 w-10 rounded overflow-hidden bg-[#181818] border border-[#262626] shrink-0">
          {result.thumbnailUrl ? (
            <img
              src={result.thumbnailUrl}
              alt={result.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#666666]">
              <Music2 className="h-4 w-4" />
            </div>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-[#fafafa] truncate">
            {result.title}
          </span>
          <div className="flex items-center gap-1.5 text-[11px] text-[#a1a1a1]">
            <span className="truncate">{result.artist}</span>
            {result.durationFormatted && (
              <>
                <span>•</span>
                <span className="tabular-nums shrink-0">{result.durationFormatted}</span>
              </>
            )}
            {result.type !== "song" && (
              <Badge variant="secondary" className="text-[9px] py-0 px-1 uppercase">
                {result.type}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons based on Role */}
      {isPlayable && (
        <div className="flex items-center gap-1 shrink-0">
          {isMaster ? (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onPlayNow?.(track)}
                className="h-7 px-2.5 text-xs gap-1"
                title="Play immediately across room"
              >
                <Play className="h-3 w-3 fill-current" />
                <span className="hidden sm:inline">Play</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onAddToQueue?.(track)}
                className="h-7 px-2 text-xs gap-1"
                title="Add to upcoming queue"
              >
                <Plus className="h-3 w-3" />
                <span className="hidden sm:inline">Queue</span>
              </Button>
            </>
          ) : (
            <Button
              variant={isRequested ? "secondary" : "primary"}
              size="sm"
              disabled={isRequested}
              onClick={() => onRequestSong?.(track)}
              className="h-7 px-2.5 text-xs gap-1"
              title="Submit track request to Master"
            >
              {isRequested ? (
                <>
                  <Check className="h-3 w-3 text-[#1db954]" />
                  <span>Requested</span>
                </>
              ) : (
                <>
                  <Send className="h-3 w-3" />
                  <span>Request</span>
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
