import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ─── Solid + Dashed Line Chart ─────────────────────────────────
const ForecastLineChart = ({ actual, forecast, labels, height = 220 }) => {
  const W = 700, H = height;
  const pad = { t: 20, b: 32, l: 12, r: 12 };

  const allVals = [...actual.filter(Boolean), ...forecast.filter(Boolean)];
  if (allVals.length === 0) return null;
  const min = Math.min(...allVals) * 0.85;
  const max = Math.max(...allVals) * 1.1;

  const totalPts = labels.length;
  const toX = i => pad.l + (i / (totalPts - 1)) * (W - pad.l - pad.r);
  const toY = v => H - pad.b - ((v - min) / (max - min || 1)) * (H - pad.t - pad.b);
  const splitIdx = actual.length - 1;

  const actualPts  = actual.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const forecastPts = [
    `${toX(splitIdx)},${toY(actual[splitIdx])}`,
    ...forecast.map((v, i) => `${toX(splitIdx + 1 + i)},${toY(v)}`)
  ].join(" ");

  const actualArea = `M${toX(0)},${H-pad.b} ${actual.map((v,i)=>`L${toX(i)},${toY(v)}`).join(" ")} L${toX(splitIdx)},${H-pad.b} Z`;
  const forecastArea = `M${toX(splitIdx)},${H-pad.b} L${toX(splitIdx)},${toY(actual[splitIdx])} ${forecast.map((v,i)=>`L${toX(splitIdx+1+i)},${toY(v)}`).join(" ")} L${toX(totalPts-1)},${H-pad.b} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="lca" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18"/>
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02"/>
        </linearGradient>
        <linearGradient id="lcf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.14"/>
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.01"/>
        </linearGradient>
      </defs>
      {[0,1,2,3,4].map(i=>(
        <line key={i} x1={pad.l} x2={W-pad.r}
          y1={pad.t+i*((H-pad.t-pad.b)/4)} y2={pad.t+i*((H-pad.t-pad.b)/4)}
          stroke="#f1f5f9" strokeWidth="1"/>
      ))}
      <line x1={toX(splitIdx)} y1={pad.t} x2={toX(splitIdx)} y2={H-pad.b}
        stroke="#e2e8f4" strokeWidth="1.5" strokeDasharray="5 3"/>
      <text x={toX(splitIdx)+6} y={pad.t+10} fontSize="8.5" fill="#94a3b8" fontFamily="'DM Sans',sans-serif">FORECAST →</text>
      <path d={actualArea} fill="url(#lca)"/>
      <path d={forecastArea} fill="url(#lcf)"/>
      <polyline points={actualPts} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points={forecastPts} fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="7 4"/>
      {actual.map((v,i)=>(
        <circle key={i} cx={toX(i)} cy={toY(v)} r="3.5" fill="#2563eb" stroke="#fff" strokeWidth="2"/>
      ))}
      {forecast.map((v,i)=>(
        <circle key={i} cx={toX(splitIdx+1+i)} cy={toY(v)} r="3.5" fill="#fff" stroke="#a78bfa" strokeWidth="2.5"/>
      ))}
      {labels.map((l,i)=>(
        <text key={i} x={toX(i)} y={H-8} textAnchor="middle"
          fontSize="9" fill={i>splitIdx?"#a78bfa":"#94a3b8"}
          fontFamily="'DM Sans',sans-serif" fontWeight={i>splitIdx?"600":"400"}>{l}</text>
      ))}
    </svg>
  );
};

// ─── Per-Product Mini Line Chart ────────────────────────────────
// actual = array of real monthly values, forecast = [nextMonthVal]
// Each product has different actual values so each chart looks different
const ProductLineChart = ({ actual, forecast, color = "#2563eb" }) => {
  const W = 220, H = 65;
  // Filter out zero-only data
  const nonZeroActual = actual.filter(v => v > 0);
  if (nonZeroActual.length < 2) {
    // Not enough data — show flat line with forecast point
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <text x={W/2} y={H/2+4} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="'DM Sans',sans-serif">
          Insufficient monthly data
        </text>
      </svg>
    );
  }

  const all = [...actual, ...forecast].filter(v => v > 0);
  const min = Math.min(...all) * 0.8;
  const max = Math.max(...all) * 1.15;
  const totalPts = actual.length + forecast.length;
  const toX = i => 6 + (i / (totalPts - 1)) * (W - 12);
  const toY = v => H - 10 - ((v - min) / (max - min || 1)) * (H - 20);
  const splitIdx = actual.length - 1;

  const aPts = actual.map((v,i) => `${toX(i)},${toY(v)}`).join(" ");
  const fPts = [
    `${toX(splitIdx)},${toY(actual[splitIdx])}`,
    ...forecast.map((v,i) => `${toX(splitIdx+1+i)},${toY(v)}`)
  ].join(" ");

  // Area fill under actual line
  const aArea = `M${toX(0)},${H-6} ${actual.map((v,i)=>`L${toX(i)},${toY(v)}`).join(" ")} L${toX(splitIdx)},${H-6} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`pa${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* Grid */}
      {[0,1,2].map(i=>(
        <line key={i} x1="6" x2={W-6}
          y1={10+i*((H-20)/2)} y2={10+i*((H-20)/2)}
          stroke="#f1f5f9" strokeWidth="1"/>
      ))}
      {/* Area */}
      <path d={aArea} fill={`url(#pa${color.replace("#","")})`}/>
      {/* Actual line — solid */}
      <polyline points={aPts} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"/>
      {/* Forecast line — dashed lighter */}
      <polyline points={fPts} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray="5 3" opacity="0.5"/>
      {/* Dots on actual */}
      {actual.map((v,i)=>(
        <circle key={i} cx={toX(i)} cy={toY(v)} r="2.5" fill={color} stroke="#fff" strokeWidth="1.5"/>
      ))}
      {/* Hollow dot on forecast */}
      {forecast.map((v,i)=>(
        <circle key={i} cx={toX(splitIdx+1+i)} cy={toY(v)} r="3" fill="#fff" stroke={color} strokeWidth="2" opacity="0.7"/>
      ))}
    </svg>
  );
};

