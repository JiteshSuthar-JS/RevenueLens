import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import sampleData from "../assets/sampleForecast.json";

// ─── Format Currency Helper ────────────────────────────────────
const fmt = (n) => {
  if (!n && n !== 0) return "—";
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
};

// ─── High-Precision Interactive Forecast Line Chart ─────────────
const InteractiveForecastChart = ({
  actual = [],
  forecast = [],
  labels = [],
  dailyData = [],
  viewMode = "monthly", // "monthly" | "daily"
  height = 240,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const W = 760;
  const H = height;
  const pad = { t: 28, b: 36, l: 56, r: 24 };

  if (viewMode === "daily") {
    if (!dailyData || dailyData.length === 0) return null;
    const uppers = dailyData.map((d) => d.upper_bound || d.value * 1.15);
    const lowers = dailyData.map((d) => d.lower_bound || d.value * 0.85);

    const min = Math.max(0, Math.min(...lowers) * 0.85);
    const max = Math.max(...uppers) * 1.12;

    const n = dailyData.length;
    const toX = (i) => pad.l + (i / (n - 1)) * (W - pad.l - pad.r);
    const toY = (v) => H - pad.b - ((v - min) / (max - min || 1)) * (H - pad.t - pad.b);

    const pts = dailyData.map((d, i) => `${toX(i)},${toY(d.value)}`).join(" ");

    // Confidence area
    const upperPts = uppers.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
    const lowerPts = [...lowers].reverse().map((v, i) => `${toX(n - 1 - i)},${toY(v)}`).join(" ");
    const bandPath = `M${upperPts.split(" ")[0]} L${upperPts} L${lowerPts} Z`;

    const activeItem = hoveredIdx !== null ? dailyData[hoveredIdx] : null;

    return (
      <div style={{ position: "relative", width: "100%" }}>
        <svg
          width="100%"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          onMouseLeave={() => setHoveredIdx(null)}
          style={{ overflow: "visible" }}
        >
          <defs>
            <linearGradient id="dailyBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.03" />
            </linearGradient>
            <linearGradient id="dailyLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const yVal = min + (1 - pct) * (max - min);
            const yPos = pad.t + pct * (H - pad.t - pad.b);
            return (
              <g key={idx}>
                <line x1={pad.l} x2={W - pad.r} y1={yPos} y2={yPos} stroke="#f1f5f9" strokeWidth="1" />
                <text x={pad.l - 8} y={yPos + 3.5} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="'Space Mono', monospace">
                  {fmt(yVal)}
                </text>
              </g>
            );
          })}

          {/* Confidence interval band */}
          <path d={bandPath} fill="url(#dailyBand)" />

          {/* Forecast path */}
          <polyline
            points={pts}
            fill="none"
            stroke="url(#dailyLineGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive vertical hover indicator */}
          {hoveredIdx !== null && (
            <line
              x1={toX(hoveredIdx)}
              x2={toX(hoveredIdx)}
              y1={pad.t}
              y2={H - pad.b}
              stroke="#7c3aed"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
          )}

          {/* Data points & hit areas */}
          {dailyData.map((d, i) => {
            const cx = toX(i);
            const cy = toY(d.value);
            const isHovered = hoveredIdx === i;
            return (
              <g key={i}>
                <rect
                  x={cx - (W / n) / 2}
                  y={pad.t}
                  width={W / n}
                  height={H - pad.t - pad.b}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIdx(i)}
                  style={{ cursor: "pointer" }}
                />
                {(isHovered || i % 5 === 0 || i === n - 1) && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? "5" : "3"}
                    fill={isHovered ? "#7c3aed" : "#fff"}
                    stroke="#7c3aed"
                    strokeWidth={isHovered ? "2.5" : "2"}
                  />
                )}
                {/* X-axis labels every 5 days */}
                {(i % 5 === 0 || i === n - 1) && (
                  <text
                    x={cx}
                    y={H - 12}
                    textAnchor="middle"
                    fontSize="9.5"
                    fill="#64748b"
                    fontFamily="'DM Sans', sans-serif"
                    fontWeight="500"
                  >
                    {d.date.slice(5)} ({d.day_name})
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {activeItem && hoveredIdx !== null && (
          <div
            style={{
              position: "absolute",
              top: "8px",
              left: `${Math.min(Math.max((toX(hoveredIdx) / W) * 100, 15), 85)}%`,
              transform: "translateX(-50%)",
              background: "rgba(15, 23, 42, 0.94)",
              color: "#fff",
              padding: "7px 12px",
              borderRadius: "8px",
              boxShadow: "0 6px 20px rgba(0,0,0,0.22)",
              pointerEvents: "none",
              fontSize: "11px",
              fontFamily: "'DM Sans', sans-serif",
              zIndex: 10,
              whiteSpace: "nowrap",
              backdropFilter: "blur(6px)",
            }}
          >
            <div style={{ color: "#94a3b8", fontSize: "10px", marginBottom: "2px" }}>
              {activeItem.date} · {activeItem.day_name} (Predicted Daily Revenue)
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: "700", fontSize: "13px", color: "#a78bfa" }}>
              {fmt(activeItem.value)}
            </div>
            <div style={{ color: "#cbd5e1", fontSize: "9.5px", marginTop: "2px" }}>
              80% Range: {fmt(activeItem.lower_bound)} – {fmt(activeItem.upper_bound)}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Monthly View ──────────────────────────────────────────────
  const allVals = [...actual.filter((v) => v !== undefined), ...forecast.filter((v) => v !== undefined)];
  if (allVals.length === 0) return null;

  const min = Math.max(0, Math.min(...allVals) * 0.8);
  const max = Math.max(...allVals) * 1.15;

  const totalPts = labels.length;
  const toX = (i) => pad.l + (i / (totalPts - 1)) * (W - pad.l - pad.r);
  const toY = (v) => H - pad.b - ((v - min) / (max - min || 1)) * (H - pad.t - pad.b);
  const splitIdx = actual.length - 1;

  const actualPts = actual.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const forecastPts = [
    `${toX(splitIdx)},${toY(actual[splitIdx])}`,
    ...forecast.map((v, i) => `${toX(splitIdx + 1 + i)},${toY(v)}`),
  ].join(" ");

  const actualArea = `M${toX(0)},${H - pad.b} ${actual.map((v, i) => `L${toX(i)},${toY(v)}`).join(" ")} L${toX(splitIdx)},${H - pad.b} Z`;
  const forecastArea = `M${toX(splitIdx)},${H - pad.b} L${toX(splitIdx)},${toY(actual[splitIdx])} ${forecast.map((v, i) => `L${toX(splitIdx + 1 + i)},${toY(v)}`).join(" ")} L${toX(totalPts - 1)},${H - pad.b} Z`;

  const hoveredVal =
    hoveredIdx !== null
      ? hoveredIdx <= splitIdx
        ? actual[hoveredIdx]
        : forecast[hoveredIdx - splitIdx - 1]
      : null;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        onMouseLeave={() => setHoveredIdx(null)}
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="gradForecast" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines & Y labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const yVal = min + (1 - pct) * (max - min);
          const yPos = pad.t + pct * (H - pad.t - pad.b);
          return (
            <g key={idx}>
              <line x1={pad.l} x2={W - pad.r} y1={yPos} y2={yPos} stroke="#f1f5f9" strokeWidth="1" />
              <text x={pad.l - 8} y={yPos + 3.5} textAnchor="end" fontSize="9.5" fill="#94a3b8" fontFamily="'Space Mono', monospace">
                {fmt(yVal)}
              </text>
            </g>
          );
        })}

        {/* Forecast threshold dividing line */}
        <line
          x1={toX(splitIdx)}
          y1={pad.t}
          x2={toX(splitIdx)}
          y2={H - pad.b}
          stroke="#cbd5e1"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        <text
          x={toX(splitIdx) + 6}
          y={pad.t + 12}
          fontSize="9"
          fill="#7c3aed"
          fontWeight="700"
          fontFamily="'Space Mono', monospace"
        >
          AI FORECAST →
        </text>

        {/* Area Fills */}
        <path d={actualArea} fill="url(#gradActual)" />
        <path d={forecastArea} fill="url(#gradForecast)" />

        {/* Lines */}
        <polyline
          points={actualPts}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={forecastPts}
          fill="none"
          stroke="#7c3aed"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="7 4"
        />

        {/* Hover vertical line */}
        {hoveredIdx !== null && (
          <line
            x1={toX(hoveredIdx)}
            x2={toX(hoveredIdx)}
            y1={pad.t}
            y2={H - pad.b}
            stroke={hoveredIdx <= splitIdx ? "#2563eb" : "#7c3aed"}
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        )}

        {/* Data points & hit zones */}
        {labels.map((l, i) => {
          const isActual = i <= splitIdx;
          const val = isActual ? actual[i] : forecast[i - splitIdx - 1];
          const cx = toX(i);
          const cy = toY(val);
          const isHovered = hoveredIdx === i;

          return (
            <g key={i}>
              <rect
                x={cx - (W / totalPts) / 2}
                y={pad.t}
                width={W / totalPts}
                height={H - pad.t - pad.b}
                fill="transparent"
                onMouseEnter={() => setHoveredIdx(i)}
                style={{ cursor: "pointer" }}
              />
              <circle
                cx={cx}
                cy={cy}
                r={isHovered ? "6" : "4"}
                fill={isActual ? (isHovered ? "#1d4ed8" : "#2563eb") : isHovered ? "#7c3aed" : "#fff"}
                stroke={isActual ? "#fff" : "#7c3aed"}
                strokeWidth={isActual ? "2" : "2.5"}
              />
              <text
                x={cx}
                y={H - 12}
                textAnchor="middle"
                fontSize="10"
                fill={isActual ? "#64748b" : "#7c3aed"}
                fontFamily="'DM Sans', sans-serif"
                fontWeight={isActual ? "500" : "700"}
              >
                {l}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Hover Tooltip */}
      {hoveredVal !== null && hoveredIdx !== null && (
        <div
          style={{
            position: "absolute",
            top: "8px",
            left: `${Math.min(Math.max((toX(hoveredIdx) / W) * 100, 15), 85)}%`,
            transform: "translateX(-50%)",
            background: "rgba(15, 23, 42, 0.94)",
            color: "#fff",
            padding: "8px 14px",
            borderRadius: "8px",
            boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
            pointerEvents: "none",
            fontSize: "11.5px",
            fontFamily: "'DM Sans', sans-serif",
            zIndex: 10,
            whiteSpace: "nowrap",
            backdropFilter: "blur(6px)",
          }}
        >
          <div style={{ color: "#94a3b8", fontSize: "10px", marginBottom: "2px" }}>
            {labels[hoveredIdx]} · {hoveredIdx <= splitIdx ? "Actual Monthly Revenue" : "AI Forecast Projection"}
          </div>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontWeight: "700",
              fontSize: "14px",
              color: hoveredIdx <= splitIdx ? "#60a5fa" : "#c084fc",
            }}
          >
            {fmt(hoveredVal)}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Mini Product Sparkline ────────────────────────────────────
const ProductLineChart = ({ actual = [], forecast = [], color = "#2563eb" }) => {
  const W = 220;
  const H = 64;
  const nonZero = actual.filter((v) => v > 0);
  if (nonZero.length < 2) {
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <text x={W / 2} y={H / 2 + 4} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="'DM Sans',sans-serif">
          Limited historical cadence
        </text>
      </svg>
    );
  }

  const all = [...actual, ...forecast].filter((v) => v > 0);
  const min = Math.min(...all) * 0.85;
  const max = Math.max(...all) * 1.15;
  const totalPts = actual.length + forecast.length;
  const toX = (i) => 6 + (i / (totalPts - 1)) * (W - 12);
  const toY = (v) => H - 10 - ((v - min) / (max - min || 1)) * (H - 20);
  const splitIdx = actual.length - 1;

  const aPts = actual.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const fPts = [
    `${toX(splitIdx)},${toY(actual[splitIdx])}`,
    ...forecast.map((v, i) => `${toX(splitIdx + 1 + i)},${toY(v)}`),
  ].join(" ");

  const aArea = `M${toX(0)},${H - 6} ${actual.map((v, i) => `L${toX(i)},${toY(v)}`).join(" ")} L${toX(splitIdx)},${H - 6} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`pa_${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={aArea} fill={`url(#pa_${color.replace("#", "")})`} />
      <polyline points={aPts} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline
        points={fPts}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="5 3"
        opacity="0.6"
      />
      {actual.map((v, i) => (
        <circle key={i} cx={toX(i)} cy={toY(v)} r="2" fill={color} stroke="#fff" strokeWidth="1" />
      ))}
      {forecast.map((v, i) => (
        <circle key={i} cx={toX(splitIdx + 1 + i)} cy={toY(v)} r="3" fill="#fff" stroke={color} strokeWidth="2" />
      ))}
    </svg>
  );
};

// ─── Counter Component ──────────────────────────────────────────
const Counter = ({ value = 0, prefix = "", suffix = "" }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    let s = 0;
    const step = (value || 0) / 45;
    const t = setInterval(() => {
      s += step;
      if (s >= value) {
        setN(value);
        clearInterval(t);
      } else {
        setN(Math.floor(s));
      }
    }, 16);
    return () => clearInterval(t);
  }, [value]);

  return <span>{prefix}{fmt(n).replace("₹", "")}{suffix}</span>;
};

// ─── MAIN DASHBOARD ─────────────────────────────────────────────
const Dashboard = () => {
  const stored = localStorage.getItem("user");
  const user = stored ? JSON.parse(stored) : { name: "User" };
  const firstName = user.name?.split(" ")[0] || "User";
  const navigate = useNavigate();

  const [show, setShow] = useState(false);
  const [viewMode, setViewMode] = useState("monthly"); // "monthly" | "daily"
  const [results, setResults] = useState(() => {
    try {
      const saved = localStorage.getItem("forecastResults");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 60);
    return () => clearTimeout(timer);
  }, []);

  const loadDemoData = () => {
    localStorage.setItem("forecastResults", JSON.stringify(sampleData));
    setResults(sampleData);
  };

  const hasData = !!results;
  const now = new Date();
  const COLORS = ["#2563eb", "#7c3aed", "#0891b2", "#f59e0b", "#16a34a", "#dc2626", "#ea580c"];

  // Prepare chart series
  const mainChartData = () => {
    if (!results) return { actual: [], forecast: [], labels: [] };
    const actual = results.last6_actual || [];
    const forecastVals = results.forecast_3m || [results.next_month_total || results.total_forecast || 0];
    const aLabels = (results.last6_labels || []).map((l) => l.slice(-7));
    const fLabels = results.forecast_3m_lb ? results.forecast_3m_lb.map((l) => l.slice(-7)) : [results.next_month_label?.slice(-7) || "Next"];

    return {
      actual,
      forecast: forecastVals,
      labels: [...aLabels, ...fLabels],
      dailyData: results.future_30days || [],
    };
  };

  const chart = mainChartData();
  const products = results?.products || [];

  const kpis = hasData
    ? [
        {
          lbl: "Total Revenue Recorded",
          val: results.total_actual,
          color: "#2563eb",
          prefix: "₹",
          suffix: "",
          change: "Historical Actuals",
          icon: "📈",
        },
        {
          lbl: "Next Month Forecast",
          val: results.next_month_total || results.total_forecast || 0,
          color: "#7c3aed",
          prefix: "₹",
          suffix: "",
          change: `${results.growth_rate !== undefined ? (results.growth_rate >= 0 ? `+${results.growth_rate}%` : `${results.growth_rate}%`) : "AI Projected"} vs Last Mo`,
          icon: "🎯",
        },
        {
          lbl: "Validated Model Accuracy",
          val: results.accuracy,
          color: "#16a34a",
          prefix: "",
          suffix: "%",
          change: results.metrics?.model_type ? "Ensemble Regressor" : "High Confidence",
          icon: "⚡",
        },
      ]
    : [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        .db{min-height:100vh;background:#f0f2f8;font-family:'DM Sans',sans-serif;padding:84px 28px 52px;}
        .db-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px;opacity:0;transform:translateY(10px);transition:opacity .5s,transform .5s;}
        .db-hdr.s{opacity:1;transform:none;}
        .db-greet{font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:.12em;text-transform:uppercase;margin-bottom:3px;}
        .db-h1{font-family:'Space Mono',monospace;font-size:22px;font-weight:700;color:#0f172a;}
        .db-h1 .b{color:#2563eb} .db-h1 .v{color:#7c3aed}
        .db-dt{font-size:12px;color:#64748b;margin-top:3px;}
        .db-hdr-r{display:flex;align-items:center;gap:10px;}
        .db-live{display:flex;align-items:center;gap:7px;padding:7px 14px;background:#fff;border:1px solid #e2e8f4;border-radius:20px;font-size:11px;font-weight:600;color:#374151;font-family:'Space Mono',monospace;}
        .pulse-dot{width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.2);animation:pdot 2s infinite;}
        @keyframes pdot{0%,100%{opacity:1}50%{opacity:.4}}
        .db-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:9px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all .2s;}
        .db-btn-p{background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;box-shadow:0 4px 14px rgba(37,99,235,.28);}
        .db-btn-p:hover{opacity:.92;transform:translateY(-1px);}
        .db-btn-sec{background:#fff;border:1px solid #cbd5e1;color:#334155;}
        .db-btn-sec:hover{background:#f8fafc;border-color:#94a3b8;}
        .db-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px;}
        .db-kpi{background:#fff;border:1px solid #e8edf6;border-radius:16px;padding:20px;opacity:0;transform:translateY(16px);transition:opacity .5s,transform .5s,box-shadow .2s;position:relative;overflow:hidden;}
        .db-kpi.s{opacity:1;transform:none;}
        .db-kpi:hover{box-shadow:0 8px 28px rgba(15,23,42,.09);transform:translateY(-2px);}
        .db-kpi-bar{position:absolute;top:0;left:0;right:0;height:3.5px;border-radius:16px 16px 0 0;}
        .db-kpi-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
        .db-kpi-lbl{font-size:11.5px;font-weight:600;color:#94a3b8;letter-spacing:.04em;text-transform:uppercase;}
        .db-kpi-val{font-family:'Space Mono',monospace;font-size:27px;font-weight:700;letter-spacing:-.02em;line-height:1.15;}
        .db-kpi-foot{display:flex;justify-content:space-between;align-items:center;margin-top:10px;}
        .db-kpi-chg{font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;}
        .db-panel{background:#fff;border:1px solid #e8edf6;border-radius:16px;padding:22px;opacity:0;transform:translateY(16px);transition:opacity .5s,transform .5s,box-shadow .2s;margin-bottom:16px;}
        .db-panel.s{opacity:1;transform:none;}
        .db-panel:hover{box-shadow:0 6px 24px rgba(15,23,42,.07);}
        .db-ph{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:10px;}
        .db-pt{font-family:'Space Mono',monospace;font-size:14px;font-weight:700;color:#0f172a;}
        .db-ps{font-size:12px;color:#94a3b8;margin-top:3px;}
        .view-toggle{display:inline-flex;padding:3px;background:#f1f5f9;border-radius:8px;}
        .view-btn{padding:5px 12px;border:none;background:transparent;border-radius:6px;font-size:11.5px;font-weight:600;color:#64748b;cursor:pointer;transition:all .2s;font-family:'DM Sans',sans-serif;}
        .view-btn.active{background:#fff;color:#0f172a;box-shadow:0 1px 3px rgba(0,0,0,.08);}
        .db-leg{display:flex;gap:20px;margin-bottom:14px;align-items:center;flex-wrap:wrap;}
        .db-leg-i{display:flex;align-items:center;gap:7px;font-size:12px;color:#64748b;}
        .db-leg-line{width:18px;height:3px;border-radius:2px;background:#2563eb;}
        .db-leg-dash{width:18px;height:3px;background:repeating-linear-gradient(90deg,#7c3aed 0,#7c3aed 5px,transparent 5px,transparent 9px);}
        .db-next-bars{display:flex;flex-direction:column;gap:12px;}
        .db-next-bar-item{display:flex;align-items:center;gap:12px;}
        .db-next-bar-lbl{font-size:12.5px;font-weight:600;color:#334155;min-width:130px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .db-next-bar-track{flex:1;height:10px;background:#f1f5f9;border-radius:5px;overflow:hidden;}
        .db-next-bar-fill{height:100%;border-radius:5px;transition:width 1s cubic-bezier(.34,1.56,.64,1);}
        .db-next-bar-val{font-family:'Space Mono',monospace;font-size:12px;font-weight:700;min-width:68px;text-align:right;}
        .db-prod-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
        .db-prod-card{background:#fff;border:1px solid #e8edf6;border-radius:14px;padding:18px;opacity:0;transform:translateY(14px);transition:opacity .5s,transform .5s,box-shadow .2s;}
        .db-prod-card.s{opacity:1;transform:none;}
        .db-prod-card:hover{box-shadow:0 6px 20px rgba(15,23,42,.08);transform:translateY(-2px);}
        .db-prod-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
        .db-prod-name{font-size:14px;font-weight:700;color:#0f172a;}
        .db-prod-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}
        .db-prod-nums{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;}
        .db-prod-num{background:#f8fafc;border-radius:8px;padding:10px;}
        .db-prod-num-val{font-family:'Space Mono',monospace;font-size:15px;font-weight:700;}
        .db-prod-num-lbl{font-size:10px;color:#94a3b8;margin-top:2px;text-transform:uppercase;letter-spacing:.04em;}
        .db-stock{background:linear-gradient(135deg,rgba(245,158,11,.08),rgba(234,88,12,.06));border:1px solid rgba(245,158,11,.22);border-radius:8px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
        .db-stock-lbl{font-size:11.5px;color:#92400e;font-weight:600;}
        .db-stock-val{font-family:'Space Mono',monospace;font-size:13.5px;font-weight:700;color:#d97706;}
        .db-prod-acc{display:flex;align-items:center;gap:8px;}
        .db-prod-acc-tr{flex:1;height:5px;background:#f1f5f9;border-radius:3px;overflow:hidden;}
        .db-prod-acc-fl{height:100%;border-radius:3px;}
        .db-prod-acc-v{font-size:11px;font-weight:700;font-family:'Space Mono',monospace;min-width:34px;text-align:right;}
        .db-empty{text-align:center;padding:64px 24px;}
        .db-empty-emoji{font-size:52px;margin-bottom:16px;}
        .db-empty-title{font-family:'Space Mono',monospace;font-size:19px;font-weight:700;color:#0f172a;margin-bottom:8px;}
        .db-empty-sub{font-size:14px;color:#64748b;margin-bottom:28px;line-height:1.7;}
        @media(max-width:1200px){.db-prod-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:1100px){.db-kpis{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:720px){.db-prod-grid{grid-template-columns:1fr}.db{padding:84px 14px 40px}.db-kpis{grid-template-columns:1fr}}
      `}</style>

      <div className="db">
        {/* Header */}
        <div className={`db-hdr ${show ? "s" : ""}`}>
          <div>
            <p className="db-greet">Revenue Intelligence & Forecasting</p>
            <h1 className="db-h1">
              Hello, <span className="b">{firstName}</span> <span className="v">👋</span>
            </h1>
            <p className="db-dt">
              {now.toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="db-hdr-r">
            <div className="db-live">
              <span className="pulse-dot" />
              LIVE · {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </div>
            {hasData && (
              <button className="db-btn db-btn-sec" onClick={() => navigate("/reports")}>
                📊 View Full Report
              </button>
            )}
            <button className="db-btn db-btn-p" onClick={() => navigate("/upload")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {hasData ? "Upload New Dataset" : "Upload & Forecast"}
            </button>
          </div>
        </div>

        {/* Empty State with Demo Option */}
        {!hasData && (
          <div className={`db-panel ${show ? "s" : ""}`} style={{ transitionDelay: ".2s" }}>
            <div className="db-empty">
              <div className="db-empty-emoji">📊</div>
              <div className="db-empty-title">No Forecast Data Loaded Yet</div>
              <div className="db-empty-sub">
                Upload your transaction or sales CSV/Excel file to generate high-accuracy ML forecasts,
                <br />
                or test immediately using the verified sample demo dataset.
              </div>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                <button className="db-btn db-btn-p" onClick={() => navigate("/upload")}>
                  Upload Your Sales CSV
                </button>
                <button className="db-btn db-btn-sec" onClick={loadDemoData}>
                  ✨ Explore Sample Demo Data
                </button>
              </div>
            </div>
          </div>
        )}

        {hasData && (
          <>
            {/* KPI Cards */}
            <div className="db-kpis">
              {kpis.map((k, i) => (
                <div key={i} className={`db-kpi ${show ? "s" : ""}`} style={{ transitionDelay: `${0.1 + i * 0.07}s` }}>
                  <div className="db-kpi-bar" style={{ background: `linear-gradient(90deg, ${k.color}, ${k.color}66)` }} />
                  <div className="db-kpi-top">
                    <span className="db-kpi-lbl">{k.lbl}</span>
                    <span style={{ fontSize: "16px" }}>{k.icon}</span>
                  </div>
                  <div className="db-kpi-val" style={{ color: k.color }}>
                    <Counter value={k.val || 0} prefix={k.prefix} suffix={k.suffix} />
                  </div>
                  <div className="db-kpi-foot">
                    <span
                      className="db-kpi-chg"
                      style={{
                        background: k.color === "#16a34a" ? "#f0fdf4" : k.color === "#7c3aed" ? "#faf5ff" : "#eff6ff",
                        color: k.color,
                      }}
                    >
                      {k.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Main Interactive Forecast Chart */}
            <div className={`db-panel ${show ? "s" : ""}`} style={{ transitionDelay: ".3s" }}>
              <div className="db-ph">
                <div>
                  <div className="db-pt">
                    {viewMode === "monthly"
                      ? "Revenue Trajectory — Actuals vs AI Forecast"
                      : "Daily Revenue Breakdown (Next 30 Days Forecast)"}
                  </div>
                  <div className="db-ps">
                    {viewMode === "monthly"
                      ? "Solid blue line = verified monthly sales · Dashed purple line = Ridge + GBR ensemble projection"
                      : "30-day continuous forecast curve with 80% confidence interval band"}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div className="view-toggle">
                    <button
                      className={`view-btn ${viewMode === "monthly" ? "active" : ""}`}
                      onClick={() => setViewMode("monthly")}
                    >
                      📅 Monthly View
                    </button>
                    <button
                      className={`view-btn ${viewMode === "daily" ? "active" : ""}`}
                      onClick={() => setViewMode("daily")}
                    >
                      📈 30-Day Daily
                    </button>
                  </div>
                </div>
              </div>

              {viewMode === "monthly" ? (
                <div className="db-leg">
                  <div className="db-leg-i">
                    <div className="db-leg-line" />
                    Actual Monthly Revenue
                  </div>
                  <div className="db-leg-i">
                    <div className="db-leg-dash" />
                    AI Multi-Month Forecast
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: "11px", color: "#64748b" }}>
                    Hover over any point to inspect exact monthly totals & growth
                  </div>
                </div>
              ) : (
                <div className="db-leg">
                  <div className="db-leg-i">
                    <div style={{ width: "18px", height: "3px", background: "#7c3aed", borderRadius: "2px" }} />
                    Predicted Daily Revenue
                  </div>
                  <div className="db-leg-i">
                    <div style={{ width: "18px", height: "10px", background: "rgba(124, 58, 237, 0.15)", borderRadius: "2px" }} />
                    Confidence Interval (80%)
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: "11px", color: "#64748b" }}>
                    Total 30-Day Sum:{" "}
                    <strong style={{ color: "#7c3aed", fontFamily: "'Space Mono', monospace" }}>
                      {fmt(results.next_month_total)}
                    </strong>
                  </div>
                </div>
              )}

              <InteractiveForecastChart
                actual={chart.actual}
                forecast={chart.forecast}
                labels={chart.labels}
                dailyData={chart.dailyData}
                viewMode={viewMode}
                height={240}
              />
            </div>

            {/* Next Month by Product + Recommended Stock */}
            <div className={`db-panel ${show ? "s" : ""}`} style={{ transitionDelay: ".38s" }}>
              <div className="db-ph">
                <div>
                  <div className="db-pt">Next Month Forecast by Product Category</div>
                  <div className="db-ps">Proportional distribution & stock replenishment recommendations</div>
                </div>
                <button
                  className="db-btn db-btn-sec"
                  style={{ fontSize: "11px", padding: "4px 10px" }}
                  onClick={() => navigate("/reports")}
                >
                  View Inventory Ledger →
                </button>
              </div>

              {products.length > 0 ? (
                <div className="db-next-bars">
                  {(() => {
                    const maxF = Math.max(...products.map((p) => p.forecast || 0), 1);
                    return products.map((p, i) => (
                      <div className="db-next-bar-item" key={i}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "150px" }}>
                          <div
                            style={{
                              width: "10px",
                              height: "10px",
                              borderRadius: "50%",
                              background: COLORS[i % COLORS.length],
                              flexShrink: 0,
                            }}
                          />
                          <span className="db-next-bar-lbl" title={p.product}>
                            {p.product}
                          </span>
                        </div>
                        <div className="db-next-bar-track">
                          <div
                            className="db-next-bar-fill"
                            style={{
                              width: show ? `${((p.forecast || 0) / maxF) * 100}%` : "0%",
                              background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}, ${COLORS[i % COLORS.length]}88)`,
                              transitionDelay: `${i * 0.08}s`,
                            }}
                          />
                        </div>
                        <span className="db-next-bar-val" style={{ color: COLORS[i % COLORS.length] }}>
                          {fmt(p.forecast)}
                        </span>
                        <span
                          style={{
                            fontFamily: "'Space Mono', monospace",
                            fontSize: "11px",
                            fontWeight: "700",
                            color: "#d97706",
                            minWidth: "105px",
                            textAlign: "right",
                            background: "rgba(245,158,11,.09)",
                            padding: "3px 8px",
                            borderRadius: "5px",
                          }}
                        >
                          📦 {p.stock_needed.toLocaleString()} units
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "24px", color: "#94a3b8", fontSize: "13px" }}>
                  Product categories will appear here when your dataset includes a product column.
                </div>
              )}
            </div>

            {/* Product Cards Grid with Unique Mini-Charts */}
            {products.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#64748b",
                    letterSpacing: ".08em",
                    marginBottom: "12px",
                  }}
                >
                  INDIVIDUAL PRODUCT HISTORIES & FORECASTS
                </div>
                <div className="db-prod-grid">
                  {products.map((p, i) => {
                    const color = COLORS[i % COLORS.length];
                    const pActual = p.last6_actual || [];
                    const pForecast = [p.forecast || 0];
                    return (
                      <div
                        key={i}
                        className={`db-prod-card ${show ? "s" : ""}`}
                        style={{
                          transitionDelay: `${0.45 + i * 0.06}s`,
                          borderTop: `3.5px solid ${color}`,
                        }}
                      >
                        <div className="db-prod-header">
                          <span className="db-prod-name">{p.product}</span>
                          <span
                            style={{
                              fontFamily: "'Space Mono', monospace",
                              fontSize: "11px",
                              color: p.growth >= 0 ? "#16a34a" : "#dc2626",
                              background: p.growth >= 0 ? "#f0fdf4" : "#fef2f2",
                              padding: "2px 7px",
                              borderRadius: "4px",
                              fontWeight: "700",
                            }}
                          >
                            {p.growth >= 0 ? `+${p.growth}%` : `${p.growth}%`}
                          </span>
                        </div>

                        {/* Mini chart */}
                        <div
                          style={{
                            marginBottom: "12px",
                            borderRadius: "8px",
                            overflow: "hidden",
                            background: "#fafbff",
                            padding: "8px 6px 4px",
                          }}
                        >
                          <ProductLineChart actual={pActual} forecast={pForecast} color={color} />
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              padding: "4px 2px 0",
                              fontSize: "9.5px",
                              color: "#94a3b8",
                            }}
                          >
                            <span>6M Actual Sales</span>
                            <span style={{ color }}>Next Mo: {fmt(p.forecast)}</span>
                          </div>
                        </div>

                        {/* Numbers */}
                        <div className="db-prod-nums">
                          <div className="db-prod-num">
                            <div className="db-prod-num-val" style={{ color: "#2563eb", fontSize: "14px" }}>
                              {fmt(p.actual)}
                            </div>
                            <div className="db-prod-num-lbl">Historical Total</div>
                          </div>
                          <div className="db-prod-num">
                            <div className="db-prod-num-val" style={{ color, fontSize: "14px" }}>
                              {fmt(p.forecast)}
                            </div>
                            <div className="db-prod-num-lbl">Next Month</div>
                          </div>
                        </div>

                        {/* Stock needed */}
                        <div className="db-stock">
                          <span className="db-stock-lbl">📦 Recommended Stock</span>
                          <span className="db-stock-val">{p.stock_needed.toLocaleString()} units</span>
                        </div>

                        {/* Accuracy */}
                        <div className="db-prod-acc">
                          <div className="db-prod-acc-tr">
                            <div
                              className="db-prod-acc-fl"
                              style={{
                                width: `${p.accuracy || 85}%`,
                                background: `linear-gradient(90deg, ${color}, ${color}88)`,
                              }}
                            />
                          </div>
                          <span className="db-prod-acc-v" style={{ color }}>
                            {p.accuracy || 85}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default Dashboard;