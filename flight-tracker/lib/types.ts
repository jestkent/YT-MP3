/** Geographic bounding box (degrees). */
export interface BBox {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}

/** Normalized aircraft shape used across the whole app, provider-agnostic. */
export interface Aircraft {
  /** Stable id (ICAO 24-bit address or provider flight id). */
  id: string;
  /** Callsign / flight number, trimmed. */
  ident: string;
  lat: number;
  lon: number;
  /** Track over ground in degrees (0 = north, clockwise). */
  heading: number;
  /** Barometric/geometric altitude in feet, or null if unknown. */
  altitude: number | null;
  /** Ground speed in knots, or null if unknown. */
  groundspeed: number | null;
  /** Vertical rate in ft/min (positive = climbing). */
  verticalRate?: number | null;
  onGround?: boolean;
  origin?: string | null;
  destination?: string | null;
  aircraftType?: string | null;
  /** Epoch seconds of last position update. */
  lastSeen: number;
}

export interface PositionsResult {
  provider: string;
  count: number;
  aircraft: Aircraft[];
}
