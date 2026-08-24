import { create } from "zustand";
import type { NormalizedTrack } from "@/lib/types/music";
import type { QueueItem } from "@/lib/types/queue";
import type { PlaybackState } from "@/lib/types/playback";
import type { ActiveMember } from "@/lib/types/user";
import type { ChatMessage, Reaction } from "@/lib/types/chat";
import type { ActiveRoomSettings } from "@/lib/types/room";
import type { SongRequest } from "@/lib/types/song-request";

export interface RoomStoreState {
  // Room metadata
  roomId: string | null;
  roomCode: string | null;
  title: string | null;
  masterId: string | null;
  currentUserId: string | null;
  currentUserRole: "master" | "co-host" | "member" | "guest";
  isMaster: boolean;
  isCoHost: boolean;

  // Active state
  currentTrack: NormalizedTrack | null;
  playback: PlaybackState;
  queue: QueueItem[];
  members: Record<string, ActiveMember>;
  chatMessages: ChatMessage[];
  reactions: (Reaction & { animationId: string })[];
  pendingSongRequests: SongRequest[];
  mySongRequests: SongRequest[];
  settings: ActiveRoomSettings | null;
  isConnected: boolean;
  isHostGraceActive: boolean;
  hostGraceExpiresAt: number | null;

  // Actions
  setRoomState: (state: {
    roomId: string;
    roomCode: string;
    masterId: string;
    currentUserId: string;
    currentUserRole: "master" | "co-host" | "member" | "guest";
    currentTrack: NormalizedTrack | null;
    playback: PlaybackState;
    queue: QueueItem[];
    members: Record<string, ActiveMember>;
    settings: ActiveRoomSettings;
    chatBuffer?: ChatMessage[];
    pendingRequests?: SongRequest[];
  }) => void;
  updatePlayback: (playback: PlaybackState) => void;
  updateTrack: (track: NormalizedTrack | null) => void;
  updateQueue: (queue: QueueItem[]) => void;
  setMembers: (members: Record<string, ActiveMember>) => void;
  addMember: (member: ActiveMember) => void;
  removeMember: (memberId: string) => void;
  updateMember: (member: ActiveMember) => void;
  addChatMessage: (message: ChatMessage) => void;
  addReaction: (reaction: Reaction) => void;
  removeReaction: (animationId: string) => void;
  setPendingSongRequests: (requests: SongRequest[]) => void;
  addPendingSongRequest: (request: SongRequest) => void;
  updateSongRequestStatus: (requestId: string, status: string) => void;
  setMasterId: (newMasterId: string) => void;
  setHostGrace: (active: boolean, expiresAt?: number | null) => void;
  setIsConnected: (connected: boolean) => void;
  resetRoom: () => void;
}

const defaultPlayback: PlaybackState = {
  status: "idle",
  currentTrack: null,
  positionSeconds: 0,
  changedAtServerMs: Date.now(),
  startAtServerMs: null,
  version: 0,
  lastCommandId: null,
};

export const useRoomStore = create<RoomStoreState>((set, get) => ({
  roomId: null,
  roomCode: null,
  title: null,
  masterId: null,
  currentUserId: null,
  currentUserRole: "guest",
  isMaster: false,
  isCoHost: false,

  currentTrack: null,
  playback: defaultPlayback,
  queue: [],
  members: {},
  chatMessages: [],
  reactions: [],
  pendingSongRequests: [],
  mySongRequests: [],
  settings: null,
  isConnected: false,
  isHostGraceActive: false,
  hostGraceExpiresAt: null,

  setRoomState: (data) => {
    const isMaster = data.currentUserId === data.masterId;
    const isCoHost = data.currentUserRole === "co-host";
    set({
      roomId: data.roomId,
      roomCode: data.roomCode,
      title: data.settings.title,
      masterId: data.masterId,
      currentUserId: data.currentUserId,
      currentUserRole: data.currentUserRole,
      isMaster,
      isCoHost,
      currentTrack: data.currentTrack,
      playback: data.playback,
      queue: data.queue,
      members: data.members,
      settings: data.settings,
      chatMessages: data.chatBuffer || [],
      pendingSongRequests: data.pendingRequests || [],
      isConnected: true,
    });
  },

  updatePlayback: (playback) => set({ playback, currentTrack: playback.currentTrack }),
  updateTrack: (currentTrack) => set((s) => ({ currentTrack, playback: { ...s.playback, currentTrack } })),
  updateQueue: (queue) => set({ queue }),
  setMembers: (members) => set({ members }),
  addMember: (member) => set((s) => ({ members: { ...s.members, [member.id]: member } })),
  removeMember: (memberId) =>
    set((s) => {
      const next = { ...s.members };
      delete next[memberId];
      return { members: next };
    }),
  updateMember: (member) =>
    set((s) => ({
      members: { ...s.members, [member.id]: member },
    })),
  addChatMessage: (message) =>
    set((s) => ({
      chatMessages: [...s.chatMessages.slice(-100), message],
    })),
  addReaction: (reaction) => {
    const animationId = `${reaction.id}_${Date.now()}_${Math.random()}`;
    set((s) => ({
      reactions: [...s.reactions.slice(-20), { ...reaction, animationId }],
    }));
    setTimeout(() => {
      get().removeReaction(animationId);
    }, 2500);
  },
  removeReaction: (animationId) =>
    set((s) => ({
      reactions: s.reactions.filter((r) => r.animationId !== animationId),
    })),
  setPendingSongRequests: (pendingSongRequests) => set({ pendingSongRequests }),
  addPendingSongRequest: (request) =>
    set((s) => ({
      pendingSongRequests: [request, ...s.pendingSongRequests],
    })),
  updateSongRequestStatus: (requestId, status) =>
    set((s) => ({
      pendingSongRequests: s.pendingSongRequests.filter((r) => r.id !== requestId),
      mySongRequests: s.mySongRequests.map((r) =>
        r.id === requestId ? { ...r, status: status as any } : r
      ),
    })),
  setMasterId: (newMasterId) =>
    set((s) => {
      const isMaster = s.currentUserId === newMasterId;
      return {
        masterId: newMasterId,
        isMaster,
        currentUserRole: isMaster ? "master" : s.currentUserRole === "master" ? "member" : s.currentUserRole,
      };
    }),
  setHostGrace: (isHostGraceActive, hostGraceExpiresAt = null) =>
    set({ isHostGraceActive, hostGraceExpiresAt }),
  setIsConnected: (isConnected) => set({ isConnected }),
  resetRoom: () =>
    set({
      roomId: null,
      roomCode: null,
      title: null,
      masterId: null,
      currentUserId: null,
      currentUserRole: "guest",
      isMaster: false,
      isCoHost: false,
      currentTrack: null,
      playback: defaultPlayback,
      queue: [],
      members: {},
      chatMessages: [],
      reactions: [],
      pendingSongRequests: [],
      mySongRequests: [],
      settings: null,
      isConnected: false,
      isHostGraceActive: false,
      hostGraceExpiresAt: null,
    }),
}));
