import { useState, useEffect, useRef } from "react";

const DRYER_MODELS = [
  { id: "whirlpool_wed5000", brand: "Whirlpool", model: "WED5000DW", year: 2021 },
  { id: "lg_dle3400", brand: "LG", model: "DLE3400V", year: 2022 },
  { id: "samsung_dve45", brand: "Samsung", model: "DVE45T6005W", year: 2023 },
  { id: "ge_gtd65", brand: "GE", model: "GTD65EBSJWS", year: 2020 },
  { id: "maytag_med5430", brand: "Maytag", model: "MED5430MW", year: 2022 },
];

const MODEL_TOLERANCES = {
  whirlpool_wed5000: { vibHz: [8, 22], vibAmp: [0.4, 1.8], heatCycle: [180, 220], heatDelta: [15, 35] },
  lg_dle3400:        { vibHz: [10, 25], vibAmp: [0.3, 1.5], heatCycle: [160, 210], heatDelta: [12, 28] },
  samsung_dve45:     { vibHz: [9, 20], vibAmp: [0.5, 2.0], heatCycle: [170, 225], heatDelta: [18, 40] },
  ge_gtd65:          { vibHz: [7, 18], vibAmp: [0.3, 1.6], heatCycle: [165, 215], heatDelta: [14, 32] },
  maytag_med5430:    { vibHz: [11, 24], vibAmp: [0.4, 1.9], heatCycle: [175, 230], heatDelta: [16, 36] },
};

function useSimulatedSensors(running, tolerances) {
  const [vibHz, setVibHz] = useState(0);
  const [vibAmp, setVibAmp] = useState(0);
  const [temp, setTemp] = useState(72);
  const [heaterOn, setHeaterOn] = useState(false);
  const [history, setHistory] = useState([]);
  const tick = useRef(0);
  const heaterPhase = useRef(0);

  useEffect(() => {
    if (!running || !tolerances) return;
    const interval = setInterval(() => {
      tick.current += 1;
      heaterPhase.current += 1;

      const cycleLen = Math.round((tolerances.heatCycle[0] + tolerances.heatCycle[1]) / 2 / 10);
      const on = heaterPhase.current % (cycleLen * 2) < cycleLen;
      setHeaterOn(on);

      const hz = tolerances.vibHz[0] + Math.random() * (tolerances.vibHz[1] - tolerances.vibHz[0]);
      const amp = tolerances.vibAmp[0] + Math.random() * (tolerances.vibAmp[1] - tolerances.vibAmp[0]);
      setVibHz(+hz.toFixed(1));
      setVibAmp(+amp.toFixed(2));

      setTemp(prev => {
        const target = on ? 135 + Math.random() * tolerances.heatDelta[1] : 80 + Math.random() * 10;
        return +(prev + (target - prev) * 0.08 + (Math.random() - 0.5) * 2).toFixed(1);
      });

      setHistory(h => {
        const entry = { t: tick.current, hz: +hz.toFixed(1), amp: +amp.toFixed(2), on };
        return [...h.slice(-59), entry];
      });
    }, 500);
    return () => clearInterval(interval);
  }, [running, tolerances]);

  return { vibHz, vibAmp, temp, heaterOn, history };
}

