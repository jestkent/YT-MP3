import type { Aircraft, BBox } from "@/lib/types";
import type { FlightProvider } from "./index";

/** Thrown when AeroAPI signals rate/quota limits, or our budget is exhausted. */
export class QuotaError extends Error {}

// AeroAPI reports altitude in hundreds of feet (flight level), groundspeed in knots.
const ALT_HUNDREDS_TO_FT = 100;

interface AeroPosition {
  fa_flight_id?: string;
  ident?: string;
  ident_icao?: string;
  ident_iata?: string;
  latitude?: number;
  longitude?: number;
  heading?: number;
  altitude?: number; // hundreds of feet
  groundspeed?: number; // knots
  timestamp?: string;
  aircraft_type?: string;
  origin?: { code?: string } | string | null;
  destination?: { code?: string } | string | null;
}

interface AeroResponse {
  positions?: AeroPosition[];
}

function code(v: AeroPosition["origin"]): string | null {
  if (!v) return null;
  return typeof v === "string" ? v : v.code ?? null;
}

function normalize(p: AeroPosition): Aircraft | null {
  if (p.latitude == null || p.longitude == null) return null;
  const id = p.fa_flight_id || p.ident_icao || p.ident;
  if (!id) return null;
  return {
    id,
    ident: (p.ident || p.ident_icao || id).trim(),
    lat: p.latitude,
    lon: p.longitude,
    heading: p.heading ?? 0,
    altitude: p.altitude == null ? null : Math.round(p.altitude * ALT_HUNDREDS_TO_FT),
    groundspeed: p.groundspeed ?? null,
    verticalRate: null,
    onGround: false,
    aircraftType: p.aircraft_type ?? null,
    origin: code(p.origin),
    destination: code(p.destination),
    lastSeen: p.timestamp
      ? Math.floor(Date.parse(p.timestamp) / 1000)
      : Math.floor(Date.now() / 1000),
  };
}

/** Tracks a monthly request budget in memory (resets on calendar month). */
class MonthlyBudget {
  private month = new Date().getUTCMonth();
  private used = 0;
  constructor(private readonly max: number) {}
  take(): boolean {
    const m = new Date().getUTCMonth();
    if (m !== this.month) {
      this.month = m;
      this.used = 0;
    }
    if (this.max > 0 && this.used >= this.max) return false;
    this.used++;
    return true;
  }
  get remaining() {
    return this.max > 0 ? Math.max(0, this.max - this.used) : Infinity;
  }
}

/**
 * FlightAware AeroAPI v4 provider. Queries /flights/search/positions for all
 * aircraft inside a bounding box. The API key is read server-side only.
 *
 * Cost-aware: AeroAPI bills per request (~$0.05), so a monthly budget guard
 * trips a QuotaError before overspending, letting the caller fall back.
 */
export class FlightAwareProvider implements FlightProvider {
  readonly name = "flightaware";
  private readonly base: string;
  private readonly apiKey?: string;
  private readonly budget: MonthlyBudget;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: { apiKey?: string; base?: string; monthlyBudget?: number; fetchImpl?: typeof fetch } = {}) {
    this.apiKey = opts.apiKey ?? process.env.AERO_API_KEY;
    this.base =
      opts.base ?? process.env.AERO_API_BASE ?? "https://aeroapi.flightaware.com/aeroapi";
    this.budget = new MonthlyBudget(
      opts.monthlyBudget ?? (Number(process.env.AERO_MONTHLY_BUDGET) || 0)
    );
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async getPositions(bbox: BBox): Promise<Aircraft[]> {
    if (!this.apiKey) throw new Error("AERO_API_KEY is not set");
    if (!this.budget.take()) {
      throw new QuotaError("AeroAPI monthly request budget exhausted");
    }

    // AeroAPI query language bounding box: -latlong "minLat minLon maxLat maxLon"
    const query = `-latlong "${bbox.minLat} ${bbox.minLon} ${bbox.maxLat} ${bbox.maxLon}"`;
    const url =
      `${this.base}/flights/search/positions` +
      `?query=${encodeURIComponent(query)}&max_pages=1`;

    const res = await this.fetchImpl(url, {
      headers: { "x-apikey": this.apiKey, Accept: "application/json" },
      cache: "no-store",
    });

    if (res.status === 429) throw new QuotaError("AeroAPI rate limit (429)");
    if (!res.ok) {
      throw new Error(`AeroAPI responded ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as AeroResponse;
    const out: Aircraft[] = [];
    for (const p of data.positions ?? []) {
      const a = normalize(p);
      if (a) out.push(a);
    }
    return out;
  }
}
