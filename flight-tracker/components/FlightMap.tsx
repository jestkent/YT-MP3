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
const POLL_MS = 5000; // raise to >=10000 for live OpenSky to respect rate limits

type Status = {
  provider: string;
  count: number;
  updated: number | null;
  error: string | null;
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
  ctx.moveTo(size / 2, 2); // nose (north)
  ctx.lineTo(size * 0.82, size - 4); // right tail
  ctx.lineTo(size / 2, size * 0.72); // notch
  ctx.lineTo(size * 0.18, size - 4); // left tail
  ctx.closePath();
  ctx.fillStyle = "#ffd23f";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.stroke();
  map.addImage("plane", ctx.getImageData(0, 0, size, size), { pixelRatio: 2 });
}

function toFeatureCollection(aircraft: Aircraft[]) {
  return {
    type: "FeatureCollection" as const,
    features: aircraft.map((a) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [a.lon, a.lat] },
      properties: { ...a },
    })),
  };
}

export default function FlightMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [status, setStatus] = useState<Status>({
    provider: "—",
    count: 0,
    updated: null,
    error: null,
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

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

      async function refresh() {
        const b = map.getBounds();
        const params = new URLSearchParams({
          minLat: String(b.getSouth()),
          minLon: String(b.getWest()),
          maxLat: String(b.getNorth()),
          maxLon: String(b.getEast()),
        });
        try {
          const res = await fetch(`/api/positions?${params}`, { cache: "no-store" });
          const json = await res.json();
          if (cancelled) return;
          if (!res.ok) {
            setStatus((s) => ({ ...s, error: json.error || `HTTP ${res.status}` }));
            return;
          }
          const src = map.getSource("aircraft") as GeoJSONSource | undefined;
          src?.setData(toFeatureCollection(json.aircraft));
          setStatus({
            provider: json.provider,
            count: json.count,
            updated: Date.now(),
            error: null,
          });
        } catch (e) {
          if (!cancelled) {
            setStatus((s) => ({
              ...s,
              error: e instanceof Error ? e.message : "fetch failed",
            }));
          }
        }
      }

      let started = false;
      const setup = () => {
        if (cancelled || started) return;
        // addSource/addLayer throw until the style spec is parsed.
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
            "icon-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              3, 0.5,
              7, 0.8,
              11, 1.15,
            ],
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

        refresh();
        map.on("moveend", refresh);
        timer = setInterval(refresh, POLL_MS);
      };

      // Start as soon as the style spec is parsed. We retry rather than wait
      // for the "load" event, because "load" (and isStyleLoaded) also block on
      // basemap tiles finishing — so aircraft would never appear if tiles are
      // slow or unreachable. addSource throws until the style is ready; retry.
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
      if (timer) clearInterval(timer);
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
          minWidth: 150,
        }}
      >
        <div>
          <span style={{ opacity: 0.6 }}>source</span>{" "}
          <strong>{status.provider}</strong>
        </div>
        <div>
          <span style={{ opacity: 0.6 }}>aircraft</span>{" "}
          <strong>{status.count}</strong>
        </div>
        <div>
          <span style={{ opacity: 0.6 }}>updated</span> {ago}
        </div>
        {status.error && (
          <div style={{ color: "#ff7a7a", marginTop: 4, maxWidth: 220 }}>
            {status.error}
          </div>
        )}
      </div>
    </>
  );
}
