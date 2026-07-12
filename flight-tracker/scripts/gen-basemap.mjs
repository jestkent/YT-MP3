// Generates public/world-110m.geojson from world-atlas (TopoJSON -> GeoJSON).
// Run with: node scripts/gen-basemap.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { feature } from "topojson-client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const topo = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "node_modules", "world-atlas", "countries-110m.json"),
    "utf8"
  )
);
const geojson = feature(topo, topo.objects.countries);
const out = path.join(__dirname, "..", "public", "world-110m.geojson");
fs.writeFileSync(out, JSON.stringify(geojson));
console.log(`wrote ${out} (${geojson.features.length} countries, ${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
