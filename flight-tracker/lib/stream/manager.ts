import { getProvider } from "@/lib/providers";
import { contains, snapToTile, tileKey } from "@/lib/bbox";
import type { Aircraft, BBox } from "@/lib/types";

const TILE_DEG = 4;
const POLL_MS = Math.max(1000, Number(process.env.POLL_INTERVAL_MS) || 20000);

export interface Snapshot {
  provider: string;
  intervalMs: number;
  aircraft: Aircraft[];
}

interface Subscriber {
  id: number;
  bbox: BBox; // the client's actual viewport
  tileKey: string;
  send: (snapshot: Snapshot) => void;
}

interface Tile {
  bbox: BBox; // snapped fetch region
  subscribers: Set<Subscriber>;
  last?: { aircraft: Aircraft[]; provider: string; at: number };
  fetching?: boolean;
}

/**
 * Decouples upstream polling from client delivery. Each client subscribes with
 * its viewport; viewports snap to a shared grid so overlapping clients share a
 * single upstream fetch. A timer polls every active tile once per interval and
 * fans the result out to that tile's subscribers (filtered to their viewport).
 *
 * Lives as a module/global singleton — valid because we run as a long-lived
 * Node server (`next start`), not serverless.
 */
class StreamManager {
  private tiles = new Map<string, Tile>();
  private subCount = 0;
  private nextId = 1;
  private timer?: ReturnType<typeof setInterval>;

  get pollIntervalMs() {
    return POLL_MS;
  }

  subscribe(bbox: BBox, send: Subscriber["send"]): () => void {
    const snapped = snapToTile(bbox, TILE_DEG);
    const key = tileKey(snapped);
    const sub: Subscriber = { id: this.nextId++, bbox, tileKey: key, send };

    let tile = this.tiles.get(key);
    if (!tile) {
      tile = { bbox: snapped, subscribers: new Set() };
      this.tiles.set(key, tile);
    }
    tile.subscribers.add(sub);
    this.subCount++;

    // Serve an immediate snapshot: cached if fresh, otherwise fetch now.
    if (tile.last) {
      this.deliver(sub, tile.last.aircraft, tile.last.provider);
    } else {
      void this.pollTile(tile);
    }
    this.ensureTimer();

    return () => this.unsubscribe(sub);
  }

  private unsubscribe(sub: Subscriber) {
    const tile = this.tiles.get(sub.tileKey);
    if (tile && tile.subscribers.delete(sub)) {
      this.subCount--;
      if (tile.subscribers.size === 0) this.tiles.delete(sub.tileKey);
    }
    if (this.subCount === 0 && this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private ensureTimer() {
    if (this.timer) return;
    this.timer = setInterval(() => void this.pollAll(), POLL_MS);
  }

  private async pollAll() {
    await Promise.all([...this.tiles.values()].map((t) => this.pollTile(t)));
  }

  private async pollTile(tile: Tile) {
    if (tile.fetching) return;
    tile.fetching = true;
    const provider = getProvider();
    try {
      const aircraft = await provider.getPositions(tile.bbox);
      tile.last = { aircraft, provider: provider.name, at: Date.now() };
      for (const sub of tile.subscribers) {
        this.deliver(sub, aircraft, provider.name);
      }
    } catch {
      // Keep last good snapshot; clients retain prior positions until next poll.
    } finally {
      tile.fetching = false;
    }
  }

  private deliver(sub: Subscriber, aircraft: Aircraft[], provider: string) {
    const inView = aircraft.filter((a) => contains(sub.bbox, a.lat, a.lon));
    sub.send({ provider, intervalMs: POLL_MS, aircraft: inView });
  }
}

// Reuse a single instance across module reloads (dev HMR) and imports.
const g = globalThis as unknown as { __streamManager?: StreamManager };
export const streamManager: StreamManager =
  g.__streamManager ?? (g.__streamManager = new StreamManager());
