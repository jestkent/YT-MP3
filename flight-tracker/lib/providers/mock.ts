import type { Aircraft, BBox } from "@/lib/types";
import type { FlightProvider } from "./index";

const AIRLINES = ["BAW", "DLH", "AFR", "KLM", "RYR", "EZY", "SWR", "UAL", "AAL", "EWG"];

// Deterministic pseudo-random so a given plane is stable across polls.
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904777) >>> 0;
    return s / 0xffffffff;
  };
}

function wrap(value: number, min: number, max: number): number {
  const span = max - min;
  if (span <= 0) return min;
  return min + (((value - min) % span) + span) % span;
}

/**
 * Synthetic provider: deterministic aircraft that drift over time, so the
 * map animates without any external network. Used for offline dev/testing.
 */
export class MockProvider implements FlightProvider {
  readonly name = "mock";
  private readonly count: number;

  constructor(count = 60) {
    this.count = count;
  }

  async getPositions(bbox: BBox): Promise<Aircraft[]> {
    const t = Date.now() / 1000;
    const out: Aircraft[] = [];
    for (let i = 0; i < this.count; i++) {
      const rand = rng(i + 1);
      const baseLat = bbox.minLat + rand() * (bbox.maxLat - bbox.minLat);
      const baseLon = bbox.minLon + rand() * (bbox.maxLon - bbox.minLon);
      const heading = Math.round(rand() * 360);
      const speedKt = 350 + Math.round(rand() * 200);
      // Convert heading + speed into a slow drift in degrees per second.
      const rad = (heading * Math.PI) / 180;
      const degPerSec = speedKt / 3600 / 60; // ~knots to deg/s, exaggerated for visible motion
      const lat = wrap(
        baseLat + Math.cos(rad) * degPerSec * t * 6,
        bbox.minLat,
        bbox.maxLat
      );
      const lon = wrap(
        baseLon + Math.sin(rad) * degPerSec * t * 6,
        bbox.minLon,
        bbox.maxLon
      );
      const airline = AIRLINES[i % AIRLINES.length];
      out.push({
        id: `MOCK${i.toString().padStart(3, "0")}`,
        ident: `${airline}${100 + i}`,
        lat,
        lon,
        heading,
        altitude: 28000 + Math.round(rand() * 12000),
        groundspeed: speedKt,
        verticalRate: 0,
        onGround: false,
        aircraftType: ["A320", "B738", "A359", "B789"][i % 4],
        lastSeen: Math.floor(t),
      });
    }
    return out;
  }
}
