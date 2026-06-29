import type { NextRequest } from "next/server";
import { getProvider } from "@/lib/providers";
import { parseBBox } from "@/lib/bbox";

// Realtime data — never statically cache this handler.
export const dynamic = "force-dynamic";

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