// ─── Animated Counter ────────────────────────────────────────────
const Counter = ({ value, prefix = "", suffix = "" }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    let s = 0; const step = value / 60;
    const t = setInterval(() => {
      s += step;
      if (s >= value) { setN(value); clearInterval(t); }
      else setN(Math.floor(s));
    }, 16);
    return () => clearInterval(t);
  }, [value]);
  const f = v => {
    if (v >= 10000000) return `${(v/10000000).toFixed(1)}Cr`;
    if (v >= 100000)   return `${(v/100000).toFixed(1)}L`;
    if (v >= 1000)     return `${(v/1000).toFixed(1)}K`;
    return v.toLocaleString();
  };
  return <span>{prefix}{f(n)}{suffix}</span>;
};

// ─── DASHBOARD ───────────────────────────────────────────────────
const Dashboard = () => {
  const stored    = localStorage.getItem("user");
  const user      = stored ? JSON.parse(stored) : { name: "User" };
  const firstName = user.name?.split(" ")[0] || "User";
  const navigate  = useNavigate();

  const [show,    setShow]    = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    setTimeout(() => setShow(true), 80);
    const saved = localStorage.getItem("forecastResults");
    if (saved) setResults(JSON.parse(saved));
  }, []);

  const hasData = !!results;

  const fmt = (n) => {
    if (!n && n !== 0) return "—";
    if (n >= 10000000) return `₹${(n/10000000).toFixed(1)}Cr`;
    if (n >= 100000)   return `₹${(n/100000).toFixed(1)}L`;
    if (n >= 1000)     return `₹${(n/1000).toFixed(1)}K`;
    return `₹${n.toLocaleString()}`;
  };

  // ── Main chart: 6 months actual (solid) + next month forecast (dashed) ──
  const mainChartData = () => {
    if (!results) return { actual: [], forecast: [], labels: [] };
    const actual  = results.last6_actual || [];
    const nextVal = results.forecast_3m?.[0] || results.next_month_total || results.total_forecast || 0;
    const aLabels = (results.last6_labels || []).map(l => l.slice(-7));
    // Compute next month label from last label
    const lastLabel = results.last6_labels?.[results.last6_labels.length - 1] || "";
    let nextLabel = results.next_month_label?.slice(-7) || "Next";
    if (!results.next_month_label && lastLabel) {
      const [yr, mo] = lastLabel.split("-").map(Number);
      const next = new Date(yr, mo, 1);
      nextLabel = `${next.toLocaleString("default",{month:"short"})}-${String(next.getFullYear()).slice(2)}`;
    }
    return { actual, forecast: [nextVal], labels: [...aLabels, nextLabel] };
  };

  const chart = mainChartData();

  const products = results?.products || [];

  // ── Per-product chart uses product's own last6_actual + [forecast] ──
  // This gives each product a UNIQUE chart based on their own sales history
  const getProductChartData = (product) => {
    const actual   = product.last6_actual || [];
    const forecast = [product.forecast || 0];
    return { actual, forecast };
  };

  const getStockNeeded = (product) => {
    if (product.stock_needed) return product.stock_needed;
    const avgUnitPrice = results?.total_units > 0
      ? (results.total_actual / results.total_units) : 500;
    return Math.max(1, Math.ceil((product.forecast || 0) / avgUnitPrice));
  };

  const now = new Date();
  const COLORS = ["#2563eb","#7c3aed","#0891b2","#f59e0b","#16a34a","#dc2626"];

  const kpis = hasData ? [
    { lbl:"Total Revenue (Till Now)", val:results.total_actual, color:"#2563eb", prefix:"₹", suffix:"", change:"Actual" },
    { lbl:"Next Month Forecast",      val:results.forecast_3m?.[0]||results.next_month_total||results.total_forecast||0, color:"#7c3aed", prefix:"₹", suffix:"", change:"Predicted" },
    { lbl:"Model Accuracy",           val:results.accuracy, color:"#16a34a", prefix:"", suffix:"%", change:"ML Score" },
  ] : [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        .db{min-height:100vh;background:#f0f2f8;font-family:'DM Sans',sans-serif;padding:84px 28px 52px;}
        .db-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px;opacity:0;transform:translateY(10px);transition:opacity .5s,transform .5s;}
        .db-hdr.s{opacity:1;transform:none;}
        .db-greet{font-size:10.5px;font-weight:700;color:#94a3b8;letter-spacing:.12em;text-transform:uppercase;margin-bottom:3px;}
        .db-h1{font-family:'Space Mono',monospace;font-size:22px;font-weight:700;color:#0f172a;}
        .db-h1 .b{color:#2563eb} .db-h1 .v{color:#7c3aed}
        .db-dt{font-size:11.5px;color:#94a3b8;margin-top:3px;}
        .db-hdr-r{display:flex;align-items:center;gap:10px;}
        .db-live{display:flex;align-items:center;gap:7px;padding:7px 14px;background:#fff;border:1px solid #e2e8f4;border-radius:20px;font-size:11px;font-weight:600;color:#374151;font-family:'Space Mono',monospace;}
        .pulse-dot{width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.2);animation:pdot 2s infinite;}
        @keyframes pdot{0%,100%{opacity:1}50%{opacity:.4}}
        .db-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:9px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all .2s;}
        .db-btn-p{background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;box-shadow:0 4px 14px rgba(37,99,235,.28);}
        .db-btn-p:hover{opacity:.9;transform:translateY(-1px);}
        .db-btn svg{width:14px;height:14px;}
        .db-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px;}
        .db-kpi{background:#fff;border:1px solid #e8edf6;border-radius:16px;padding:20px 20px 16px;opacity:0;transform:translateY(16px);transition:opacity .5s,transform .5s,box-shadow .2s;position:relative;overflow:hidden;}
        .db-kpi.s{opacity:1;transform:none;}
        .db-kpi:hover{box-shadow:0 8px 28px rgba(15,23,42,.09);transform:translateY(-2px);}
        .db-kpi-bar{position:absolute;top:0;left:0;right:0;height:3px;border-radius:16px 16px 0 0;}
        .db-kpi-lbl{font-size:11px;font-weight:600;color:#94a3b8;letter-spacing:.05em;text-transform:uppercase;margin-bottom:8px;}
        .db-kpi-val{font-family:'Space Mono',monospace;font-size:28px;font-weight:700;letter-spacing:-.02em;line-height:1.1;}
        .db-kpi-foot{display:flex;justify-content:space-between;align-items:center;margin-top:10px;}
        .db-kpi-chg{font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px;background:#f0fdf4;color:#16a34a;}
        .db-panel{background:#fff;border:1px solid #e8edf6;border-radius:16px;padding:22px;opacity:0;transform:translateY(16px);transition:opacity .5s,transform .5s,box-shadow .2s;margin-bottom:16px;}
        .db-panel.s{opacity:1;transform:none;}
        .db-panel:hover{box-shadow:0 6px 24px rgba(15,23,42,.07);}
        .db-ph{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;}
        .db-pt{font-family:'Space Mono',monospace;font-size:13px;font-weight:700;color:#0f172a;}
        .db-ps{font-size:11.5px;color:#94a3b8;margin-top:3px;}
        .db-tag{font-size:10px;font-weight:700;font-family:'Space Mono',monospace;padding:3px 10px;border-radius:5px;}
        .db-tag-b{background:rgba(37,99,235,.08);color:#2563eb;}
        .db-tag-v{background:rgba(124,58,237,.08);color:#7c3aed;}
        .db-tag-g{background:rgba(22,163,74,.08);color:#16a34a;}
        .db-tag-o{background:rgba(245,158,11,.08);color:#d97706;}
        .db-leg{display:flex;gap:20px;margin-bottom:14px;}
        .db-leg-i{display:flex;align-items:center;gap:7px;font-size:12px;color:#64748b;}
        .db-leg-line{width:20px;height:2.5px;border-radius:2px;background:#2563eb;}
        .db-leg-dash{width:20px;height:2.5px;background:repeating-linear-gradient(90deg,#a78bfa 0,#a78bfa 5px,transparent 5px,transparent 9px);}
        .db-next-bars{display:flex;flex-direction:column;gap:12px;}
        .db-next-bar-item{display:flex;align-items:center;gap:12px;}
        .db-next-bar-lbl{font-size:12px;font-weight:600;color:#374151;min-width:90px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .db-next-bar-track{flex:1;height:10px;background:#f1f5f9;border-radius:5px;overflow:hidden;}
        .db-next-bar-fill{height:100%;border-radius:5px;transition:width 1s cubic-bezier(.34,1.56,.64,1);}
        .db-next-bar-val{font-family:'Space Mono',monospace;font-size:11.5px;font-weight:700;min-width:56px;text-align:right;}
        .db-prod-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
        .db-prod-card{background:#fff;border:1px solid #e8edf6;border-radius:14px;padding:18px;opacity:0;transform:translateY(14px);transition:opacity .5s,transform .5s,box-shadow .2s;}
        .db-prod-card.s{opacity:1;transform:none;}
        .db-prod-card:hover{box-shadow:0 6px 20px rgba(15,23,42,.08);}
        .db-prod-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
        .db-prod-name{font-size:13.5px;font-weight:700;color:#0f172a;}
        .db-prod-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}
        .db-prod-nums{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;}
        .db-prod-num{background:#f8fafc;border-radius:8px;padding:10px;}
        .db-prod-num-val{font-family:'Space Mono',monospace;font-size:15px;font-weight:700;}
        .db-prod-num-lbl{font-size:10px;color:#94a3b8;margin-top:2px;text-transform:uppercase;letter-spacing:.04em;}
        .db-stock{background:linear-gradient(135deg,rgba(245,158,11,.08),rgba(234,88,12,.06));border:1px solid rgba(245,158,11,.2);border-radius:8px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
        .db-stock-lbl{font-size:11px;color:#92400e;font-weight:600;}
        .db-stock-val{font-family:'Space Mono',monospace;font-size:14px;font-weight:700;color:#d97706;}
        .db-prod-acc{display:flex;align-items:center;gap:8px;}
        .db-prod-acc-tr{flex:1;height:5px;background:#f1f5f9;border-radius:3px;overflow:hidden;}
        .db-prod-acc-fl{height:100%;border-radius:3px;transition:width 1s ease;}
        .db-prod-acc-v{font-size:11px;font-weight:700;font-family:'Space Mono',monospace;min-width:32px;text-align:right;}
        .db-empty{text-align:center;padding:60px 24px;}
        .db-empty-emoji{font-size:52px;margin-bottom:16px;}
        .db-empty-title{font-family:'Space Mono',monospace;font-size:18px;font-weight:700;color:#0f172a;margin-bottom:8px;}
        .db-empty-sub{font-size:14px;color:#64748b;margin-bottom:28px;line-height:1.7;}
        @media(max-width:1200px){.db-prod-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:1100px){.db-kpis{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:720px){.db-prod-grid{grid-template-columns:1fr}.db{padding:84px 14px 40px}.db-kpis{grid-template-columns:1fr 1fr}}
      `}</style>

      <div className="db">

        {/* Header */}
        <div className={`db-hdr ${show?"s":""}`}>
          <div>
            <p className="db-greet">Sales Intelligence Dashboard</p>
            <h1 className="db-h1">Hello, <span className="b">{firstName}</span> <span className="v">👋</span></h1>
            <p className="db-dt">{now.toLocaleDateString("en-IN",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p>
          </div>
          <div className="db-hdr-r">
            <div className="db-live">
              <span className="pulse-dot"/>
              LIVE · {now.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
            </div>
            <button className="db-btn db-btn-p" onClick={()=>navigate("/upload")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {hasData ? "New Forecast" : "Upload & Forecast"}
            </button>
          </div>
        </div>

        {/* Empty */}
        {!hasData && (
          <div className={`db-panel ${show?"s":""}`} style={{transitionDelay:".2s"}}>
            <div className="db-empty">
              <div className="db-empty-emoji">📊</div>
              <div className="db-empty-title">No Forecast Data Yet</div>
              <div className="db-empty-sub">Upload your sales CSV and run the ML model<br/>to see product-wise forecasts, stock needs, and charts here.</div>
              <button className="db-btn db-btn-p" onClick={()=>navigate("/upload")} style={{margin:"0 auto"}}>
                Upload Data & Run Forecast
              </button>
            </div>
          </div>
        )}

        {hasData && (<>

          {/* KPI Cards */}
          <div className="db-kpis">
            {kpis.map((k,i)=>(
              <div key={i} className={`db-kpi ${show?"s":""}`} style={{transitionDelay:`${.1+i*.07}s`}}>
                <div className="db-kpi-bar" style={{background:`linear-gradient(90deg,${k.color},${k.color}55)`}}/>
                <div className="db-kpi-lbl">{k.lbl}</div>
                <div className="db-kpi-val" style={{color:k.color}}>
                  <Counter value={k.val||0} prefix={k.prefix} suffix={k.suffix}/>
                </div>
                <div className="db-kpi-foot">
                  <span className="db-kpi-chg">{k.change}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Main Line Chart — 6 months actual + next month forecast */}
          <div className={`db-panel ${show?"s":""}`} style={{transitionDelay:".35s"}}>
            <div className="db-ph">
              <div>
                <div className="db-pt">Revenue — Actual vs Next Month Forecast</div>
                <div className="db-ps">Solid line = actual monthly sales · Dashed = next month ML prediction</div>
              </div>
              <div style={{display:"flex",gap:"8px"}}>
                <span className="db-tag db-tag-b">6M Actual</span>
                <span className="db-tag db-tag-v">1M Forecast</span>
              </div>
            </div>
            <div className="db-leg">
              <div className="db-leg-i"><div className="db-leg-line"/>Actual Revenue</div>
              <div className="db-leg-i"><div className="db-leg-dash"/>Next Month Forecast</div>
            </div>
            <ForecastLineChart actual={chart.actual} forecast={chart.forecast} labels={chart.labels} height={220}/>
          </div>

          {/* Next Month by Product + Stock */}
          <div className={`db-panel ${show?"s":""}`} style={{transitionDelay:".42s"}}>
            <div className="db-ph">
              <div>
                <div className="db-pt">Next Month Sales Forecast by Product</div>
                <div className="db-ps">Predicted revenue + estimated stock units needed</div>
              </div>
              <span className="db-tag db-tag-o">📦 Stock Planning</span>
            </div>
            {products.length > 0 ? (
              <div className="db-next-bars">
                {(()=>{
                  const maxF = Math.max(...products.map(p=>p.forecast||0),1);
                  return products.map((p,i)=>(
                    <div className="db-next-bar-item" key={i}>
                      <div style={{display:"flex",alignItems:"center",gap:"7px",minWidth:"110px"}}>
                        <div style={{width:"9px",height:"9px",borderRadius:"50%",background:COLORS[i%COLORS.length],flexShrink:0}}/>
                        <span className="db-next-bar-lbl">{p.product}</span>
                      </div>
                      <div className="db-next-bar-track">
                        <div className="db-next-bar-fill" style={{
                          width: show ? `${((p.forecast||0)/maxF)*100}%` : "0%",
                          background:`linear-gradient(90deg,${COLORS[i%COLORS.length]},${COLORS[i%COLORS.length]}88)`,
                          transitionDelay:`${i*0.1}s`
                        }}/>
                      </div>
                      <span className="db-next-bar-val" style={{color:COLORS[i%COLORS.length]}}>{fmt(p.forecast)}</span>
                      <span style={{fontFamily:"'Space Mono',monospace",fontSize:"11px",fontWeight:"700",color:"#d97706",minWidth:"76px",textAlign:"right",background:"rgba(245,158,11,.08)",padding:"3px 8px",borderRadius:"5px"}}>
                        📦 {getStockNeeded(p).toLocaleString()} units
                      </span>
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <div style={{textAlign:"center",padding:"24px",color:"#94a3b8",fontSize:"13px"}}>
                Add a "product" column in your CSV to see per-product forecasts
              </div>
            )}
          </div>

          {/* Product Breakdown Cards */}
          {products.length > 0 && (
            <div style={{marginBottom:"16px"}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:"11px",fontWeight:"700",color:"#64748b",letterSpacing:".08em",marginBottom:"12px"}}>
                PRODUCT BREAKDOWN
              </div>
              <div className="db-prod-grid">
                {products.map((p,i)=>{
                  const pChart = getProductChartData(p);
                  const stock  = getStockNeeded(p);
                  const color  = COLORS[i%COLORS.length];
                  return (
                    <div key={i} className={`db-prod-card ${show?"s":""}`}
                      style={{transitionDelay:`${.5+i*.08}s`,borderTop:`3px solid ${color}`}}>
                      <div className="db-prod-header">
                        <span className="db-prod-name">{p.product}</span>
                        <div className="db-prod-dot" style={{background:color}}/>
                      </div>

                      {/* Mini chart — uses product's OWN monthly sales data */}
                      <div style={{marginBottom:"12px",borderRadius:"8px",overflow:"hidden",background:"#fafbff",padding:"8px 4px 4px"}}>
                        <ProductLineChart actual={pChart.actual} forecast={pChart.forecast} color={color}/>
                        <div style={{display:"flex",gap:"14px",padding:"5px 4px 0",fontSize:"10px",color:"#94a3b8"}}>
                          <span style={{display:"flex",alignItems:"center",gap:"4px"}}>
                            <span style={{width:"12px",height:"2px",background:color,borderRadius:"2px",display:"inline-block"}}/>
                            Actual
                          </span>
                          <span style={{display:"flex",alignItems:"center",gap:"4px"}}>
                            <span style={{width:"16px",height:"2px",display:"inline-block",backgroundImage:`repeating-linear-gradient(90deg,${color} 0,${color} 4px,transparent 4px,transparent 7px)`,opacity:.6}}/>
                            Forecast
                          </span>
                        </div>
                      </div>

                      {/* Numbers */}
                      <div className="db-prod-nums">
                        <div className="db-prod-num">
                          <div className="db-prod-num-val" style={{color:"#2563eb",fontSize:"14px"}}>{fmt(p.actual)}</div>
                          <div className="db-prod-num-lbl">Actual Sales</div>
                        </div>
                        <div className="db-prod-num">
                          <div className="db-prod-num-val" style={{color,fontSize:"14px"}}>{fmt(p.forecast)}</div>
                          <div className="db-prod-num-lbl">Next Month</div>
                        </div>
                      </div>

                      {/* Stock needed */}
                      <div className="db-stock">
                        <span className="db-stock-lbl">📦 Stock Needed</span>
                        <span className="db-stock-val">{stock.toLocaleString()} units</span>
                      </div>

                      {/* Accuracy */}
                      <div className="db-prod-acc">
                        <div className="db-prod-acc-tr">
                          <div className="db-prod-acc-fl" style={{width:`${p.accuracy}%`,background:`linear-gradient(90deg,${color},${color}88)`}}/>
                        </div>
                        <span className="db-prod-acc-v" style={{color}}>{p.accuracy}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </>)}
      </div>
    </>
  );
};

export default Dashboard;