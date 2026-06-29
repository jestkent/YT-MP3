import type { Aircraft, BBox } from "@/lib/types";
import type { FlightProvider } from "./index";

const M_TO_FT = 3.280839895;
const MS_TO_KT = 1.943844492;
const MPS_TO_FTMIN = 196.850394;

// OpenSky /states/all returns a tuple per aircraft; these are the indices we use.
type OpenSkyState = [
  string, // 0  icao24
  string, // 1  callsign
  string, // 2  origin_country
  number | null, // 3  time_position
  number, // 4  last_contact
  number | null, // 5  longitude
  number | null, // 6  latitude
  number | null, // 7  baro_altitude (m)
  boolean, // 8  on_ground
  number | null, // 9  velocity (m/s)
  number | null, // 10 true_track (deg)
  number | null, // 11 vertical_rate (m/s)
  number[] | null, // 12 sensors
  number | null, // 13 geo_altitude (m)
  ...unknown[]
];

interface OpenSkyResponse {
  time: number;
  states: OpenSkyState[] | null;
}

/**
 * Free OpenSky Network provider. No API key required for anonymous use
 * (heavily rate-limited). Good for development.
 */
export class OpenSkyProvider implements FlightProvider {
  readonly name = "opensky";

  async getPositions(bbox: BBox): Promise<Aircraft[]> {
    const url =
      "https://opensky-network.org/api/states/all" +
      `?lamin=${bbox.minLat}&lomin=${bbox.minLon}` +
      `&lamax=${bbox.maxLat}&lomax=${bbox.maxLon}`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      // Always fetch fresh; this is realtime data.
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`OpenSky responded ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as OpenSkyResponse;
    if (!data.states) return [];

    const out: Aircraft[] = [];
    for (const s of data.states) {
      const lon = s[5];
      const lat = s[6];
      if (lon == null || lat == null) continue; // no position fix
      const alt = s[13] ?? s[7];
      out.push({
        id: s[0],
        ident: (s[1] || "").trim() || s[0],
        lat,
        lon,
        heading: s[10] ?? 0,
        altitude: alt == null ? null : Math.round(alt * M_TO_FT),
        groundspeed: s[9] == null ? null : Math.round(s[9] * MS_TO_KT),
        verticalRate: s[11] == null ? null : Math.round(s[11] * MPS_TO_FTMIN),
        onGround: s[8],
        lastSeen: s[4],
      });
    }
    return out;
  }
}
