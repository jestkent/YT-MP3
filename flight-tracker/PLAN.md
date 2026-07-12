# Realtime Flight Tracker — Architecture & Plan

> Goal: build the best realtime flight tracker web app — prioritizing **accuracy, speed, and efficiency** — powered by FlightAware **AeroAPI** with a free **OpenSky** fallback for development.

---

## 1. Decisions (locked)

| Area | Choice | Why |
|------|--------|-----|
| **Stack** | Next.js (React) + a **long-running Node server** | One codebase; the Node server holds an in-memory cache + SSE connections (serverless can't). Fast and reliable. |
| **Map** | **MapLibre GL JS** (vector, GPU) | Free vector tiles, smooth zoom, handles thousands of aircraft markers. |
| **Data — prod** | **FlightAware AeroAPI v4** | Accurate, authoritative positions. |
| **Data — dev/fallback** | **OpenSky Network** (free) | Avoids burning AeroAPI credits while building/testing. |
| **Realtime delivery** | **Server-Sent Events (SSE)** | One-way server→client push is all a tracker needs; simpler & more reliable than WebSockets. |
| **v1 scope** | **Live map of aircraft in current viewport, auto-refreshing** | Core feature first. |

---

## 2. The key insight: cost & speed live in the data layer

AeroAPI is **pay-per-request (~$0.05 per positions search)** and refreshes only **1–4×/minute**. Two consequences drive the whole architecture:

1. **Never call AeroAPI from the browser.** The API key stays server-side, and N browsers must not equal N×cost.
2. **Decouple upstream polling from client updates.** A single **background poller** fetches each active map region once per interval; **all** clients viewing that region get the result pushed via SSE. 100 viewers of "over London" = **1** upstream request, not 100.

```
                 ┌──────────────── Browser (MapLibre) ────────────────┐
   SSE stream ◄──┤ subscribes to a region (bounding-box tile)         │
                 └────────────────────────────────────────────────────┘
                                      ▲  push on every refresh
                                      │
        ┌─────────────────────────────────────────────────────────────┐
        │  Node server                                                 │
        │  • Region registry (which tiles have ≥1 viewer)              │
        │  • Background poller (per active tile, every ~15–30s)        │
        │  • In-memory cache (last result + timestamp per tile)        │
        │  • Provider adapter ─┬─ FlightAwareProvider (prod)           │
        │                      └─ OpenSkyProvider (dev/fallback)       │
        └─────────────────────────────────────────────────────────────┘
                                      │  ≤ 1 request / tile / interval
                                      ▼
                       AeroAPI  /flights/search/positions
```

---

## 3. Architecture detail

### 3.1 Provider adapter (pluggable data sources)
A single interface so the rest of the app doesn't care where data comes from:

```ts
interface FlightProvider {
  // returns normalized aircraft inside a bounding box
  getPositions(bbox: BBox): Promise<Aircraft[]>;
}
```

- `FlightAwareProvider` → `GET /flights/search/positions?query=-latlong "minLat minLon maxLat maxLon"`
  (header `x-apikey: <AERO_API_KEY>`).
- `OpenSkyProvider` → `GET /api/states/all?lamin=&lomin=&lamax=&lomax=`.
- Both map their raw payload into one **normalized `Aircraft`** shape:
  `{ id, ident, lat, lon, heading, altitude, groundspeed, origin, destination, aircraftType, lastSeen }`.
- Switch via `DATA_PROVIDER=flightaware|opensky` env var.

### 3.2 Region tiling & dedup
- The world is divided into fixed **bounding-box tiles** (e.g. snap the viewport to a grid).
- Browser sends its visible tiles → server registers a subscriber on each.
- Poller only runs for tiles with **≥1 active subscriber**; stops when the last viewer leaves.
- This bounds cost: cost ≈ (active tiles) × (1 / interval), **independent of user count**.

### 3.3 Caching & polling
- In-memory `Map<tileId, { aircraft, fetchedAt }>`.
- Poll interval **~15–30s** (matches AeroAPI's real update cadence — polling faster wastes money for no new data).
- On poll, diff against last snapshot and push updates over SSE.
- (Later) swap in Redis if we run multiple server instances.

### 3.4 Realtime delivery (SSE)
- `GET /api/stream?tiles=...` opens an SSE connection.
- Server sends an initial snapshot, then incremental updates each poll.
- Client reconciles markers: add new, move existing (animated), remove stale.

### 3.5 Frontend (MapLibre GL)
- Aircraft as a **symbol layer**, icon **rotated by `heading`**, colored by altitude.
- Smooth **interpolated movement** between updates so planes glide instead of jumping (key for the "realtime feel" despite 15–30s data).
- Viewport `moveend` → recompute visible tiles → update SSE subscription.
- Marker clustering / culling at low zoom for performance.

---

## 4. Tech stack summary

- **Frontend:** Next.js (React, TypeScript), MapLibre GL JS, Tailwind for UI.
- **Server:** Next.js custom Node server (long-running) OR a thin standalone Node service; SSE endpoint + background poller.
- **Data:** AeroAPI v4 (prod) / OpenSky (dev) behind one adapter.
- **Config:** `.env` → `AERO_API_KEY`, `DATA_PROVIDER`, `POLL_INTERVAL_MS`.
- **Deploy:** a host that supports long-running Node + SSE (Railway / Render / Fly.io / a VPS). *Note: Vercel serverless is a poor fit for the persistent poller + SSE; use a Node host.*

---

## 5. Build milestones

**M0 — Scaffold**
- Next.js + TS project, MapLibre map renders centered on a default region.
- `.env.example`, README.

**M1 — Data layer (dev on OpenSky, free)**
- `FlightProvider` interface + `OpenSkyProvider`.
- `/api/positions?bbox=` returns normalized aircraft. Render static markers.

**M2 — Realtime**
- Background poller + in-memory cache + region registry.
- `/api/stream` SSE endpoint; client subscribes to visible tiles.
- Planes update live; smooth interpolation between frames.

**M3 — AeroAPI provider**
- `FlightAwareProvider` + provider switch. Verify exact `/flights/search/positions` query syntax & quota handling. Test with a real key.

**M4 — Polish**
- Altitude/heading styling, clustering, basic flight label on hover, error/empty states, mobile layout.

**Future (post-v1):** click-for-details + track line, search by flight/tail/airport, airport boards, historical playback.

---

## 6. Open items to confirm before/at M3
- AeroAPI **tier/quota** on the account (caps how many tiles × how often we can poll).
- Exact positions-search **query syntax & response fields** (validate against live docs with the key).
- Hosting target (affects deploy config).

---

## 7. Risks & mitigations
| Risk | Mitigation |
|------|-----------|
| AeroAPI cost runs away | Tile dedup + viewer-gated polling + 15–30s interval + hard monthly request budget guard. |
| Data only refreshes 1–4×/min feels laggy | Client-side interpolation makes motion smooth between real updates. |
| Serverless can't hold cache/SSE | Deploy as long-running Node (Railway/Render/Fly). |
| Provider outage | Adapter lets us fail over (AeroAPI ↔ OpenSky). |
