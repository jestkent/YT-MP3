import type { Aircraft, BBox } from "@/lib/types";
import { OpenSkyProvider } from "./opensky";
import { MockProvider } from "./mock";

/** Pluggable source of live aircraft positions. */
export interface FlightProvider {
  readonly name: string;
  getPositions(bbox: BBox): Promise<Aircraft[]>;
}

let cached: FlightProvider | null = null;

/**
 * Selects the provider from DATA_PROVIDER env var.
 *   opensky     -> free OpenSky Network (default)
 *   mock        -> synthetic offline data (no network)
 *   flightaware -> AeroAPI (added in M3); falls back to mock until implemented
 */
export function getProvider(): FlightProvider {
  if (cached) return cached;
  const choice = (process.env.DATA_PROVIDER || "opensky").toLowerCase();
  switch (choice) {
    case "mock":
      cached = new MockProvider();
      break;
    case "flightaware":
      // Implemented in M3. Until then, avoid a hard crash.
      console.warn("DATA_PROVIDER=flightaware not implemented yet; using mock.");
      cached = new MockProvider();
      break;
    case "opensky":
    default:
      cached = new OpenSkyProvider();
      break;
  }
  return cached;
}
