import type { NextRequest } from "next/server";
import { streamManager, type Snapshot } from "@/lib/stream/manager";
import { parseBBox } from "@/lib/bbox";

export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 25000;

export async function GET(req: NextRequest) {
  const bbox = parseBBox(req.nextUrl.searchParams);
  if (!bbox) {
    return Response.json(
      { error: "Invalid or missing bbox (minLat,minLon,maxLat,maxLon)." },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      const send = (snap: Snapshot) =>
        safeEnqueue(`event: positions\ndata: ${JSON.stringify(snap)}\n\n`);

      unsubscribe = streamManager.subscribe(bbox, send);
      safeEnqueue(`: connected\n\n`);
      heartbeat = setInterval(() => safeEnqueue(`: ping\n\n`), HEARTBEAT_MS);

      const close = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe?.();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      req.signal.addEventListener("abort", close);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
