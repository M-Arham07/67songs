"use client";

import * as React from "react";
import type { YouTubePlayerRef } from "@/components/player/youtube-player";

export function useYouTubePlayer() {
  const playerRef = React.useRef<YouTubePlayerRef>(null);

  const play = React.useCallback(() => {
    playerRef.current?.play();
  }, []);

  const pause = React.useCallback(() => {
    playerRef.current?.pause();
  }, []);

  const seekTo = React.useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds);
  }, []);

  const loadVideo = React.useCallback((videoId: string, startSeconds: number = 0) => {
    playerRef.current?.loadVideo(videoId, startSeconds);
  }, []);

  const cueVideo = React.useCallback((videoId: string, startSeconds: number = 0) => {
    playerRef.current?.cueVideo(videoId, startSeconds);
  }, []);

  const getCurrentTime = React.useCallback(() => {
    return playerRef.current?.getCurrentTime() || 0;
  }, []);

  return {
    playerRef,
    play,
    pause,
    seekTo,
    loadVideo,
    cueVideo,
    getCurrentTime,
  };
}
