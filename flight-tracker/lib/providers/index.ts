import type { Aircraft, BBox } from "@/lib/types";
import { OpenSkyProvider } from "./opensky";
import { MockProvider } from "./mock";
import { FlightAwareProvider } from "./flightaware";
import { FallbackProvider } from "./fallback";

/** Pluggable source of live aircraft positions. */
export interface FlightProvider {
  readonly name: string;
  getPositions(bbox: BBox): Promise<Aircraft[]>;
}

let cached: FlightProvider | null = null;

/**
 * Selects the provider from DATA_PROVIDER env var:
 *   opensky     -> free OpenSky Network (default)
 *   mock        -> synthetic offline data (no network)
 *   flightaware -> FlightAware AeroAPI (paid)
 *
 * For flightaware, AERO_FALLBACK (default "opensky") picks a secondary provider
 * used automatically when AeroAPI errors or its budget is exhausted; set to
 * "none" to disable.
 */
export function getProvider(): FlightProvider {
  if (cached) return cached;
  const choice = (process.env.DATA_PROVIDER || "opensky").toLowerCase();
  switch (choice) {
    case "mock":
      cached = new MockProvider();
      break;
    case "flightaware":
      cached = withFallback(new FlightAwareProvider());
      break;
    case "opensky":
    default:
      cached = new OpenSkyProvider();
      break;
  }
  return cached;
}

function withFallback(primary: FlightProvider): FlightProvider {
  const choice = (process.env.AERO_FALLBACK ?? "opensky").toLowerCase();
  switch (choice) {
    case "none":
      return primary;
    case "mock":
      return new FallbackProvider(primary, new MockProvider());
    case "opensky":
    default:
      return new FallbackProvider(primary, new OpenSkyProvider());
  }
}
