import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import sampleData from "../assets/sampleForecast.json";

// ── Currency Formatter ──────────────────────────────────────────
const fmt = (n) => {
  if (!n && n !== 0) return "—";
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
};

const COLORS = ["#2563eb", "#7c3aed", "#0891b2", "#f59e0b", "#16a34a", "#dc2626", "#ea580c"];

// Helper to generate smooth cubic Bezier spline for SVGs
const getSmoothBezierPath = (points) => {
  if (!points || points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;

  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
};

// ─── 1. Ultra-Smooth Interactive Forecast Line Chart ─────────────
const InteractiveForecastChart = ({
  actual = [],
  forecast = [],
  labels = [],
  dailyData = [],
  viewMode = "monthly", // "monthly" | "daily"
  height = 440,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [ciBandLevel, setCiBandLevel] = useState("80"); // "80" | "95"
  const W = 1000;
  const H = height;
  const pad = { t: 36, b: 50, l: 82, r: 32 };

  // ── DAILY VIEW ──
  if (viewMode === "daily") {
    if (!dailyData || dailyData.length === 0) return null;
    const uppers = dailyData.map((d) => (ciBandLevel === "95" ? d.upper_95 : d.upper_bound) || d.value * 1.15);
    const lowers = dailyData.map((d) => (ciBandLevel === "95" ? d.lower_95 : d.lower_bound) || d.value * 0.85);

    const min = Math.max(0, Math.min(...lowers) * 0.85);
    const max = Math.max(...uppers) * 1.12;

    const n = dailyData.length;
    const toX = (i) => pad.l + (i / (n - 1)) * (W - pad.l - pad.r);
    const toY = (v) => H - pad.b - ((v - min) / (max - min || 1)) * (H - pad.t - pad.b);

    const pts = dailyData.map((d, i) => ({ x: toX(i), y: toY(d.value) }));
    const curvePath = getSmoothBezierPath(pts);

    // Confidence area smooth ribbon
    const upperCoords = uppers.map((v, i) => ({ x: toX(i), y: toY(v) }));
    const lowerCoords = lowers.map((v, i) => ({ x: toX(i), y: toY(v) }));
    const upperSpline = getSmoothBezierPath(upperCoords);
    const lowerReversedSpline = getSmoothBezierPath([...lowerCoords].reverse());
    const bandPath = `${upperSpline} L ${toX(n - 1)},${toY(lowers[n - 1])} ${lowerReversedSpline.replace(/^M/, "L")} Z`;

    const activeItem = hoveredIdx !== null ? dailyData[hoveredIdx] : null;

    return (
      <div style={{ position: "relative", width: "100%" }}>
        {/* Confidence Band Level Toggle in Daily View */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: "#64748b", alignSelf: "center" }}>Confidence Band:</span>
          <button
            style={{
              padding: "2px 8px",
              borderRadius: "5px",
              border: "1px solid #cbd5e1",
              fontSize: "11px",
              fontFamily: "'DM Sans', sans-serif",
              background: ciBandLevel === "80" ? "#7c3aed" : "#fff",
              color: ciBandLevel === "80" ? "#fff" : "#475569",
              cursor: "pointer",
            }}
            onClick={() => setCiBandLevel("80")}
          >
            80% CI
          </button>
          <button
            style={{
              padding: "2px 8px",
              borderRadius: "5px",
              border: "1px solid #cbd5e1",
              fontSize: "11px",
              fontFamily: "'DM Sans', sans-serif",
              background: ciBandLevel === "95" ? "#7c3aed" : "#fff",
              color: ciBandLevel === "95" ? "#fff" : "#475569",
              cursor: "pointer",
            }}
            onClick={() => setCiBandLevel("95")}
          >
            95% CI
          </button>
        </div>

        <svg
          width="100%"
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          onMouseLeave={() => setHoveredIdx(null)}
          style={{ overflow: "visible" }}
        >
          <defs>
            <linearGradient id="dailyBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.04" />
            </linearGradient>
            <linearGradient id="dailyLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid lines & Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const yVal = min + (1 - pct) * (max - min);
            const yPos = pad.t + pct * (H - pad.t - pad.b);
            return (
              <g key={idx}>
                <line x1={pad.l} x2={W - pad.r} y1={yPos} y2={yPos} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <text x={pad.l - 12} y={yPos + 4} textAnchor="end" fontSize="11" fill="#94a3b8" fontFamily="'Space Mono', monospace">
                  {fmt(yVal)}
                </text>
              </g>
            );
          })}

          {/* Confidence interval band */}
          <path d={bandPath} fill="url(#dailyBand)" />

          {/* Forecast smooth curve with glow */}
          <path
            d={curvePath}
            fill="none"
            stroke="url(#dailyLineGrad)"
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />

          {/* Interactive vertical crosshair indicator */}
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
                    r={isHovered ? "7" : "4"}
                    fill={isHovered ? "#7c3aed" : "#fff"}
                    stroke="#7c3aed"
                    strokeWidth={isHovered ? "3" : "2"}
                  />
                )}
                {isHovered && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r="13"
                    fill="none"
                    stroke="#7c3aed"
                    strokeWidth="2"
                    opacity="0.45"
                  />
                )}
                {(i % 5 === 0 || i === n - 1) && (
                  <text
                    x={cx}
                    y={H - 12}
                    textAnchor="middle"
                    fontSize="10.5"
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
              top: "12px",
              left: `${Math.min(Math.max((toX(hoveredIdx) / W) * 100, 16), 84)}%`,
              transform: "translateX(-50%)",
              background: "rgba(15, 23, 42, 0.95)",
              color: "#fff",
              padding: "8px 14px",
              borderRadius: "9px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
              pointerEvents: "none",
              fontSize: "11px",
              fontFamily: "'DM Sans', sans-serif",
              zIndex: 10,
              whiteSpace: "nowrap",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div style={{ color: "#94a3b8", fontSize: "10.5px", marginBottom: "3px" }}>
              {activeItem.date} · {activeItem.day_name} (Predicted Daily Demand)
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: "700", fontSize: "14px", color: "#c084fc" }}>
              {fmt(activeItem.value)}
            </div>
            <div style={{ color: "#cbd5e1", fontSize: "10px", marginTop: "3px" }}>
              {ciBandLevel}% CI Range: {fmt(ciBandLevel === "95" ? activeItem.lower_95 : activeItem.lower_bound)} – {fmt(ciBandLevel === "95" ? activeItem.upper_95 : activeItem.upper_bound)}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── MONTHLY VIEW ──
  const allVals = [...actual.filter((v) => v !== undefined), ...forecast.filter((v) => v !== undefined)];
  if (allVals.length === 0) return null;

  const min = Math.max(0, Math.min(...allVals) * 0.75);
  const max = Math.max(...allVals) * 1.18;

  const totalPts = labels.length;
  const toX = (i) => pad.l + (i / (totalPts - 1)) * (W - pad.l - pad.r);
  const toY = (v) => H - pad.b - ((v - min) / (max - min || 1)) * (H - pad.t - pad.b);
  const splitIdx = actual.length - 1;

  // Actuals smooth points & spline
  const actualCoords = actual.map((v, i) => ({ x: toX(i), y: toY(v) }));
  const actualCurve = getSmoothBezierPath(actualCoords);
  const actualArea = `${actualCurve} L ${toX(splitIdx)},${H - pad.b} L ${toX(0)},${H - pad.b} Z`;

  // Forecast smooth points & spline (connecting from last actual)
  const forecastCoords = [
    { x: toX(splitIdx), y: toY(actual[splitIdx]) },
    ...forecast.map((v, i) => ({ x: toX(splitIdx + 1 + i), y: toY(v) })),
  ];
  const forecastCurve = getSmoothBezierPath(forecastCoords);
  const forecastArea = `${forecastCurve} L ${toX(totalPts - 1)},${H - pad.b} L ${toX(splitIdx)},${H - pad.b} Z`;

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
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        onMouseLeave={() => setHoveredIdx(null)}
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="gradForecast" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.02" />
          </linearGradient>
          <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Horizontal grid lines & Y labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const yVal = min + (1 - pct) * (max - min);
          const yPos = pad.t + pct * (H - pad.t - pad.b);
          return (
            <g key={idx}>
              <line x1={pad.l} x2={W - pad.r} y1={yPos} y2={yPos} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <text x={pad.l - 12} y={yPos + 4} textAnchor="end" fontSize="11" fill="#94a3b8" fontFamily="'Space Mono', monospace">
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
          x={toX(splitIdx) + 8}
          y={pad.t + 14}
          fontSize="10"
          fill="#7c3aed"
          fontWeight="700"
          fontFamily="'Space Mono', monospace"
        >
          AI FORECAST →
        </text>

        {/* Area Fills */}
        <path d={actualArea} fill="url(#gradActual)" />
        <path d={forecastArea} fill="url(#gradForecast)" />

        {/* Smooth Spline Lines */}
        <path d={actualCurve} fill="none" stroke="#2563eb" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" filter="url(#lineGlow)" />
        <path d={forecastCurve} fill="none" stroke="#7c3aed" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8 5" filter="url(#lineGlow)" />

        {/* Hover Crosshair */}
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

        {/* Interactive Data Points */}
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
                r={isHovered ? "8" : "5"}
                fill={isActual ? (isHovered ? "#1d4ed8" : "#2563eb") : isHovered ? "#7c3aed" : "#fff"}
                stroke={isActual ? "#fff" : "#7c3aed"}
                strokeWidth={isActual ? "2" : "2.5"}
              />
              {isHovered && (
                <circle
                  cx={cx}
                  cy={cy}
                  r="14"
                  fill="none"
                  stroke={isActual ? "#2563eb" : "#7c3aed"}
                  strokeWidth="2"
                  opacity="0.45"
                />
              )}
              <text
                x={cx}
                y={H - 12}
                textAnchor="middle"
                fontSize="11.5"
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

      {/* Hover Tooltip */}
      {hoveredVal !== null && hoveredIdx !== null && (
        <div
          style={{
            position: "absolute",
            top: "12px",
            left: `${Math.min(Math.max((toX(hoveredIdx) / W) * 100, 16), 84)}%`,
            transform: "translateX(-50%)",
            background: "rgba(15, 23, 42, 0.95)",
            color: "#fff",
            padding: "8px 14px",
            borderRadius: "9px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
            pointerEvents: "none",
            fontSize: "11.5px",
            fontFamily: "'DM Sans', sans-serif",
            zIndex: 10,
            whiteSpace: "nowrap",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div style={{ color: "#94a3b8", fontSize: "10.5px", marginBottom: "3px" }}>
            {labels[hoveredIdx]} · {hoveredIdx <= splitIdx ? "Actual Monthly Revenue" : "AI Multi-Month Projection"}
          </div>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontWeight: "700",
              fontSize: "15px",
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

// Helper to calculate SVG donut slice offsets purely
const computeDonutSlices = (top, sum, circumference) => {
  let acc = 0;
  return top.map((p) => {
    const share = (p.forecast || 0) / sum;
    const strokeDasharray = `${share * circumference} ${circumference}`;
    const strokeDashoffset = -acc * circumference;
    acc += share;
    return {
      ...p,
      share,
      strokeDasharray,
      strokeDashoffset,
    };
  });
};

// ─── 2. Add-On Chart: Product Revenue Share Donut & Pareto ──────
const ProductShareDonutChart = ({ products = [], totalRevenue = 1 }) => {
  const [hoveredProduct, setHoveredProduct] = useState(null);

  // Donut geometry
  const size = 200;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const { topProducts, totalSum, slices } = useMemo(() => {
    const top = products.slice(0, 5);
    const sum = totalRevenue || top.reduce((acc, p) => acc + (p.forecast || 0), 0) || 1;
    const sliceList = computeDonutSlices(top, sum, circumference);
    return { topProducts: top, totalSum: sum, slices: sliceList };
  }, [products, totalRevenue, circumference]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "32px", flexWrap: "wrap", justifyContent: "space-around" }}>
      {/* Donut SVG */}
      <div style={{ position: "relative", width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          {/* Slices */}
          {slices.map((p, idx) => {
            const isHovered = hoveredProduct?.product === p.product;

            return (
              <circle
                key={idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={p.strokeDasharray}
                strokeDashoffset={p.strokeDashoffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                onMouseEnter={() => setHoveredProduct(p)}
                onMouseLeave={() => setHoveredProduct(null)}
                style={{ cursor: "pointer", transition: "stroke-width 0.2s" }}
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: "10.5px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>
            {hoveredProduct ? hoveredProduct.product.slice(0, 10) : "Forecast"}
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
            {hoveredProduct ? fmt(hoveredProduct.forecast) : fmt(totalSum)}
          </div>
        </div>
      </div>

      {/* Progress Bars & Legend */}
      <div style={{ flex: 1, minWidth: "280px", maxWidth: "600px" }}>
        {topProducts.map((p, idx) => {
          const pct = Math.round(((p.forecast || 0) / totalSum) * 100) || 0;
          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredProduct(p)}
              onMouseLeave={() => setHoveredProduct(null)}
              style={{
                marginBottom: "10px",
                padding: "6px 10px",
                borderRadius: "8px",
                background: hoveredProduct?.product === p.product ? "#f8fafc" : "transparent",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "4px" }}>
                <span style={{ fontWeight: "600", color: "#334155", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: COLORS[idx % COLORS.length] }} />
                  {p.product}
                </span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: "700", color: "#0f172a" }}>
                  {pct}% · {fmt(p.forecast)}
                </span>
              </div>
              <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: COLORS[idx % COLORS.length], borderRadius: "3px" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── 4. Counter Animation Component ─────────────────────────────
const Counter = ({ value = 0, prefix = "", suffix = "" }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    let s = 0;
    const step = (value || 0) / 40;
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

  return (
    <span>
      {prefix}
      {fmt(n).replace("₹", "")}
      {suffix}
    </span>
  );
};

// ─── MAIN DASHBOARD ─────────────────────────────────────────────
const Dashboard = () => {
  const stored = localStorage.getItem("user");
  const user = stored ? JSON.parse(stored) : { name: "User" };
  const firstName = user.name?.split(" ")[0] || "User";
  const navigate = useNavigate();

  const [show, setShow] = useState(false);
  const [viewMode, setViewMode] = useState("monthly"); // "monthly" | "daily"
  const [showScorecard, setShowScorecard] = useState(false);
  const [showScenario, setShowScenario] = useState(false);
  const [demandShock, setDemandShock] = useState(0); // -20 to +30 %

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

  // Multiplier from scenario simulator
  const scenarioMultiplier = 1.0 + demandShock / 100.0;
  const adjustedNextMonthTotal = useMemo(() => {
    if (!results) return 0;
    return Math.round((results.next_month_total || 0) * scenarioMultiplier);
  }, [results, scenarioMultiplier]);

  const mainChartData = () => {
    if (!results) return { actual: [], forecast: [], labels: [], dailyData: [] };
    const actual = results.last6_actual || [];
    const baseForecast = results.forecast_3m || [results.next_month_total || 0];
    const adjustedForecast = baseForecast.map((v) => Math.round(v * scenarioMultiplier));

    const aLabels = (results.last6_labels || []).map((l) => l.slice(-7));
    const fLabels = results.forecast_3m_lb ? results.forecast_3m_lb.map((l) => l.slice(-7)) : [results.next_month_label?.slice(-7) || "Next"];

    const adjustedDaily = (results.future_30days || []).map((d) => ({
      ...d,
      value: Math.round(d.value * scenarioMultiplier),
      lower_bound: Math.round(d.lower_bound * scenarioMultiplier),
      upper_bound: Math.round(d.upper_bound * scenarioMultiplier),
      lower_95: Math.round((d.lower_95 || d.value * 0.75) * scenarioMultiplier),
      upper_95: Math.round((d.upper_95 || d.value * 1.25) * scenarioMultiplier),
    }));

    return {
      actual,
      forecast: adjustedForecast,
      labels: [...aLabels, ...fLabels],
      dailyData: adjustedDaily,
    };
  };

  const chart = mainChartData();
  const products = useMemo(() => results?.products || [], [results]);
  const scorecard = results?.scorecard || [];
  const bi = results?.business_intelligence || {};

  // Total forecast demand in units
  const totalDemandUnits = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.forecast_units || Math.round(p.forecast / (p.avg_price || 1))), 0);
  }, [products]);

  // 4 Balanced Symmetrical KPI Cards
  const kpis = hasData
    ? [
        {
          lbl: "Total Recorded Sales",
          val: results.total_actual,
          color: "#2563eb",
          prefix: "₹",
          suffix: "",
          change: "Historical Ledger",
          icon: "📈",
        },
        {
          lbl: demandShock !== 0 ? `Next Mo Forecast (${demandShock > 0 ? `+${demandShock}%` : `${demandShock}%`})` : "Next Month Forecast",
          val: adjustedNextMonthTotal,
          color: "#7c3aed",
          prefix: "₹",
          suffix: "",
          change: `${results.growth_rate !== undefined ? (results.growth_rate >= 0 ? `+${results.growth_rate}%` : `${results.growth_rate}%`) : "AI Projected"} MoM`,
          icon: "🎯",
        },
        {
          lbl: "Forecast Demand Units",
          val: Math.round(totalDemandUnits * scenarioMultiplier),
          color: "#0891b2",
          prefix: "",
          suffix: " units",
          change: "Commercial Volume",
          icon: "📦",
        },
        {
          lbl: "Validated Model Accuracy",
          val: results.accuracy,
          color: "#16a34a",
          prefix: "",
          suffix: "%",
          change: results.selected_model ? results.selected_model : "Backtested Winner",
          icon: "⚡",
        },
      ]
    : [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        .db{min-height:100vh;background:#f0f2f8;font-family:'DM Sans',sans-serif;padding:84px 28px 56px;max-width:1360px;margin:0 auto;}
        
        /* Header Alignment */
        .db-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;opacity:0;transform:translateY(10px);transition:opacity .5s,transform .5s;flex-wrap:wrap;gap:14px;}
        .db-hdr.s{opacity:1;transform:none;}
        .db-greet{font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:.12em;text-transform:uppercase;margin-bottom:3px;}
        .db-h1{font-family:'Space Mono',monospace;font-size:22px;font-weight:700;color:#0f172a;}
        .db-h1 .b{color:#2563eb} .db-h1 .v{color:#7c3aed}
        .db-dt{font-size:12px;color:#64748b;margin-top:3px;}
        .db-hdr-r{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
        .db-live{display:flex;align-items:center;gap:7px;padding:7px 14px;background:#fff;border:1px solid #e2e8f4;border-radius:20px;font-size:11px;font-weight:600;color:#374151;font-family:'Space Mono',monospace;}
        .pulse-dot{width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.2);animation:pdot 2s infinite;}
        @keyframes pdot{0%,100%{opacity:1}50%{opacity:.4}}
        
        /* Buttons */
        .db-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:9px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all .2s;}
        .db-btn-p{background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;box-shadow:0 4px 14px rgba(37,99,235,.28);}
        .db-btn-p:hover{opacity:.92;transform:translateY(-1px);}
        .db-btn-sec{background:#fff;border:1px solid #cbd5e1;color:#334155;}
        .db-btn-sec:hover{background:#f8fafc;border-color:#94a3b8;}
        
        /* Symmetrical 4-Card KPI Grid */
        .db-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px;}
        .db-kpi{background:#fff;border:1px solid #e8edf6;border-radius:16px;padding:20px 22px;position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;min-height:140px;box-shadow:0 2px 8px rgba(15,23,42,.03);transition:transform .2s,box-shadow .2s;}
        .db-kpi:hover{box-shadow:0 8px 24px rgba(15,23,42,.08);transform:translateY(-2px);}
        .db-kpi-bar{position:absolute;top:0;left:0;right:0;height:3.5px;}
        .db-kpi-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
        .db-kpi-lbl{font-size:11.5px;font-weight:600;color:#94a3b8;letter-spacing:.04em;text-transform:uppercase;}
        .db-kpi-val{font-family:'Space Mono',monospace;font-size:25px;font-weight:700;letter-spacing:-.02em;line-height:1.2;}
        .db-kpi-foot{display:flex;justify-content:space-between;align-items:center;margin-top:10px;}
        .db-kpi-chg{font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;}
        
        /* Main Panels */
        .db-panel{background:#fff;border:1px solid #e8edf6;border-radius:16px;padding:22px;margin-bottom:18px;box-shadow:0 2px 10px rgba(15,23,42,.03);}
        .db-ph{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:10px;}
        .db-pt{font-family:'Space Mono',monospace;font-size:14px;font-weight:700;color:#0f172a;}
        .db-ps{font-size:12px;color:#94a3b8;margin-top:3px;}
        
        /* View Toggle */
        .view-toggle{display:inline-flex;padding:3px;background:#f1f5f9;border-radius:8px;}
        .view-btn{padding:5px 12px;border:none;background:transparent;border-radius:6px;font-size:11.5px;font-weight:600;color:#64748b;cursor:pointer;transition:all .2s;font-family:'DM Sans',sans-serif;}
        .view-btn.active{background:#fff;color:#0f172a;box-shadow:0 1px 3px rgba(0,0,0,.08);}
        
        /* Legends */
        .db-leg{display:flex;gap:20px;margin-bottom:14px;align-items:center;flex-wrap:wrap;}
        .db-leg-i{display:flex;align-items:center;gap:7px;font-size:12px;color:#64748b;}
        .db-leg-line{width:18px;height:3.5px;border-radius:2px;background:#2563eb;}
        .db-leg-dash{width:18px;height:3.5px;background:repeating-linear-gradient(90deg,#7c3aed 0,#7c3aed 5px,transparent 5px,transparent 9px);}
        
        /* Table Alignment */
        .db-table-wrap{overflow-x:auto;border:1px solid #e8edf6;border-radius:10px;}
        .db-table{width:100%;min-width:860px;border-collapse:collapse;font-size:12.5px;}
        .db-table th{background:#f8fafc;color:#64748b;font-weight:700;font-size:11px;text-transform:uppercase;padding:12px 16px;border-bottom:1px solid #e2e8f0;}
        .db-table td{padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#334155;}
        .db-table tr:hover td{background:#fafcff;}
        .db-badge{display:inline-block;padding:2px 7px;border-radius:4px;font-size:11px;font-family:'Space Mono',monospace;font-weight:700;}
        .db-badge-crit{background:#fef2f2;color:#dc2626;}
        .db-badge-reord{background:#fffbeb;color:#d97706;}
        .db-badge-opt{background:#f0fdf4;color:#16a34a;}
        .db-badge-over{background:#eff6ff;color:#2563eb;}
        
        /* Responsive Breakpoints */
        @media(max-width:1100px){
          .db-kpis{grid-template-columns:repeat(2,1fr);}
        }
        @media(max-width:680px){
          .db-kpis{grid-template-columns:1fr;}
          .db{padding:84px 16px 40px;}
        }
      `}</style>

      <div className="db">
        {/* Header */}
        <div className={`db-hdr ${show ? "s" : ""}`}>
          <div>
            <p className="db-greet">AI Sales Intelligence & Supply Chain Platform</p>
            <h1 className="db-h1">
              Hello, <span className="b">{firstName}</span> <span className="v">👋</span>
            </h1>
            <p className="db-dt">
              {now.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>

          <div className="db-hdr-r">
            <div className="db-live">
              <span className="pulse-dot" />
              LIVE · {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </div>
            {hasData && (
              <>
                <button className="db-btn db-btn-sec" onClick={() => setShowScenario(!showScenario)}>
                  ⚡ What-If Simulator
                </button>
                <button className="db-btn db-btn-sec" onClick={() => navigate("/reports")}>
                  📑 Reports & Ledger
                </button>
              </>
            )}
            <button className="db-btn db-btn-p" onClick={() => navigate("/upload")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload Data
            </button>
          </div>
        </div>

        {/* Empty State with Demo Option */}
        {!hasData && (
          <div className="db-panel">
            <div style={{ textAlign: "center", padding: "64px 20px" }}>
              <div style={{ fontSize: "52px", marginBottom: "16px" }}>📊</div>
              <h2 style={{ fontFamily: "'Space Mono', monospace", fontSize: "19px", color: "#0f172a", marginBottom: "8px" }}>
                No Forecast Data Loaded
              </h2>
              <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "28px", lineHeight: "1.7" }}>
                Upload your transaction CSV/Excel file to run backtested ML forecasting and inventory planning,
                <br />
                or test immediately using the verified sample demo dataset.
              </p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                <button className="db-btn db-btn-p" onClick={() => navigate("/upload")}>
                  Upload Sales CSV
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
            {/* Symmetrical 4-Card KPI Grid */}
            <div className="db-kpis">
              {kpis.map((k, i) => (
                <div key={i} className="db-kpi">
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
                        background: k.color === "#16a34a" ? "#f0fdf4" : k.color === "#7c3aed" ? "#faf5ff" : k.color === "#0891b2" ? "#ecfeff" : "#eff6ff",
                        color: k.color,
                      }}
                    >
                      {k.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* What-If Scenario Planning Simulator Panel */}
            {showScenario && (
              <div className="db-panel" style={{ borderLeft: "4px solid #7c3aed", background: "#fbfaff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: "700", fontSize: "13.5px", color: "#0f172a" }}>
                      ⚡ What-If Scenario Simulation
                    </span>
                    <p style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                      Simulate market fluctuations & demand shifts dynamically without altering underlying datasets.
                    </p>
                  </div>
                  <button
                    className="db-btn db-btn-sec"
                    style={{ fontSize: "11px", padding: "4px 10px" }}
                    onClick={() => setDemandShock(0)}
                  >
                    Reset Baseline
                  </button>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "12px", color: "#475569", fontWeight: "600" }}>Demand Shock:</span>
                  {[-20, -10, 0, 10, 20].map((pct) => (
                    <button
                      key={pct}
                      className="db-btn"
                      style={{
                        padding: "5px 12px",
                        fontSize: "12px",
                        background: demandShock === pct ? "#7c3aed" : "#fff",
                        color: demandShock === pct ? "#fff" : "#475569",
                        border: "1px solid #cbd5e1",
                      }}
                      onClick={() => setDemandShock(pct)}
                    >
                      {pct === 0 ? "Normal Baseline" : pct > 0 ? `+${pct}% Surge` : `${pct}% Contraction`}
                    </button>
                  ))}
                  <span style={{ marginLeft: "auto", fontFamily: "'Space Mono', monospace", fontSize: "12.5px", fontWeight: "700", color: "#7c3aed" }}>
                    Adjusted Revenue: {fmt(adjustedNextMonthTotal)}
                  </span>
                </div>
              </div>
            )}

            {/* Model Selection & Backtesting Scorecard Banner */}
            <div className="db-panel" style={{ borderTop: "3.5px solid #2563eb", padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "20px" }}>🏆</span>
                  <div>
                    <div style={{ fontSize: "13.5px", fontWeight: "700", color: "#0f172a" }}>
                      Selected Winning Model: <span style={{ color: "#2563eb" }}>{results.selected_model || "Ensemble (Ridge + GBR)"}</span>
                    </div>
                    <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                      Evaluated chronologically across 6 models · Holdout validation accuracy: <strong>{results.accuracy}%</strong>
                    </div>
                  </div>
                </div>

                <button
                  className="db-btn db-btn-sec"
                  style={{ fontSize: "11px", padding: "5px 12px" }}
                  onClick={() => setShowScorecard(!showScorecard)}
                >
                  {showScorecard ? "▲ Hide Model Comparison" : "▼ View Model Scorecard (MAE, RMSE, WAPE)"}
                </button>
              </div>

              {/* Collapsible Scorecard Table */}
              {showScorecard && scorecard.length > 0 && (
                <div style={{ marginTop: "14px", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
                  <div className="db-table-wrap">
                    <table className="db-table">
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left" }}>Candidate Model</th>
                          <th style={{ textAlign: "right" }}>WAPE Error</th>
                          <th style={{ textAlign: "right" }}>MAE</th>
                          <th style={{ textAlign: "right" }}>RMSE</th>
                          <th style={{ textAlign: "right" }}>MASE</th>
                          <th style={{ textAlign: "right" }}>Validation Accuracy</th>
                          <th style={{ textAlign: "center" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scorecard.map((s, idx) => (
                          <tr key={idx} style={{ background: s.is_winner ? "#f0fdf4" : "transparent" }}>
                            <td style={{ fontWeight: s.is_winner ? "700" : "500", color: s.is_winner ? "#16a34a" : "#334155" }}>
                              {s.is_winner && "✓ "}
                              {s.model}
                            </td>
                            <td style={{ textAlign: "right", fontFamily: "'Space Mono', monospace", fontWeight: "700", color: s.is_winner ? "#16a34a" : "#0f172a" }}>
                              {s.wape}%
                            </td>
                            <td style={{ textAlign: "right", fontFamily: "'Space Mono', monospace" }}>{fmt(s.mae)}</td>
                            <td style={{ textAlign: "right", fontFamily: "'Space Mono', monospace" }}>{fmt(s.rmse)}</td>
                            <td style={{ textAlign: "right", fontFamily: "'Space Mono', monospace" }}>{s.mase}</td>
                            <td style={{ textAlign: "right", fontFamily: "'Space Mono', monospace", fontWeight: "700", color: s.is_winner ? "#16a34a" : "#475569" }}>
                              {s.accuracy}%
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {s.is_winner ? (
                                <span className="db-badge db-badge-opt">Selected Winner</span>
                              ) : (
                                <span style={{ fontSize: "11px", color: "#94a3b8" }}>Evaluated</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Main Interactive Forecast Chart */}
            <div className="db-panel">
              <div className="db-ph">
                <div>
                  <div className="db-pt">
                    {viewMode === "monthly"
                      ? "Revenue Trajectory — Actuals vs AI Multi-Month Forecast"
                      : "Continuous 30-Day Daily Forecast Curve with Uncertainty Bounds"}
                  </div>
                  <div className="db-ps">
                    {viewMode === "monthly"
                      ? "Solid blue spline = actual sales · Dashed purple spline = backtested model projection"
                      : "Daily demand curve with shaded confidence interval bands"}
                  </div>
                </div>

                <div className="view-toggle">
                  <button className={`view-btn ${viewMode === "monthly" ? "active" : ""}`} onClick={() => setViewMode("monthly")}>
                    📅 Monthly Trajectory
                  </button>
                  <button className={`view-btn ${viewMode === "daily" ? "active" : ""}`} onClick={() => setViewMode("daily")}>
                    📈 30-Day Daily Curve
                  </button>
                </div>
              </div>

              {viewMode === "monthly" ? (
                <div className="db-leg">
                  <div className="db-leg-i"><div className="db-leg-line" />Actual Monthly Sales</div>
                  <div className="db-leg-i"><div className="db-leg-dash" />AI Multi-Month Forecast</div>
                  <div style={{ marginLeft: "auto", fontSize: "11px", color: "#64748b" }}>
                    Hover over spline nodes to inspect monthly revenues
                  </div>
                </div>
              ) : (
                <div className="db-leg">
                  <div className="db-leg-i"><div style={{ width: "18px", height: "3.5px", background: "#7c3aed", borderRadius: "2px" }} />Daily Demand</div>
                  <div className="db-leg-i"><div style={{ width: "18px", height: "10px", background: "rgba(124, 58, 237, 0.2)", borderRadius: "2px" }} />Confidence Interval Band</div>
                  <div style={{ marginLeft: "auto", fontSize: "11px", color: "#64748b" }}>
                    30-Day Projected Total: <strong>{fmt(adjustedNextMonthTotal)}</strong>
                  </div>
                </div>
              )}

              <InteractiveForecastChart
                actual={chart.actual}
                forecast={chart.forecast}
                labels={chart.labels}
                dailyData={chart.dailyData}
                viewMode={viewMode}
                height={440}
              />
            </div>

            {/* ─── ADD-ON CHART: Product Revenue Share & Pareto Analysis ─── */}
            <div className="db-panel">
              <div className="db-ph">
                <div>
                  <div className="db-pt">Product Revenue Share & Demand Breakdown</div>
                  <div className="db-ps">Next month's revenue contribution across top commercial lines</div>
                </div>
                <span className="db-badge db-badge-opt">Pareto 80/20</span>
              </div>

              <ProductShareDonutChart
                products={products}
                totalRevenue={adjustedNextMonthTotal}
              />
            </div>

            {/* Inventory Optimization & Reorder Points Ledger */}
            <div className="db-panel" style={{ padding: "18px 22px" }}>
              <div className="db-ph" style={{ marginBottom: "14px" }}>
                <div>
                  <div className="db-pt">Inventory Optimization & Demand Ledger</div>
                  <div className="db-ps">Calculated using Daily Demand Rate, Supplier Lead Time, and Safety Stock formulas</div>
                </div>
                <button className="db-btn db-btn-sec" style={{ fontSize: "11.5px", padding: "5px 12px" }} onClick={() => navigate("/reports")}>
                  Full Reports & Stock Upload →
                </button>
              </div>

              {/* Perfectly Aligned Product Demand & Inventory Table */}
              {products.length > 0 && (
                <div className="db-table-wrap">
                  <table className="db-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left" }}>Product Line</th>
                        <th style={{ textAlign: "right" }}>Forecast Revenue</th>
                        <th style={{ textAlign: "right" }}>Demand Units</th>
                        <th style={{ textAlign: "right" }}>Current Stock</th>
                        <th style={{ textAlign: "right" }}>Safety Stock</th>
                        <th style={{ textAlign: "right" }}>Reorder Point</th>
                        <th style={{ textAlign: "right" }}>Coverage</th>
                        <th style={{ textAlign: "center" }}>Inventory Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: "600", textAlign: "left" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: COLORS[i % COLORS.length] }} />
                              {p.product}
                            </div>
                          </td>
                          <td style={{ textAlign: "right", fontFamily: "'Space Mono', monospace", fontWeight: "700", color: "#2563eb" }}>
                            {fmt(Math.round((p.forecast || 0) * scenarioMultiplier))}
                          </td>
                          <td style={{ textAlign: "right", fontFamily: "'Space Mono', monospace" }}>
                            {Math.round((p.forecast_units || p.forecast / (p.avg_price || 1)) * scenarioMultiplier).toLocaleString()} units
                          </td>
                          <td style={{ textAlign: "right", fontFamily: "'Space Mono', monospace" }}>
                            {p.current_stock != null ? `${p.current_stock.toLocaleString()} units` : "—"}
                          </td>
                          <td style={{ textAlign: "right", fontFamily: "'Space Mono', monospace", color: "#64748b" }}>
                            {p.safety_stock?.toLocaleString()} units
                          </td>
                          <td style={{ textAlign: "right", fontFamily: "'Space Mono', monospace", fontWeight: "700", color: "#d97706" }}>
                            {p.reorder_point?.toLocaleString()} units
                          </td>
                          <td style={{ textAlign: "right", fontFamily: "'Space Mono', monospace" }}>
                            {p.coverage_days != null ? `${p.coverage_days} days` : "—"}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {p.stock_status && p.stock_status !== "AWAITING_STOCK" ? (
                              <span
                                className={`db-badge ${
                                  p.stock_status === "CRITICAL" || p.stock_status === "OUT_OF_STOCK"
                                    ? "db-badge-crit"
                                    : p.stock_status === "REORDER_NOW"
                                    ? "db-badge-reord"
                                    : p.stock_status === "OVERSTOCK"
                                    ? "db-badge-over"
                                    : "db-badge-opt"
                                }`}
                              >
                                {p.stock_status}
                              </span>
                            ) : (
                              <span style={{ color: "#94a3b8", fontFamily: "'Space Mono', monospace" }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Business Intelligence Insights Card */}
            {bi.bullet_insights && bi.bullet_insights.length > 0 && (
              <div className="db-panel" style={{ borderLeft: "4px solid #16a34a", padding: "18px 22px" }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "12.5px", fontWeight: "700", color: "#166534", marginBottom: "8px" }}>
                  💡 AUTOMATED BUSINESS INTELLIGENCE & DEMAND INSIGHTS
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "7px", fontSize: "13px", color: "#334155" }}>
                  {bi.bullet_insights.map((insight, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <span style={{ color: "#16a34a", fontWeight: "700" }}>•</span>
                      <span>{insight}</span>
                    </div>
                  ))}
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