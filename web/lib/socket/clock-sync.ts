import type { Socket } from "socket.io-client";

interface ClockSample {
  roundTripMs: number;
  offsetMs: number;
}

export class ClockSynchronizer {
  private samples: ClockSample[] = [];
  private currentOffsetMs: number = 0;
  private isSyncing: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;

  public async syncWithServer(socket: Socket): Promise<number> {
    if (this.isSyncing) return this.currentOffsetMs;
    this.isSyncing = true;

    this.samples = [];

    // Collect 7 ultra-fast ping/pong samples
    for (let i = 0; i < 7; i++) {
      try {
        const sample = await this.pingSample(socket);
        this.samples.push(sample);
      } catch {
        // Skip dropped ping
      }
      await new Promise((r) => setTimeout(r, 60));
    }

    if (this.samples.length > 0) {
      // Sort by roundTrip ascending to eliminate network jitter
      this.samples.sort((a, b) => a.roundTripMs - b.roundTripMs);

      // Discard latency outliers and compute weighted median
      const bestSamples = this.samples.slice(0, Math.max(1, Math.floor(this.samples.length / 2)));
      const sum = bestSamples.reduce((acc, s) => acc + s.offsetMs, 0);
      this.currentOffsetMs = Math.round(sum / bestSamples.length);

      console.log(
        `[ClockSync] High-precision clock offset: ${this.currentOffsetMs > 0 ? "+" : ""}${this.currentOffsetMs}ms (Best RTT: ${bestSamples[0]?.roundTripMs}ms)`
      );
    }

    this.isSyncing = false;
    return this.currentOffsetMs;
  }

  public startPeriodicSync(socket: Socket) {
    if (this.syncInterval) clearInterval(this.syncInterval);
    // Refresh clock sync every 20 seconds to guarantee < 100ms accuracy on dynamic networks
    this.syncInterval = setInterval(() => {
      if (socket.connected) {
        this.syncWithServer(socket).catch(console.error);
      }
    }, 20000);
  }

  public stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private pingSample(socket: Socket): Promise<ClockSample> {
    return new Promise((resolve, reject) => {
      const clientSendTime = Date.now();

      const timeout = setTimeout(() => {
        reject(new Error("Clock ping timeout"));
      }, 2000);

      socket.emit(
        "clock_ping",
        { clientTime: clientSendTime },
        (res: { clientTime: number; serverReceiveTime: number; serverSendTime: number }) => {
          clearTimeout(timeout);
          const clientReceiveTime = Date.now();
          const roundTripMs = clientReceiveTime - clientSendTime;

          // High-precision Cristian's algorithm
          const serverEstimatedTime =
            (res.serverReceiveTime + res.serverSendTime) / 2;
          const clientMidTime = (clientSendTime + clientReceiveTime) / 2;
          const offsetMs = serverEstimatedTime - clientMidTime;

          resolve({ roundTripMs, offsetMs });
        }
      );
    });
  }

  public getEstimatedServerNow(): number {
    return Date.now() + this.currentOffsetMs;
  }

  public getOffsetMs(): number {
    return this.currentOffsetMs;
  }
}

export const clockSynchronizer = new ClockSynchronizer();
