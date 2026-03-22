// function Dashboard() {
//   return (
//     <div className="dashboard">
//       <h1>Welcome to RevenueLens Dashboard</h1>
//       <p>This is where you'll see your revenue forecasts, upload data, and access reports.</p>
//     </div>
//   );
// }

// export default Dashboard;

import { useState, useEffect } from "react";

// ── Sparkline ─────────────────────────────────────────────
const Sparkline = ({ data, color }) => {
  const w = 120, h = 40;
  const min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 8) - 4;
    return `${x},${y}`;
  }).join(" ");
  const areaBottom = h;
  const areaPath = `M0,${areaBottom} ${data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 8) - 4;
    return `L${x},${y}`;
  }).join(" ")} L${w},${areaBottom} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={`sg${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#sg${color.replace("#","")})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

// ── Bar Chart ─────────────────────────────────────────────
const BarChart = ({ actual, forecast, labels }) => {
  const max = Math.max(...actual, ...forecast);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:"8px", height:"160px" }}>
      {labels.map((l, i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"4px" }}>
          <div style={{ width:"100%", display:"flex", gap:"3px", alignItems:"flex-end", height:"136px" }}>
            <div style={{ flex:1, borderRadius:"4px 4px 0 0", background:"#2563eb", height:`${(actual[i]/max)*100}%`, transition:"height 0.7s ease" }}/>
            <div style={{ flex:1, borderRadius:"4px 4px 0 0", background:"#7c3aed", height:`${(forecast[i]/max)*100}%`, opacity:0.75, transition:"height 0.9s ease" }}/>
          </div>
          <span style={{ fontSize:"10px", color:"#94a3b8", fontFamily:"'DM Sans',sans-serif" }}>{l}</span>
        </div>
      ))}
    </div>
  );
};

// ── Donut Chart ───────────────────────────────────────────
const DonutChart = ({ segments }) => {
  const r = 52, stroke = 20, cx = 70, cy = 70;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + s.value, 0);
  let off = 0;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke}/>
      {segments.map((s, i) => {
        const dash = (s.value / total) * circ;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-off}
            style={{ transform:"rotate(-90deg)", transformOrigin:"center" }}
          />
        );
        off += dash + 2;
        return el;
      })}
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize="18" fontWeight="700" fill="#0f172a" fontFamily="'Space Mono',monospace">94%</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="'DM Sans',sans-serif">ACCURACY</text>
    </svg>
  );
};

// ── Line Chart ────────────────────────────────────────────
const LineChart = ({ actual, forecast, labels }) => {
  const W = 600, H = 150;
  const all = [...actual, ...forecast];
  const min = Math.min(...all) * 0.9, max = Math.max(...all) * 1.05;
  const totalPts = labels.length;
  const toX = i => 24 + (i / (totalPts - 1)) * (W - 48);
  const toY = v => H - 20 - ((v - min) / (max - min)) * (H - 36);
  const aPts = actual.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const fPts = forecast.map((v, i) => `${toX(i + actual.length - 1)},${toY(v)}`).join(" ");
  const splitX = toX(actual.length - 1);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.12"/>
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.12"/>
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0,1,2,3].map(i => (
        <line key={i} x1="24" x2={W-24} y1={20+i*((H-36)/3)} y2={20+i*((H-36)/3)} stroke="#f1f5f9" strokeWidth="1"/>
      ))}
      <path d={`M${toX(0)},${H-20} ${actual.map((v,i)=>`L${toX(i)},${toY(v)}`).join(" ")} L${splitX},${H-20} Z`} fill="url(#ag)"/>
      <path d={`M${splitX},${H-20} ${forecast.map((v,i)=>`L${toX(i+actual.length-1)},${toY(v)}`).join(" ")} L${toX(totalPts-1)},${H-20} Z`} fill="url(#fg)"/>
      <polyline points={aPts} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points={fPts} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 4"/>
      <line x1={splitX} y1="10" x2={splitX} y2={H-10} stroke="#e2e8f4" strokeWidth="1.5" strokeDasharray="4 3"/>
      {labels.map((l, i) => (
        <text key={i} x={toX(i)} y={H-4} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="'DM Sans',sans-serif">{l}</text>
      ))}
    </svg>
  );
};