function MiniSparkline({ data, color, height = 32 }) {
  if (!data.length) return <div style={{ height }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 120, h = height;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function GaugeMeter({ value, min, max, label, unit, color, warn }) {
  const pct = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const angle = -140 + pct * 280;
  const r = 38;
  const cx = 50, cy = 54;
  const toXY = (deg, radius) => {
    const rad = (deg - 90) * Math.PI / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  };
  const arcPath = (startDeg, endDeg, rr) => {
    const [sx, sy] = toXY(startDeg, rr);
    const [ex, ey] = toXY(endDeg, rr);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${sx} ${sy} A ${rr} ${rr} 0 ${large} 1 ${ex} ${ey}`;
  };
  const [nx, ny] = toXY(angle, r - 10);
  const isWarn = warn && (value < min * 1.1 || value > max * 0.9);

  return (
    <div style={{ textAlign: "center", padding: "0 8px" }}>
      <svg width={100} height={70} viewBox="0 0 100 70">
        <path d={arcPath(-140, 140, r)} fill="none" stroke="#1e293b" strokeWidth={6} strokeLinecap="round" />
        <path d={arcPath(-140, -140 + pct * 280, r)} fill="none" stroke={isWarn ? "#f59e0b" : color} strokeWidth={6} strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={isWarn ? "#f59e0b" : "#e2e8f0"} strokeWidth={2} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={3} fill={isWarn ? "#f59e0b" : "#64748b"} />
        <text x={cx} y={cy + 14} textAnchor="middle" fill={isWarn ? "#f59e0b" : "#e2e8f0"} fontSize={9} fontFamily="'DM Mono', monospace">{value}{unit}</text>
      </svg>
      <div style={{ fontSize: 10, color: "#64748b", fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em", marginTop: -6 }}>{label}</div>
    </div>
  );
}

function HardwareDiagram({ selectedModel }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      border: "1px solid #334155",
      borderRadius: 16,
      padding: "24px 20px",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes ripple {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.15em", fontFamily: "'DM Mono', monospace", marginBottom: 16 }}>HARDWARE SCHEMATIC — MVP v0.1</div>

      <div style={{
        border: "2px dashed #334155",
        borderRadius: 12,
        padding: 20,
        position: "relative",
        background: "rgba(15,23,42,0.5)",
      }}>
        <div style={{
          position: "absolute", bottom: -1, left: "50%", transform: "translateX(-50%)",
          background: "#0f172a", padding: "2px 12px",
          border: "1px solid #475569", borderRadius: 4,
          fontSize: 9, color: "#94a3b8", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em",
        }}>NEODYMIUM BASE PLATE</div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div style={{
            background: "#16a34a22",
            border: "1px solid #16a34a66",
            borderRadius: 8,
            padding: "12px 14px",
            minWidth: 100,
            animation: selectedModel ? "slideIn 0.4s ease" : "none",
          }}>
            <div style={{ fontSize: 9, color: "#4ade80", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", marginBottom: 6 }}>RPi ZERO 2W</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {["5V USB-C", "GPIO 4,17,27", "I²C SDA/SCL", "WiFi 2.4G"].map(p => (
                <div key={p} style={{ fontSize: 8, color: "#86efac", fontFamily: "'DM Mono', monospace", display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#4ade80" }} />
                  {p}
                </div>
              ))}
            </div>
          </div>

          <div style={{ color: "#334155", fontSize: 18 }}>⟷</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ background: "#3b82f622", border: "1px solid #3b82f666", borderRadius: 6, padding: "8px 12px" }}>
              <div style={{ fontSize: 9, color: "#93c5fd", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em" }}>ADXL345</div>
              <div style={{ fontSize: 8, color: "#60a5fa", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>3-AXIS VIBRATION · I²C</div>
              <div style={{ fontSize: 7, color: "#475569", fontFamily: "'DM Mono', monospace", marginTop: 1 }}>±16g · 3200Hz SPS</div>
            </div>
            <div style={{ background: "#ef444422", border: "1px solid #ef444466", borderRadius: 6, padding: "8px 12px" }}>
              <div style={{ fontSize: 9, color: "#fca5a5", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em" }}>NTC 10K + ADC</div>
              <div style={{ fontSize: 8, color: "#f87171", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>SURFACE TEMP · GPIO</div>
              <div style={{ fontSize: 7, color: "#475569", fontFamily: "'DM Mono', monospace", marginTop: 1 }}>MCP3008 · -40°C–125°C</div>
            </div>
          </div>

          <div style={{ color: "#334155", fontSize: 18 }}>⟷</div>

          <div style={{ background: "#a855f722", border: "1px solid #a855f766", borderRadius: 6, padding: "8px 12px" }}>
            <div style={{ fontSize: 9, color: "#d8b4fe", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em" }}>USB-C POWER</div>
            <div style={{ fontSize: 8, color: "#c084fc", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>5V · 2.5A</div>
            <div style={{ fontSize: 7, color: "#475569", fontFamily: "'DM Mono', monospace", marginTop: 1 }}>STANDARD CHARGER</div>
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            ["RPi Zero 2W", "$15"],
            ["ADXL345", "$3"],
            ["NTC+MCP3008", "$4"],
            ["Neodymium Plate", "$6"],
            ["PCB + Housing", "$8"],
            ["Total BOM", "~$36"],
          ].map(([item, cost]) => (
            <div key={item} style={{
              background: cost === "~$36" ? "#0f172a" : "transparent",
              border: `1px solid ${cost === "~$36" ? "#64748b" : "#1e293b"}`,
              borderRadius: 4,
              padding: "3px 8px",
              fontSize: 8,
              fontFamily: "'DM Mono', monospace",
              color: cost === "~$36" ? "#e2e8f0" : "#475569",
            }}>
              {item} <span style={{ color: cost === "~$36" ? "#4ade80" : "#64748b" }}>{cost}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DryerSense() {
  const [selectedModel, setSelectedModel] = useState(null);
  const [tolerances, setTolerances] = useState(null);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const { vibHz, vibAmp, temp, heaterOn, history } = useSimulatedSensors(running, tolerances);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!running || !tolerances) return;
    const newAlerts = [];
    if (vibHz < tolerances.vibHz[0] || vibHz > tolerances.vibHz[1]) {
      newAlerts.push({ type: "warn", msg: `Vibration Hz ${vibHz} outside model range [${tolerances.vibHz[0]}–${tolerances.vibHz[1]}]` });
    }
    if (vibAmp > tolerances.vibAmp[1] * 1.2) {
      newAlerts.push({ type: "alert", msg: `High amplitude ${vibAmp}g — possible imbalanced load` });
    }
    if (newAlerts.length) {
      setAlerts(a => [...a.slice(-4), ...newAlerts.map(x => ({ ...x, ts: new Date().toLocaleTimeString() }))]);
    }
  }, [vibHz, vibAmp, running, tolerances]);

  const handleModelSelect = (id) => {
    setSelectedModel(id);
    setTolerances(MODEL_TOLERANCES[id]);
    setRunning(false);
    setAlerts([]);
  };

  const hzHistory = history.map(h => h.hz);
  const ampHistory = history.map(h => h.amp);

  const inSpec = tolerances && running ? (
    vibHz >= tolerances.vibHz[0] && vibHz <= tolerances.vibHz[1] &&
    vibAmp >= tolerances.vibAmp[0] && vibAmp <= tolerances.vibAmp[1]
  ) : null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#020617",
      fontFamily: "'DM Mono', monospace",
      color: "#e2e8f0",
      padding: "0 0 40px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(74,222,128,0.4); }
          70% { box-shadow: 0 0 0 10px rgba(74,222,128,0); }
          100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); }
        }
        @keyframes heat-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .tab-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.1em;
          padding: 8px 16px;
          transition: all 0.2s;
        }
        .tab-btn.active {
          color: #4ade80;
          border-bottom: 2px solid #4ade80;
        }
        .tab-btn:not(.active) {
          color: #475569;
          border-bottom: 2px solid transparent;
        }
        .model-card {
          cursor: pointer;
          border: 1px solid #1e293b;
          border-radius: 8px;
          padding: 10px 14px;
          transition: all 0.2s;
          background: #0f172a;
        }
        .model-card:hover { border-color: #334155; background: #1e293b; }
        .model-card.selected { border-color: #4ade80; background: #16a34a11; }
        .run-btn {
          border: none;
          border-radius: 8px;
          padding: 10px 24px;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: all 0.2s;
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: "linear-gradient(180deg, #0f172a 0%, #020617 100%)",
        borderBottom: "1px solid #1e293b",
        padding: "20px 24px 0",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em" }}>
            DRYER<span style={{ color: "#4ade80" }}>SENSE</span>
          </div>
          <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.15em" }}>PREDICTIVE DIAGNOSTICS · MVP v0.1</div>
        </div>
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #1e293b", marginTop: 12 }}>
          {[
            ["dashboard", "LIVE MONITOR"],
            ["hardware", "HARDWARE"],
            ["tolerances", "TOLERANCES"],
            ["alerts", `ALERTS${alerts.length ? ` (${alerts.length})` : ""}`],
            ["summary", "SUMMARY"],
          ].map(([id, label]) => (
            <button key={id} className={`tab-btn ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 24px", animation: "fadeUp 0.3s ease" }}>

        {/* MODEL SELECTOR */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.15em", marginBottom: 10 }}>SELECT DRYER MODEL</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {DRYER_MODELS.map(m => (
              <div
                key={m.id}
                className={`model-card ${selectedModel === m.id ? "selected" : ""}`}
                onClick={() => handleModelSelect(m.id)}
              >
                <div style={{ fontSize: 9, color: selectedModel === m.id ? "#4ade80" : "#94a3b8", letterSpacing: "0.05em" }}>{m.brand}</div>
                <div style={{ fontSize: 10, color: selectedModel === m.id ? "#e2e8f0" : "#64748b", marginTop: 2 }}>{m.model}</div>
                <div style={{ fontSize: 8, color: "#334155", marginTop: 1 }}>{m.year}</div>
              </div>
            ))}
          </div>
        </div>

        {/* DASHBOARD TAB */}
        {tab === "dashboard" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <button
                className="run-btn"
                disabled={!selectedModel}
                onClick={() => setRunning(r => !r)}
                style={{
                  background: running ? "#ef444422" : selectedModel ? "#16a34a22" : "#1e293b",
                  color: running ? "#fca5a5" : selectedModel ? "#4ade80" : "#475569",
                  border: `1px solid ${running ? "#ef4444" : selectedModel ? "#4ade80" : "#334155"}`,
                  animation: running ? "pulse-ring 2s infinite" : "none",
                }}
              >
                {running ? "⏹ STOP MONITORING" : "▶ START MONITORING"}
              </button>
              {!selectedModel && <div style={{ fontSize: 9, color: "#475569" }}>← select a model first</div>}
              {running && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, color: "#4ade80" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", animation: "pulse-ring 1.5s infinite" }} />
                  LIVE · {history.length} samples
                </div>
              )}
            </div>

            {running && (
              <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                <div style={{
                  flex: 1, minWidth: 120,
                  background: inSpec ? "#16a34a22" : "#ef444422",
                  border: `1px solid ${inSpec ? "#16a34a" : "#ef4444"}`,
                  borderRadius: 8, padding: "12px 16px",
                  display: "flex", flexDirection: "column", gap: 4,
                }}>
                  <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.1em" }}>SYSTEM STATUS</div>
                  <div style={{ fontSize: 14, fontFamily: "'Syne', sans-serif", color: inSpec ? "#4ade80" : "#f87171", fontWeight: 700 }}>
                    {inSpec ? "IN SPEC" : "OUT OF SPEC"}
                  </div>
                </div>
                <div style={{
                  flex: 1, minWidth: 120,
                  background: heaterOn ? "#ef444411" : "#0f172a",
                  border: `1px solid ${heaterOn ? "#ef444488" : "#1e293b"}`,
                  borderRadius: 8, padding: "12px 16px",
                  display: "flex", flexDirection: "column", gap: 4,
                  animation: heaterOn ? "heat-pulse 2s infinite" : "none",
                }}>
                  <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.1em" }}>HEATING ELEMENT</div>
                  <div style={{ fontSize: 14, fontFamily: "'Syne', sans-serif", color: heaterOn ? "#f87171" : "#475569", fontWeight: 700 }}>
                    {heaterOn ? "🔥 ACTIVE" : "○ OFF"}
                  </div>
                </div>
                <div style={{
                  flex: 1, minWidth: 120,
                  background: "#0f172a", border: "1px solid #1e293b",
                  borderRadius: 8, padding: "12px 16px",
                }}>
                  <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.1em", marginBottom: 4 }}>SURFACE TEMP</div>
                  <div style={{ fontSize: 14, fontFamily: "'Syne', sans-serif", color: temp > 120 ? "#f97316" : "#93c5fd", fontWeight: 700 }}>
                    {temp}°F
                  </div>
                </div>
              </div>
            )}

            {running && (
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "16px", marginBottom: 20 }}>
                <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.15em", marginBottom: 12 }}>SENSOR READINGS</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "space-around" }}>
                  <GaugeMeter value={vibHz} min={tolerances?.vibHz[0] * 0.5} max={tolerances?.vibHz[1] * 1.5} label="VIB FREQ" unit="Hz" color="#3b82f6" warn />
                  <GaugeMeter value={vibAmp} min={0} max={tolerances?.vibAmp[1] * 1.5} label="AMPLITUDE" unit="g" color="#a855f7" warn />
                  <GaugeMeter value={temp} min={60} max={180} label="TEMP" unit="°F" color="#ef4444" />
                </div>
              </div>
            )}

            {history.length > 2 && (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 140, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.1em", marginBottom: 6 }}>VIBRATION Hz · LAST 30s</div>
                  <MiniSparkline data={hzHistory} color="#3b82f6" height={36} />
                  <div style={{ fontSize: 8, color: "#334155", marginTop: 4 }}>
                    RANGE [{tolerances?.vibHz[0]}–{tolerances?.vibHz[1]}] Hz
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 140, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.1em", marginBottom: 6 }}>AMPLITUDE · LAST 30s</div>
                  <MiniSparkline data={ampHistory} color="#a855f7" height={36} />
                  <div style={{ fontSize: 8, color: "#334155", marginTop: 4 }}>
                    RANGE [{tolerances?.vibAmp[0]}–{tolerances?.vibAmp[1]}] g
                  </div>
                </div>
              </div>
            )}

            {!running && !selectedModel && (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#334155", fontSize: 11, letterSpacing: "0.1em" }}>
                SELECT A MODEL ABOVE TO BEGIN
              </div>
            )}
          </div>
        )}

        {/* HARDWARE TAB */}
        {tab === "hardware" && <HardwareDiagram selectedModel={selectedModel} />}

        {/* TOLERANCES TAB */}
        {tab === "tolerances" && (
          <div>
            {selectedModel && tolerances ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.15em", marginBottom: 4 }}>
                  MODEL TOLERANCE PROFILE — {DRYER_MODELS.find(m => m.id === selectedModel)?.brand} {DRYER_MODELS.find(m => m.id === selectedModel)?.model}
                </div>
                {[
                  { label: "VIBRATION FREQUENCY", key: "vibHz", unit: "Hz", color: "#3b82f6", desc: "Normal drum rotation vibration band. Outside = bearing wear or imbalance." },
                  { label: "VIBRATION AMPLITUDE", key: "vibAmp", unit: "g", color: "#a855f7", desc: "G-force amplitude of mechanical vibration. Spikes = load imbalance or drum issue." },
                  { label: "HEAT CYCLE DURATION", key: "heatCycle", unit: "sec", color: "#ef4444", desc: "Nominal on/off cycle time for heating element. Long cycles = clogged vent or failing thermostat." },
                  { label: "TEMPERATURE DELTA", key: "heatDelta", unit: "°F", color: "#f97316", desc: "Expected temp rise when element activates. Low delta = element underperforming." },
                ].map(row => (
                  <div key={row.key} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontSize: 9, color: row.color, letterSpacing: "0.1em" }}>{row.label}</div>
                      <div style={{ fontSize: 12, fontFamily: "'Syne', sans-serif", color: "#e2e8f0", fontWeight: 700 }}>
                        {tolerances[row.key][0]}–{tolerances[row.key][1]} <span style={{ fontSize: 9, color: "#64748b" }}>{row.unit}</span>
                      </div>
                    </div>
                    <div style={{ height: 4, background: "#1e293b", borderRadius: 2, marginBottom: 8 }}>
                      <div style={{ height: "100%", width: "60%", background: row.color, borderRadius: 2, opacity: 0.6 }} />
                    </div>
                    <div style={{ fontSize: 8, color: "#475569", lineHeight: 1.5 }}>{row.desc}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#334155", fontSize: 11, letterSpacing: "0.1em" }}>
                SELECT A MODEL TO VIEW TOLERANCES
              </div>
            )}
          </div>
        )}

        {/* SUMMARY TAB */}
        {tab === "summary" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>

            {/* Intro */}
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "20px 22px" }}>
              <div style={{ fontSize: 9, color: "#4ade80", letterSpacing: "0.15em", marginBottom: 10 }}>WHAT IS DRYERSENSE</div>
              <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.8 }}>
                DryerSense is a <span style={{ color: "#e2e8f0" }}>$36 clip-on sensor puck</span> that attaches magnetically to any residential dryer and streams vibration + surface temperature data over WiFi to this dashboard. It uses per-model tolerance profiles to flag early signs of bearing wear, drum imbalance, clogged vents, and failing heating elements — before they become costly repairs.
              </div>
            </div>

            {/* How it works */}
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "20px 22px" }}>
              <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.15em", marginBottom: 16 }}>HOW IT WORKS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {[
                  {
                    step: "01",
                    color: "#3b82f6",
                    title: "Vibration sampling",
                    body: "The ADXL345 accelerometer samples at up to 3200 Hz over I²C. The RPi reads the X/Y/Z axes and computes dominant frequency (via zero-crossing detection) and peak amplitude. Readings are taken every 500 ms and averaged over a 2-second window.",
                  },
                  {
                    step: "02",
                    color: "#ef4444",
                    title: "Temperature sensing",
                    body: "An NTC 10K thermistor bonded to the dryer casing feeds into an MCP3008 8-channel ADC over SPI. The Steinhart–Hart equation converts resistance to °F. Surface temp correlates with heater on/off cycles and is used to detect vent blockages (abnormally long heating cycles).",
                  },
                  {
                    step: "03",
                    color: "#a855f7",
                    title: "On-device processing",
                    body: "A lightweight Python daemon on the RPi Zero 2W classifies each reading against the loaded model tolerance profile. Anomalies are timestamped and queued. The daemon exposes a local WebSocket endpoint — this dashboard connects directly to it on the LAN.",
                  },
                  {
                    step: "04",
                    color: "#f97316",
                    title: "Dashboard & alerts",
                    body: "This React app connects to the WebSocket feed and renders gauges, sparklines, and heater cycle state in real time. Out-of-tolerance readings are surfaced in the Alerts tab. Future: push notifications via Pushover or ntfy.sh when a cycle anomaly is detected.",
                  },
                ].map(({ step, color, title, body }, i, arr) => (
                  <div key={step} style={{ display: "flex", gap: 16, paddingBottom: i < arr.length - 1 ? 16 : 0 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: color + "22", border: `1px solid ${color}66`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 8, color, fontFamily: "'DM Mono', monospace", flexShrink: 0,
                      }}>{step}</div>
                      {i < arr.length - 1 && <div style={{ width: 1, flex: 1, background: "#1e293b", marginTop: 4 }} />}
                    </div>
                    <div style={{ paddingBottom: i < arr.length - 1 ? 4 : 0 }}>
                      <div style={{ fontSize: 10, color: "#e2e8f0", letterSpacing: "0.05em", marginBottom: 6 }}>{title}</div>
                      <div style={{ fontSize: 9, color: "#64748b", lineHeight: 1.7 }}>{body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BOM */}
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "20px 22px" }}>
              <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.15em", marginBottom: 16 }}>BILL OF MATERIALS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {[
                  { item: "Raspberry Pi Zero 2W",  qty: "×1", cost: "$15", color: "#4ade80",  note: "Main compute. WiFi built-in, runs Python 3 daemon." },
                  { item: "ADXL345 breakout",       qty: "×1", cost: "$3",  color: "#3b82f6",  note: "±16g 3-axis accelerometer. I²C, 3.3V." },
                  { item: "NTC 10K thermistor",     qty: "×1", cost: "$1",  color: "#ef4444",  note: "Surface temp probe. Bonded to dryer casing." },
                  { item: "MCP3008 ADC",            qty: "×1", cost: "$3",  color: "#f97316",  note: "8-ch SPI ADC to digitize thermistor output." },
                  { item: "Neodymium base plate",   qty: "×1", cost: "$6",  color: "#94a3b8",  note: "N52 magnet plate. Attaches to any steel dryer body." },
                  { item: "Custom PCB + housing",   qty: "×1", cost: "$8",  color: "#a855f7",  note: "2-layer PCB + printed ABS enclosure, ~60×40×20 mm." },
                  { item: "USB-C cable + charger",  qty: "×1", cost: "$0",  color: "#64748b",  note: "Standard 5V/2.5A. Uses any phone charger." },
                ].map(({ item, qty, cost, color, note }, i, arr) => (
                  <div key={item} style={{
                    display: "flex", alignItems: "flex-start", gap: 12,
                    padding: "12px 0",
                    borderBottom: i < arr.length - 1 ? "1px solid #1e293b" : "none",
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 3 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontSize: 10, color: "#e2e8f0" }}>{item}</span>
                        <span style={{ fontSize: 8, color: "#475569", flexShrink: 0 }}>{qty}</span>
                      </div>
                      <div style={{ fontSize: 8, color: "#64748b", marginTop: 3, lineHeight: 1.5 }}>{note}</div>
                    </div>
                    <div style={{ fontSize: 11, color: cost === "$0" ? "#475569" : "#4ade80", fontFamily: "'Syne', sans-serif", fontWeight: 700, flexShrink: 0, minWidth: 36, textAlign: "right" }}>
                      {cost === "$0" ? "free" : cost}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, padding: "12px 16px", background: "#020617", borderRadius: 8, border: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.1em" }}>TOTAL HARDWARE BOM</div>
                  <div style={{ fontSize: 8, color: "#475569", marginTop: 2 }}>per unit at low volume · excludes charger</div>
                </div>
                <div style={{ fontSize: 20, fontFamily: "'Syne', sans-serif", fontWeight: 800, color: "#4ade80" }}>~$36</div>
              </div>
            </div>

            {/* What it detects */}
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "20px 22px" }}>
              <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.15em", marginBottom: 14 }}>WHAT IT CAN DETECT</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                {[
                  { label: "Worn drum bearings",       signal: "Hz drift low",        color: "#3b82f6" },
                  { label: "Unbalanced load",           signal: "Amplitude spike",     color: "#a855f7" },
                  { label: "Loose or broken belt",      signal: "Hz irregular burst",  color: "#3b82f6" },
                  { label: "Clogged vent / lint trap",  signal: "Long heat cycles",    color: "#ef4444" },
                  { label: "Failing heating element",   signal: "Low temp delta",      color: "#f97316" },
                  { label: "Thermostat overshoot",      signal: "Temp > upper bound",  color: "#f97316" },
                ].map(({ label, signal, color }) => (
                  <div key={label} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 9, color: "#e2e8f0", marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 8, color, fontFamily: "'DM Mono', monospace" }}>↳ {signal}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Next steps */}
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "20px 22px" }}>
              <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.15em", marginBottom: 14 }}>NEXT STEPS / ROADMAP</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  ["Push notifications", "ntfy.sh or Pushover integration when anomaly detected mid-cycle."],
                  ["Cloud logging", "Optional POST to a simple backend (Supabase / PocketBase) for historical trend analysis."],
                  ["Cycle counter", "Track total drum-hours per model for predictive maintenance scheduling."],
                  ["More models", "Expand tolerance DB — data sourced from service manuals and teardown measurements."],
                  ["OTA updates", "Daemon auto-update via GitHub Releases + systemd watchdog on the RPi."],
                ].map(([title, desc]) => (
                  <div key={title} style={{ display: "flex", gap: 10 }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#334155", flexShrink: 0, marginTop: 5 }} />
                    <div>
                      <span style={{ fontSize: 9, color: "#e2e8f0" }}>{title}</span>
                      <span style={{ fontSize: 9, color: "#475569" }}> — {desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ALERTS TAB */}
        {tab === "alerts" && (
          <div>
            <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.15em", marginBottom: 12 }}>ALERT LOG</div>
            {alerts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#334155", fontSize: 11, letterSpacing: "0.1em" }}>
                NO ALERTS — SYSTEM NOMINAL
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[...alerts].reverse().map((a, i) => (
                  <div key={i} style={{
                    background: a.type === "alert" ? "#ef444411" : "#f59e0b11",
                    border: `1px solid ${a.type === "alert" ? "#ef444444" : "#f59e0b44"}`,
                    borderRadius: 8, padding: "10px 14px",
                    display: "flex", gap: 10, alignItems: "flex-start",
                  }}>
                    <div style={{ fontSize: 14, marginTop: -1 }}>{a.type === "alert" ? "⚠" : "○"}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 9, color: a.type === "alert" ? "#fca5a5" : "#fde68a", lineHeight: 1.5 }}>{a.msg}</div>
                      <div style={{ fontSize: 8, color: "#475569", marginTop: 3 }}>{a.ts}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
