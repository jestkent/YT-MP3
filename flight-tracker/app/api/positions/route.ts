import type { NextRequest } from "next/server";
import { getProvider } from "@/lib/providers";
import type { BBox } from "@/lib/types";

// Realtime data — never statically cache this handler.
export const dynamic = "force-dynamic";

function parseBBox(sp: URLSearchParams): BBox | null {
  const minLat = Number(sp.get("minLat"));
  const minLon = Number(sp.get("minLon"));
  const maxLat = Number(sp.get("maxLat"));
  const maxLon = Number(sp.get("maxLon"));
  const all = [minLat, minLon, maxLat, maxLon];
  if (all.some((n) => !Number.isFinite(n))) return null;
  if (minLat >= maxLat || minLon >= maxLon) return null;
  if (minLat < -90 || maxLat > 90 || minLon < -180 || maxLon > 180) return null;
  return { minLat, minLon, maxLat, maxLon };
}

export async function GET(req: NextRequest) {
  const bbox = parseBBox(req.nextUrl.searchParams);
  if (!bbox) {
    return Response.json(
      { error: "Invalid or missing bbox (minLat,minLon,maxLat,maxLon)." },
      { status: 400 }
    );
  }

  const provider = getProvider();
  try {
    const aircraft = await provider.getPositions(bbox);
    return Response.json({
      provider: provider.name,
      count: aircraft.length,
      aircraft,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: `Upstream provider '${provider.name}' failed: ${message}` },
      { status: 502 }
    );
  }
}
