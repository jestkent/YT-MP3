import type { BBox } from "@/lib/types";

/** Parse and validate a bbox from query params; returns null if invalid. */
export function parseBBox(sp: URLSearchParams): BBox | null {
  const minLat = Number(sp.get("minLat"));
  const minLon = Number(sp.get("minLon"));
  const maxLat = Number(sp.get("maxLat"));
  const maxLon = Number(sp.get("maxLon"));
  if ([minLat, minLon, maxLat, maxLon].some((n) => !Number.isFinite(n))) return null;
  if (minLat >= maxLat || minLon >= maxLon) return null;
  if (minLat < -90 || maxLat > 90 || minLon < -180 || maxLon > 180) return null;
  return { minLat, minLon, maxLat, maxLon };
}

/** True if a point lies within the bbox. */
export function contains(bbox: BBox, lat: number, lon: number): boolean {
  return (
    lat >= bbox.minLat &&
    lat <= bbox.maxLat &&
    lon >= bbox.minLon &&
    lon <= bbox.maxLon
  );
}

/**
 * Snap a viewport bbox outward to a fixed-degree grid. Clients viewing nearby
 * areas snap to the same region, so one upstream fetch serves all of them.
 */
export function snapToTile(bbox: BBox, tileDeg: number): BBox {
  const floor = (v: number) => Math.floor(v / tileDeg) * tileDeg;
  const ceil = (v: number) => Math.ceil(v / tileDeg) * tileDeg;
  return {
    minLat: Math.max(-90, floor(bbox.minLat)),
    minLon: Math.max(-180, floor(bbox.minLon)),
    maxLat: Math.min(90, ceil(bbox.maxLat)),
    maxLon: Math.min(180, ceil(bbox.maxLon)),
  };
}

export function tileKey(bbox: BBox): string {
  return `${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon}`;
}
