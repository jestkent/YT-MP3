"use client";

import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type {
  Map as MapLibreMap,
  GeoJSONSource,
  StyleSpecification,
} from "maplibre-gl";
import type { Aircraft } from "@/lib/types";

// Free, no-API-key dark basemap (CARTO). Swappable later for vector tiles.
const DARK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#0b0f17" } },
    { id: "carto", type: "raster", source: "carto" },
  ],
};

const DEFAULT_CENTER: [number, number] = [8, 49];
const DEFAULT_ZOOM = 5;

type Status = {
  provider: string;
  count: number;
  updated: number | null;
  connected: boolean;
  error: string | null;
};

type StreamSnapshot = {
  provider: string;
  intervalMs: number;
  aircraft: Aircraft[];
};

// Per-aircraft interpolation state: glide from (s) toward (t) starting at `start`.
type Track = {
  cLng: number;
  cLat: number;
  sLng: number;
  sLat: number;
  tLng: number;
  tLat: number;
  start: number;
  heading: number;
  props: Aircraft;
};

/** Draw a north-pointing arrow once and register it as a map icon. */
function addPlaneIcon(map: MapLibreMap) {
  if (map.hasImage("plane")) return;
  const size = 36;
  const cnv = document.createElement("canvas");
  cnv.width = size;
  cnv.height = size;
  const ctx = cnv.getContext("2d");
  if (!ctx) return;
  ctx.beginPath();
  ctx.moveTo(size / 2, 2);
  ctx.lineTo(size * 0.82, size - 4);
  ctx.lineTo(size / 2, size * 0.72);
  ctx.lineTo(size * 0.18, size - 4);
  ctx.closePath();
  ctx.fillStyle = "#ffd23f";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.stroke();
  map.addImage("plane", ctx.getImageData(0, 0, size, size), { pixelRatio: 2 });
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export default function FlightMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [status, setStatus] = useState<Status>({
    provider: "—",
    count: 0,
    updated: null,
    connected: false,
    error: null,
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    let raf = 0;
    let es: EventSource | null = null;
    let resubTimer: ReturnType<typeof setTimeout> | undefined;
    const tracks = new Map<string, Track>();
    let durationMs = 20000;

    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: DARK_STYLE,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        attributionControl: { compact: true },
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

      // Apply a server snapshot: retarget existing tracks, add new, drop gone.
      function applySnapshot(snap: StreamSnapshot) {
        durationMs = Math.max(1000, snap.intervalMs);
        const now = performance.now();
        const seen = new Set<string>();
        for (const a of snap.aircraft) {
          seen.add(a.id);
          const prev = tracks.get(a.id);
          if (prev) {
            prev.sLng = prev.cLng;
            prev.sLat = prev.cLat;
            prev.tLng = a.lon;
            prev.tLat = a.lat;
            prev.start = now;
            prev.heading = a.heading;
            prev.props = a;
          } else {
            tracks.set(a.id, {
              cLng: a.lon, cLat: a.lat,
              sLng: a.lon, sLat: a.lat,
              tLng: a.lon, tLat: a.lat,
              start: now, heading: a.heading, props: a,
            });
          }
        }
        for (const id of tracks.keys()) if (!seen.has(id)) tracks.delete(id);
        setStatus((s) => ({
          ...s,
          provider: snap.provider,
          count: snap.aircraft.length,
          updated: Date.now(),
          error: null,
        }));
      }

      // Animation loop: ease each track from s->t over the poll interval.
      function tick() {
        const now = performance.now();
        const features = [];
        for (const tr of tracks.values()) {
          const t = Math.min(1, (now - tr.start) / durationMs);
          tr.cLng = lerp(tr.sLng, tr.tLng, t);
          tr.cLat = lerp(tr.sLat, tr.tLat, t);
          features.push({
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [tr.cLng, tr.cLat] },
            properties: { ...tr.props, heading: tr.heading },
          });
        }
        const src = map.getSource("aircraft") as GeoJSONSource | undefined;
        src?.setData({ type: "FeatureCollection", features });
        raf = requestAnimationFrame(tick);
      }

      function subscribe() {
        es?.close();
        const b = map.getBounds();
        const params = new URLSearchParams({
          minLat: String(b.getSouth()),
          minLon: String(b.getWest()),
          maxLat: String(b.getNorth()),
          maxLon: String(b.getEast()),
        });
        es = new EventSource(`/api/stream?${params}`);
        es.addEventListener("open", () =>
          setStatus((s) => ({ ...s, connected: true, error: null }))
        );
        es.addEventListener("positions", (ev) => {
          try {
            applySnapshot(JSON.parse((ev as MessageEvent).data));
          } catch {
            /* ignore malformed frame */
          }
        });
        es.addEventListener("error", () =>
          setStatus((s) => ({ ...s, connected: false }))
        );
      }

      let started = false;
      const setup = () => {
        if (cancelled || started) return;
        if (!map.getStyle()) throw new Error("style not ready");
        started = true;
        addPlaneIcon(map);
        map.addSource("aircraft", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "aircraft",
          type: "symbol",
          source: "aircraft",
          layout: {
            "icon-image": "plane",
            "icon-rotate": ["get", "heading"],
            "icon-rotation-alignment": "map",
            "icon-allow-overlap": true,
            "icon-size": ["interpolate", ["linear"], ["zoom"], 3, 0.5, 7, 0.8, 11, 1.15],
          },
        });

        map.on("click", "aircraft", (e) => {
          const f = e.features?.[0];
          if (!f) return;
          const p = f.properties as Aircraft;
          new maplibregl.Popup({ closeButton: true, offset: 12 })
            .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
            .setHTML(
              `<div style="font:13px system-ui;color:#111">
                 <strong>${p.ident}</strong> · ${p.aircraftType ?? ""}<br/>
                 Alt: ${p.altitude ?? "?"} ft &nbsp; Spd: ${p.groundspeed ?? "?"} kt<br/>
                 Hdg: ${Math.round(p.heading)}°
               </div>`
            )
            .addTo(map);
        });
        map.on("mouseenter", "aircraft", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "aircraft", () => {
          map.getCanvas().style.cursor = "";
        });

        subscribe();
        map.on("moveend", () => {
          if (resubTimer) clearTimeout(resubTimer);
          resubTimer = setTimeout(subscribe, 300);
        });
        raf = requestAnimationFrame(tick);
      };

      // Start once the style spec is parsed, independent of basemap tiles.
      const startWhenReady = (attempt = 0) => {
        if (cancelled || started) return;
        try {
          setup();
        } catch {
          if (attempt < 60) setTimeout(() => startWhenReady(attempt + 1), 150);
        }
      };
      map.on("load", () => startWhenReady());
      startWhenReady();
    })();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      if (resubTimer) clearTimeout(resubTimer);
      es?.close();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const ago =
    status.updated != null
      ? `${Math.max(0, Math.round((Date.now() - status.updated) / 1000))}s ago`
      : "—";

  return (
    <>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      <div
        style={{
          position: "absolute",
          top: 70,
          left: 12,
          zIndex: 10,
          background: "rgba(11,15,23,0.78)",
          backdropFilter: "blur(6px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10,
          padding: "8px 12px",
          fontSize: 12,
          lineHeight: 1.5,
          minWidth: 160,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: status.connected ? "#3ddc84" : "#ff7a7a",
              boxShadow: status.connected ? "0 0 6px #3ddc84" : "none",
            }}
          />
          <span style={{ opacity: 0.6 }}>stream</span>{" "}
          <strong>{status.connected ? "live" : "offline"}</strong>
        </div>
        <div>
          <span style={{ opacity: 0.6 }}>source</span> <strong>{status.provider}</strong>
        </div>
        <div>
          <span style={{ opacity: 0.6 }}>aircraft</span> <strong>{status.count}</strong>
        </div>
        <div>
          <span style={{ opacity: 0.6 }}>updated</span> {ago}
        </div>
        {status.error && (
          <div style={{ color: "#ff7a7a", marginTop: 4, maxWidth: 220 }}>{status.error}</div>
        )}
      </div>
    </>
  );
}
