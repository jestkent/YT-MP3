# Realtime Flight Tracker

A fast, accurate realtime flight tracker web app. Built with **Next.js + MapLibre GL**, powered by **FlightAware AeroAPI** with a free **OpenSky** fallback for development.

See [`PLAN.md`](./PLAN.md) for the full architecture and roadmap.

## Status

- **M0 — Scaffold ✅** Next.js + TypeScript app, full-screen MapLibre dark map.
- **M1 — Data layer ✅** Pluggable `FlightProvider` (`opensky` / `mock` / `flightaware`), `/api/positions?bbox`, aircraft rendered as heading-rotated icons with polling + click popups.
- **M2 — Realtime ✅** Server-side poller fans one upstream fetch per map region out to all clients over SSE (`/api/stream`); client interpolates positions each frame so planes glide smoothly between updates.
- **M3 — FlightAware AeroAPI ✅** Real `flightaware` provider (`/flights/search/positions`, key server-side only) with a monthly request-budget cost guard and automatic fallback to OpenSky/mock when AeroAPI errors or its budget is hit.
- **M4 — Polish (in progress)** Offline vector basemap (real country outlines with no external tiles, so the map always renders); planes colored by altitude with a legend. Next: labels (needs bundled glyphs), clustering at low zoom, mobile layout.

## Offline basemap

`public/world-110m.geojson` (country polygons) ships in the repo so the map
renders land/borders even when raster tiles are slow or blocked. Regenerate it
with:

```bash
node scripts/gen-basemap.mjs   # from world-atlas (devDependency)
```

## Getting started

```bash
npm install
cp .env.example .env.local   # adjust as needed
npm run dev                  # http://localhost:3000
```

The map currently centers on central Europe using a free, no-key CARTO dark basemap.

## Configuration

| Env var            | Description                                                       |
| ------------------ | ----------------------------------------------------------------- |
| `DATA_PROVIDER`    | `opensky` (free, dev) or `flightaware` (AeroAPI, paid).           |
| `AERO_API_KEY`     | FlightAware AeroAPI key. Required only for `flightaware`.          |
| `POLL_INTERVAL_MS` | Upstream poll interval (keep >= 15000 — AeroAPI updates ~1-4x/min).|

> The API key stays **server-side only** — it is never shipped to the browser.

## Architecture (short version)

One long-running Node server polls each in-view map region **once** per interval and
pushes updates to every connected browser over **SSE**, so cost scales with map
regions in view, not with the number of users. Full detail in [`PLAN.md`](./PLAN.md).
