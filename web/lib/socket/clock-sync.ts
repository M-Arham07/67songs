import type { Socket } from "socket.io-client";

interface ClockSample {
  roundTripMs: number;
  offsetMs: number;
}

export class ClockSynchronizer {
  private samples: ClockSample[] = [];
  private currentOffsetMs: number = 0;
  private isSyncing: boolean = false;

  public async syncWithServer(socket: Socket): Promise<number> {
    if (this.isSyncing) return this.currentOffsetMs;
    this.isSyncing = true;

    this.samples = [];

    // Collect 5 quick ping/pong samples
    for (let i = 0; i < 5; i++) {
      try {
        const sample = await this.pingSample(socket);
        this.samples.push(sample);
      } catch {
        // Skip failed ping
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    if (this.samples.length > 0) {
      // Sort by roundTrip ascending to pick lowest latency samples
      this.samples.sort((a, b) => a.roundTripMs - b.roundTripMs);
      
      // Take median from best 3 samples
      const bestSamples = this.samples.slice(0, 3);
      const medianSample = bestSamples[Math.floor(bestSamples.length / 2)];
      this.currentOffsetMs = medianSample.offsetMs;
    }

    this.isSyncing = false;
    return this.currentOffsetMs;
  }

  private pingSample(socket: Socket): Promise<ClockSample> {
    return new Promise((resolve, reject) => {
      const clientSendTime = Date.now();

      const timeout = setTimeout(() => {
        reject(new Error("Clock ping timeout"));
      }, 3000);

      socket.emit(
        "clock_ping",
        { clientTime: clientSendTime },
        (res: { clientTime: number; serverReceiveTime: number; serverSendTime: number }) => {
          clearTimeout(timeout);
          const clientReceiveTime = Date.now();
          const roundTripMs = clientReceiveTime - clientSendTime;

          // Standard Cristian's algorithm for clock offset
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
