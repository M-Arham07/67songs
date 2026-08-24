import type {
  ActiveRoomState,
  ActiveRoomSettings,
  NormalizedTrack,
  QueueItem,
  ActiveMember,
  ChatMessage,
  SongRequest,
  PlaybackState,
} from "../types/index.js";

class RoomStateManager {
  private activeRooms: Map<string, ActiveRoomState> = new Map();
  private processedCommands: Set<string> = new Set();

  public getRoom(roomId: string): ActiveRoomState | undefined {
    return this.activeRooms.get(roomId);
  }

  public getRoomByCode(code: string): ActiveRoomState | undefined {
    for (const room of this.activeRooms.values()) {
      if (room.roomCode === code) return room;
    }
    return undefined;
  }

  public createRoom(
    roomId: string,
    roomCode: string,
    masterId: string,
    settings: ActiveRoomSettings
  ): ActiveRoomState {
    const existing = this.activeRooms.get(roomId);
    if (existing) return existing;

    const now = Date.now();
    const newRoom: ActiveRoomState = {
      roomId,
      roomCode,
      masterId,
      coHostIds: [],
      members: {},
      currentTrack: null,
      queue: [],
      playback: {
        status: "idle",
        currentTrack: null,
        positionSeconds: 0,
        changedAtServerMs: now,
        startAtServerMs: null,
        version: 1,
        lastCommandId: null,
      },
      settings,
      chatBuffer: [],
      pendingRequests: [],
      createdAtServerMs: now,
      lastSnapshotAtServerMs: now,
      hostGraceExpiresAt: null,
    };

    this.activeRooms.set(roomId, newRoom);
    return newRoom;
  }

  public isCommandProcessed(commandId: string): boolean {
    return this.processedCommands.has(commandId);
  }

  public markCommandProcessed(commandId: string): void {
    this.processedCommands.add(commandId);
    if (this.processedCommands.size > 10000) {
      const it = this.processedCommands.values();
      for (let i = 0; i < 2000; i++) {
        const val = it.next().value;
        if (val) this.processedCommands.delete(val);
      }
    }
  }

  public nextPlaybackVersion(roomId: string, commandId: string): number {
    const room = this.activeRooms.get(roomId);
    if (!room) return 1;
    room.playback.version += 1;
    room.playback.lastCommandId = commandId;
    this.markCommandProcessed(commandId);
    return room.playback.version;
  }

  public removeRoom(roomId: string): void {
    this.activeRooms.delete(roomId);
  }

  public getAllRooms(): ActiveRoomState[] {
    return Array.from(this.activeRooms.values());
  }
}

export const roomStateManager = new RoomStateManager();
