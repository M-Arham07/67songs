import { create } from "zustand";

export interface PlayerStoreState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playerState: "unstarted" | "ended" | "playing" | "paused" | "buffering" | "cued" | "error";
  isReady: boolean;
  isAutoplayBlocked: boolean;
  syncStatus: "idle" | "loading" | "ready" | "syncing" | "in_sync" | "buffering" | "autoplay_blocked" | "unavailable";
  driftMs: number;
  
  // Actions
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (currentTime: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setIsMuted: (isMuted: boolean) => void;
  setPlayerState: (playerState: PlayerStoreState["playerState"]) => void;
  setIsReady: (isReady: boolean) => void;
  setIsAutoplayBlocked: (isAutoplayBlocked: boolean) => void;
  setSyncStatus: (syncStatus: PlayerStoreState["syncStatus"]) => void;
  setDriftMs: (driftMs: number) => void;
}

export const usePlayerStore = create<PlayerStoreState>((set) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 80,
  isMuted: false,
  playerState: "unstarted",
  isReady: false,
  isAutoplayBlocked: false,
  syncStatus: "idle",
  driftMs: 0,

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  setIsMuted: (isMuted) => set({ isMuted }),
  setPlayerState: (playerState) => set({ playerState }),
  setIsReady: (isReady) => set({ isReady }),
  setIsAutoplayBlocked: (isAutoplayBlocked) => set({ isAutoplayBlocked }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setDriftMs: (driftMs) => set({ driftMs }),
}));