// ── DASHBOARD ─────────────────────────────────────────────
const Dashboard = () => {
  const stored = localStorage.getItem("user");
  const user = stored ? JSON.parse(stored) : { name: "User" };
  const firstName = user.name?.split(" ")[0] || "User";
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 80); }, []);

  const cards = [
    { label: "Total Revenue",        value: "₹24.8L",  change: "+12.4%", up: true,  color: "#2563eb", spark: [40,55,48,70,63,80,75,92,88,105] },
    { label: "Forecasted (Next 30d)", value: "₹31.2L",  change: "+25.8%", up: true,  color: "#7c3aed", spark: [75,82,78,90,95,88,102,110,108,120] },
    { label: "Units Sold",            value: "18,430",  change: "+8.2%",  up: true,  color: "#0891b2", spark: [30,38,35,42,40,50,47,55,52,60] },
    { label: "Avg Order Value",       value: "₹1,347",  change: "-2.1%",  up: false, color: "#dc2626", spark: [60,58,62,55,57,52,54,50,51,48] },
  ];

  const forecasts = [
    { product:"Product Alpha",  actual:"₹4.2L", forecast:"₹5.1L", acc:96 },
    { product:"Product Beta",   actual:"₹3.8L", forecast:"₹4.4L", acc:91 },
    { product:"Product Gamma",  actual:"₹2.1L", forecast:"₹1.9L", acc:88 },
    { product:"Product Delta",  actual:"₹5.5L", forecast:"₹6.2L", acc:94 },
    { product:"Product Epsilon",actual:"₹1.7L", forecast:"₹2.0L", acc:82 },
  ];

  const donut = [
    { label:"Linear Reg.", value:35, color:"#2563eb" },
    { label:"ARIMA",       value:28, color:"#7c3aed" },
    { label:"XGBoost",     value:22, color:"#0891b2" },
    { label:"LSTM",        value:15, color:"#f59e0b" },
  ];

  const activity = [
    { color:"#22c55e", text:"Model retrained with 18,430 rows",    time:"2 hours ago" },
    { color:"#2563eb", text:"Forecast generated for Apr–Jun 2025", time:"2 hours ago" },
    { color:"#f59e0b", text:"CSV uploaded: sales_q1_2025.csv",     time:"5 hours ago" },
    { color:"#7c3aed", text:"ARIMA model tuning completed",         time:"Yesterday"   },
    { color:"#0891b2", text:"Monthly report exported by Admin",     time:"Yesterday"   },
    { color:"#94a3b8", text:"System health check passed",           time:"2 days ago"  },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

        .db { min-height:100vh; background:#f4f6fb; font-family:'DM Sans',sans-serif; padding:84px 32px 48px; }

        /* header */
        .db-hdr { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; opacity:0; transform:translateY(12px); transition:opacity .4s,transform .4s; }
        .db-hdr.s { opacity:1; transform:none; }
        .db-greet { font-size:11px; font-weight:600; color:#94a3b8; letter-spacing:.1em; text-transform:uppercase; margin-bottom:4px; }
        .db-h1 { font-family:'Space Mono',monospace; font-size:24px; font-weight:700; color:#0f172a; letter-spacing:-.02em; }
        .db-h1 .b { color:#2563eb; } .db-h1 .v { color:#7c3aed; }
        .db-dt { font-size:12px; color:#94a3b8; margin-top:4px; }
        .db-hdr-r { display:flex; gap:10px; align-items:center; }
        .db-btn { display:inline-flex; align-items:center; gap:6px; padding:9px 16px; border-radius:8px; font-family:'DM Sans',sans-serif; font-size:13px; font-weight:600; cursor:pointer; border:none; transition:all .2s; }
        .db-btn-o { background:#fff; color:#374151; border:1.5px solid #e2e8f4; }
        .db-btn-o:hover { border-color:#2563eb; color:#2563eb; }
        .db-btn-p { background:linear-gradient(135deg,#2563eb,#7c3aed); color:#fff; box-shadow:0 3px 12px rgba(37,99,235,.25); }
        .db-btn-p:hover { opacity:.9; transform:translateY(-1px); }
        .db-btn svg { width:14px; height:14px; }

        /* status */
        .db-status { display:flex; align-items:center; gap:20px; flex-wrap:wrap; background:#fff; border:1px solid #e2e8f4; border-radius:10px; padding:10px 18px; margin-bottom:24px; font-family:'Space Mono',monospace; font-size:10px; color:#64748b; opacity:0; transition:opacity .4s .1s; }
        .db-status.s { opacity:1; }
        .db-si { display:flex; align-items:center; gap:7px; }
        .pulse { width:7px; height:7px; border-radius:50%; background:#22c55e; box-shadow:0 0 6px #22c55e; animation:pulse 2s infinite; }
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}

        /* stat cards */
        .db-cards { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:20px; }
        .db-card { background:#fff; border:1px solid #e2e8f4; border-radius:14px; padding:20px; opacity:0; transform:translateY(16px); transition:opacity .4s,transform .4s,box-shadow .2s; }
        .db-card.s { opacity:1; transform:none; }
        .db-card:hover { box-shadow:0 6px 24px rgba(15,23,42,.08); }
        .db-card-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; }
        .db-card-lbl { font-size:11.5px; font-weight:600; color:#94a3b8; letter-spacing:.04em; text-transform:uppercase; }
        .db-badge { font-size:11px; font-weight:700; padding:3px 8px; border-radius:20px; }
        .db-badge.up { background:#f0fdf4; color:#16a34a; }
        .db-badge.dn { background:#fef2f2; color:#dc2626; }
        .db-card-val { font-family:'Space Mono',monospace; font-size:26px; font-weight:700; letter-spacing:-.02em; margin-bottom:10px; }

        /* panel */
        .db-panel { background:#fff; border:1px solid #e2e8f4; border-radius:14px; padding:22px; opacity:0; transform:translateY(16px); transition:opacity .4s,transform .4s; }
        .db-panel.s { opacity:1; transform:none; }
        .db-ph { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; }
        .db-pt { font-family:'Space Mono',monospace; font-size:13px; font-weight:700; color:#0f172a; }
        .db-ps { font-size:11.5px; color:#94a3b8; margin-top:3px; }
        .db-tag { font-size:10px; font-weight:700; font-family:'Space Mono',monospace; padding:3px 9px; border-radius:4px; }
        .db-tag-b { background:rgba(37,99,235,.08);  color:#2563eb; }
        .db-tag-v { background:rgba(124,58,237,.08); color:#7c3aed; }
        .db-tag-g { background:rgba(22,163,74,.08);  color:#16a34a; }

        /* legend */
        .db-leg { display:flex; gap:16px; margin-bottom:12px; }
        .db-leg-i { display:flex; align-items:center; gap:6px; font-size:11.5px; color:#64748b; }
        .db-leg-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .db-leg-dash { width:18px; height:2px; background:repeating-linear-gradient(90deg,#7c3aed 0,#7c3aed 5px,transparent 5px,transparent 9px); }

        /* grid */
        .db-g2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
        .db-g31 { display:grid; grid-template-columns:2fr 1fr; gap:16px; }

        /* table */
        .db-tbl { width:100%; border-collapse:collapse; }
        .db-tbl th { font-size:10.5px; font-weight:700; color:#94a3b8; letter-spacing:.06em; text-transform:uppercase; text-align:left; padding:0 0 12px; border-bottom:1px solid #f1f5f9; }
        .db-tbl td { padding:11px 0; border-bottom:1px solid #f8fafc; font-size:13.5px; color:#374151; vertical-align:middle; }
        .db-tbl tr:last-child td { border-bottom:none; }
        .db-tbl tr:hover td { background:#fafbff; }
        .db-acc { display:flex; align-items:center; gap:8px; }
        .db-acc-tr { flex:1; height:5px; background:#f1f5f9; border-radius:3px; overflow:hidden; }
        .db-acc-fl { height:100%; border-radius:3px; background:linear-gradient(90deg,#2563eb,#7c3aed); }
        .db-acc-v { font-size:11px; font-weight:700; font-family:'Space Mono',monospace; color:#2563eb; min-width:32px; text-align:right; }

        /* donut */
        .db-donut-w { display:flex; align-items:center; gap:20px; }
        .db-donut-l { display:flex; flex-direction:column; gap:10px; flex:1; }
        .db-donut-i { display:flex; align-items:center; justify-content:space-between; font-size:12.5px; }
        .db-donut-lb { display:flex; align-items:center; gap:8px; color:#374151; }
        .db-donut-sw { width:10px; height:10px; border-radius:3px; flex-shrink:0; }
        .db-donut-pct { font-family:'Space Mono',monospace; font-size:11px; font-weight:700; color:#64748b; }

        /* activity */
        .db-act { display:flex; flex-direction:column; gap:14px; }
        .db-act-i { display:flex; gap:12px; align-items:flex-start; }
        .db-act-dot { width:8px; height:8px; border-radius:50%; margin-top:5px; flex-shrink:0; }
        .db-act-txt { font-size:13px; color:#374151; line-height:1.4; }
        .db-act-tm { font-size:11px; color:#94a3b8; margin-top:2px; }

        @media(max-width:1100px){
          .db-cards{grid-template-columns:repeat(2,1fr)}
          .db-g2,.db-g31{grid-template-columns:1fr}
        }
        @media(max-width:640px){
          .db{padding:84px 16px 32px}
          .db-cards{grid-template-columns:1fr 1fr}
          .db-hdr-r{display:none}
        }
      `}</style>

      <div className="db">

        {/* Header */}
        <div className={`db-hdr ${show?"s":""}`}>
          <div>
            <p className="db-greet">Welcome back</p>
            <h1 className="db-h1">Hello, <span className="b">{firstName}</span> 👋</h1>
            <p className="db-dt">{new Date().toLocaleDateString("en-IN",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p>
          </div>
          <div className="db-hdr-r">
            <button className="db-btn db-btn-o">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export Report
            </button>
            <button className="db-btn db-btn-p">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              Run Forecast
            </button>
          </div>
        </div>

        {/* Status */}
        <div className={`db-status ${show?"s":""}`}>
          <div className="db-si"><span className="pulse"/><span>MODEL ACTIVE — XGBOOST v2.1</span></div>
          <div className="db-si">LAST TRAINED: 2 HOURS AGO</div>
          <div className="db-si">ACCURACY: 94.2%</div>
          <div className="db-si">DATASET: 18,430 ROWS</div>
          <div className="db-si" style={{marginLeft:"auto"}}>NEXT AUTO-TRAIN: 22:00 IST</div>
        </div>

        {/* Stat Cards */}
        <div className="db-cards">
          {cards.map((c,i)=>(
            <div key={i} className={`db-card ${show?"s":""}`} style={{transitionDelay:`${.1+i*.07}s`}}>
              <div className="db-card-top">
                <span className="db-card-lbl">{c.label}</span>
                <span className={`db-badge ${c.up?"up":"dn"}`}>{c.up?"▲":"▼"} {c.change}</span>
              </div>
              <div className="db-card-val" style={{color:c.color}}>{c.value}</div>
              <Sparkline data={c.spark} color={c.color}/>
            </div>
          ))}
        </div>

        {/* Line Chart */}
        <div className={`db-panel ${show?"s":""}`} style={{marginBottom:"16px",transitionDelay:".35s"}}>
          <div className="db-ph">
            <div>
              <div className="db-pt">Revenue Forecast Overview</div>
              <div className="db-ps">Actual vs ML-predicted revenue (Aug 2024 – Jul 2025)</div>
            </div>
            <div style={{display:"flex",gap:"8px"}}>
              <span className="db-tag db-tag-b">Actual</span>
              <span className="db-tag db-tag-v">Forecast</span>
            </div>
          </div>
          <div className="db-leg">
            <div className="db-leg-i"><div className="db-leg-dot" style={{background:"#2563eb"}}/>Actual Revenue</div>
            <div className="db-leg-i"><div className="db-leg-dash"/>Forecasted Revenue</div>
          </div>
          <LineChart
            actual={[38,45,42,58,55,70,65,80]}
            forecast={[80,88,92,98,105]}
            labels={["Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun","Jul"]}
          />
        </div>

        {/* Bar + Donut */}
        <div className="db-g2" style={{marginBottom:"16px"}}>
          <div className={`db-panel ${show?"s":""}`} style={{transitionDelay:".42s"}}>
            <div className="db-ph">
              <div><div className="db-pt">Monthly Sales Comparison</div><div className="db-ps">Actual vs Forecast by month</div></div>
              <span className="db-tag db-tag-g">6 Months</span>
            </div>
            <div className="db-leg" style={{marginBottom:"12px"}}>
              <div className="db-leg-i"><div className="db-leg-dot" style={{background:"#2563eb"}}/>Actual</div>
              <div className="db-leg-i"><div className="db-leg-dot" style={{background:"#7c3aed",opacity:.75}}/>Forecast</div>
            </div>
            <BarChart
              actual={[42,58,51,67,72,65]}
              forecast={[48,63,58,74,80,76]}
              labels={["Oct","Nov","Dec","Jan","Feb","Mar"]}
            />
          </div>

          <div className={`db-panel ${show?"s":""}`} style={{transitionDelay:".48s"}}>
            <div className="db-ph">
              <div><div className="db-pt">Model Distribution</div><div className="db-ps">Ensemble weighting</div></div>
            </div>
            <div className="db-donut-w">
              <DonutChart segments={donut}/>
              <div className="db-donut-l">
                {donut.map((s,i)=>(
                  <div className="db-donut-i" key={i}>
                    <div className="db-donut-lb"><div className="db-donut-sw" style={{background:s.color}}/>{s.label}</div>
                    <span className="db-donut-pct">{s.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Table + Activity */}
        <div className="db-g31">
          <div className={`db-panel ${show?"s":""}`} style={{transitionDelay:".54s"}}>
            <div className="db-ph">
              <div><div className="db-pt">Product Forecast Accuracy</div><div className="db-ps">Per-product ML predictions</div></div>
              <span className="db-tag db-tag-b">This Month</span>
            </div>
            <table className="db-tbl">
              <thead>
                <tr><th>Product</th><th>Actual</th><th>Forecast</th><th>Accuracy</th></tr>
              </thead>
              <tbody>
                {forecasts.map((f,i)=>(
                  <tr key={i}>
                    <td style={{fontWeight:600,color:"#0f172a"}}>{f.product}</td>
                    <td>{f.actual}</td>
                    <td style={{color:"#7c3aed",fontWeight:600}}>{f.forecast}</td>
                    <td>
                      <div className="db-acc">
                        <div className="db-acc-tr"><div className="db-acc-fl" style={{width:`${f.acc}%`}}/></div>
                        <span className="db-acc-v">{f.acc}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={`db-panel ${show?"s":""}`} style={{transitionDelay:".6s"}}>
            <div className="db-ph">
              <div><div className="db-pt">Recent Activity</div><div className="db-ps">System log</div></div>
            </div>
            <div className="db-act">
              {activity.map((a,i)=>(
                <div className="db-act-i" key={i}>
                  <div className="db-act-dot" style={{background:a.color}}/>
                  <div>
                    <div className="db-act-txt">{a.text}</div>
                    <div className="db-act-tm">{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </>
  );
};

export default Dashboard;