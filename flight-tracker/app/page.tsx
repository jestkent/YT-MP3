import FlightMap from "@/components/FlightMap";

export default function Home() {
  return (
    <main style={{ position: "relative", height: "100%", width: "100%" }}>
      <header
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 10,
          background: "rgba(11, 15, 23, 0.78)",
          backdropFilter: "blur(6px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10,
          padding: "10px 14px",
          pointerEvents: "none",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 0.2 }}>
          ✈ Realtime Flight Tracker
        </div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
          M0 · map scaffold
        </div>
      </header>
      <FlightMap />
    </main>
  );
}
