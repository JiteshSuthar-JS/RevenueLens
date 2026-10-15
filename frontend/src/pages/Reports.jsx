import { useState, useMemo } from "react";
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

const Reports = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("products"); // "products" | "monthly" | "daily"
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("forecast_desc"); // "forecast_desc" | "growth_desc" | "stock_desc" | "accuracy_desc"
  const [copiedNotification, setCopiedNotification] = useState("");

  const [results, setResults] = useState(() => {
    try {
      const saved = localStorage.getItem("forecastResults");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const loadDemoData = () => {
    localStorage.setItem("forecastResults", JSON.stringify(sampleData));
    setResults(sampleData);
  };

  const hasData = !!results;
  const products = useMemo(() => results?.products || [], [results]);
  const metrics = results?.metrics || {};

  // ── Filtered & Sorted Products ────────────────────────────────
  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (searchTerm.trim()) {
      list = list.filter((p) => p.product.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    list.sort((a, b) => {
      if (sortBy === "forecast_desc") return (b.forecast || 0) - (a.forecast || 0);
      if (sortBy === "growth_desc") return (b.growth || 0) - (a.growth || 0);
      if (sortBy === "stock_desc") return (b.stock_needed || 0) - (a.stock_needed || 0);
      if (sortBy === "accuracy_desc") return (b.accuracy || 0) - (a.accuracy || 0);
      return 0;
    });
    return list;
  }, [products, searchTerm, sortBy]);

  // ── CSV Export Function ───────────────────────────────────────
  const downloadCSV = () => {
    if (!results) return;

    let csvContent = "data:text/csv;charset=utf-8,";

    // Section 1: Executive Summary
    csvContent += "REVENUELENS EXECUTIVE REPORT\n";
    csvContent += `Generated On,${new Date().toLocaleDateString("en-IN")} ${new Date().toLocaleTimeString("en-IN")}\n`;
    csvContent += `Model Type,${metrics.model_type || "Ensemble Ridge + GradientBoosting"}\n`;
    csvContent += `Model Accuracy,${results.accuracy}%\n`;
    csvContent += `Total Recorded Revenue,${results.total_actual}\n`;
    csvContent += `Next Month Forecast,${results.next_month_total}\n`;
    csvContent += `Projected Growth Rate,${results.growth_rate}%\n\n`;

    // Section 2: Products Breakdown
    csvContent += "PRODUCT PERFORMANCE & INVENTORY LEDGER\n";
    csvContent += "Product,Historical Actual,Next Month Forecast,Revenue Share (%),Growth Rate (%),Recommended Stock Units,Average Unit Price,Accuracy (%)\n";
    products.forEach((p) => {
      csvContent += `"${p.product}",${p.actual},${p.forecast},${p.forecast_share || ""},${p.growth || 0}%,${p.stock_needed},${p.avg_price || ""},${p.accuracy || ""}\n`;
    });
    csvContent += "\n";

    // Section 3: Monthly Actuals vs Forecast
    csvContent += "MONTHLY REVENUE TRAJECTORY\n";
    csvContent += "Period,Type,Revenue\n";
    (results.last6_labels || []).forEach((lb, i) => {
      csvContent += `${lb},Actual,${results.last6_actual?.[i] || 0}\n`;
    });
    (results.forecast_3m_lb || [results.next_month_label || "Next"]).forEach((lb, i) => {
      csvContent += `${lb},Forecast,${results.forecast_3m?.[i] || results.next_month_total || 0}\n`;
    });
    csvContent += "\n";

    // Section 4: Daily Breakdown
    if (results.future_30days && results.future_30days.length > 0) {
      csvContent += "DAILY 30-DAY FORECAST SCHEDULE\n";
      csvContent += "Date,Day,Predicted Revenue,80% Lower Bound,80% Upper Bound\n";
      results.future_30days.forEach((d) => {
        csvContent += `${d.date},${d.day_name},${d.value},${d.lower_bound},${d.upper_bound}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RevenueLens_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification("CSV Report downloaded successfully!");
  };

  // ── JSON Export ──────────────────────────────────────────────
  const downloadJSON = () => {
    if (!results) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(results, null, 2));
    const dlAnchorElem = document.createElement("a");
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `RevenueLens_Forecast_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchorElem.click();
    showNotification("JSON Report exported!");
  };

  const showNotification = (msg) => {
    setCopiedNotification(msg);
    setTimeout(() => setCopiedNotification(""), 3000);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        .rep-page{min-height:100vh;background:#f0f2f8;font-family:'DM Sans',sans-serif;padding:84px 28px 52px;}
        .rep-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px;flex-wrap:wrap;gap:12px;}
        .rep-greet{font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:.12em;text-transform:uppercase;margin-bottom:3px;}
        .rep-h1{font-family:'Space Mono',monospace;font-size:22px;font-weight:700;color:#0f172a;}
        .rep-h1 .b{color:#2563eb} .rep-h1 .v{color:#7c3aed}
        .rep-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
        .rep-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:9px;font-family:'DM Sans',sans-serif;font-size:12.5px;font-weight:600;cursor:pointer;border:none;transition:all .2s;}
        .rep-btn-p{background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;box-shadow:0 3px 12px rgba(37,99,235,.25);}
        .rep-btn-p:hover{opacity:.92;transform:translateY(-1px);}
        .rep-btn-sec{background:#fff;border:1px solid #cbd5e1;color:#334155;}
        .rep-btn-sec:hover{background:#f8fafc;border-color:#94a3b8;}
        .rep-grid-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;}
        .rep-kpi{background:#fff;border:1px solid #e8edf6;border-radius:14px;padding:16px 18px;position:relative;overflow:hidden;}
        .rep-kpi-bar{position:absolute;top:0;left:0;right:0;height:3px;}
        .rep-kpi-lbl{font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.03em;margin-bottom:6px;}
        .rep-kpi-val{font-family:'Space Mono',monospace;font-size:21px;font-weight:700;color:#0f172a;line-height:1.2;}
        .rep-kpi-sub{font-size:11px;color:#64748b;margin-top:4px;}
        .rep-panel{background:#fff;border:1px solid #e8edf6;border-radius:16px;padding:22px;margin-bottom:16px;box-shadow:0 2px 10px rgba(15,23,42,.03);}
        .rep-tabs{display:flex;gap:8px;border-bottom:1px solid #e2e8f0;margin-bottom:18px;padding-bottom:1px;overflow-x:auto;}
        .rep-tab{padding:8px 16px;border:none;background:transparent;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;color:#64748b;cursor:pointer;position:relative;transition:all .2s;white-space:nowrap;}
        .rep-tab.active{color:#2563eb;}
        .rep-tab.active::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:2.5px;background:#2563eb;border-radius:2px 2px 0 0;}
        .rep-tools{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;}
        .rep-search{display:flex;align-items:center;gap:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:7px 12px;width:260px;}
        .rep-search input{border:none;background:transparent;outline:none;font-size:12.5px;font-family:'DM Sans',sans-serif;color:#0f172a;width:100%;}
        .rep-select{padding:7px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;font-size:12.5px;font-family:'DM Sans',sans-serif;color:#334155;outline:none;cursor:pointer;}
        .rep-table-wrap{overflow-x:auto;}
        .rep-table{width:100%;border-collapse:collapse;font-size:13px;}
        .rep-table th{background:#f8fafc;color:#64748b;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:12px 14px;text-align:left;border-bottom:1px solid #e2e8f0;}
        .rep-table td{padding:14px;border-bottom:1px solid #f1f5f9;color:#334155;}
        .rep-table tr:hover td{background:#fafcff;}
        .rep-badge{display:inline-block;padding:3px 8px;border-radius:5px;font-size:11px;font-weight:700;font-family:'Space Mono',monospace;}
        .rep-badge-g{background:#f0fdf4;color:#16a34a;}
        .rep-badge-r{background:#fef2f2;color:#dc2626;}
        .rep-badge-b{background:#eff6ff;color:#2563eb;}
        .rep-badge-o{background:#fffbeb;color:#d97706;}
        .rep-toast{position:fixed;bottom:24px;right:24px;background:#0f172a;color:#fff;padding:12px 20px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.25);font-size:13px;font-weight:600;z-index:999;animation:toastIn .25s ease;}
        @keyframes toastIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @media(max-width:1024px){.rep-grid-kpis{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:640px){.rep-grid-kpis{grid-template-columns:1fr}.rep-page{padding:84px 14px 40px}}
        @media print{
          nav,.rep-actions,.rep-tools,.view-toggle,.rep-tabs{display:none!important}
          .rep-page{padding:0!important;background:#fff!important}
          .rep-panel{box-shadow:none!important;border:1px solid #ccc!important}
        }
      `}</style>

      <div className="rep-page">
        {/* Header */}
        <div className="rep-hdr">
          <div>
            <p className="rep-greet">Executive Intelligence & Auditing</p>
            <h1 className="rep-h1">
              Revenue & Inventory <span className="b">Report</span> <span className="v">📑</span>
            </h1>
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>
              Granular performance breakdowns, multi-horizon forecasts, and printable executive summaries.
            </p>
          </div>

          <div className="rep-actions">
            {hasData && (
              <>
                <button className="rep-btn rep-btn-sec" onClick={downloadCSV}>
                  📥 Download CSV
                </button>
                <button className="rep-btn rep-btn-sec" onClick={downloadJSON}>
                  💾 Export JSON
                </button>
                <button className="rep-btn rep-btn-sec" onClick={() => window.print()}>
                  🖨️ Print / PDF
                </button>
              </>
            )}
            <button className="rep-btn rep-btn-p" onClick={() => navigate("/dashboard")}>
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {/* Empty State */}
        {!hasData && (
          <div className="rep-panel" style={{ textAlign: "center", padding: "64px 20px" }}>
            <div style={{ fontSize: "52px", marginBottom: "16px" }}>📑</div>
            <h2 style={{ fontFamily: "'Space Mono', monospace", fontSize: "19px", color: "#0f172a", marginBottom: "8px" }}>
              No Report Data Available
            </h2>
            <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "24px", lineHeight: "1.6" }}>
              Upload a sales or transactions dataset to generate detailed multi-horizon reports,
              <br />
              or instantly explore with sample data.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button className="rep-btn rep-btn-p" onClick={() => navigate("/upload")}>
                Upload Sales Dataset
              </button>
              <button className="rep-btn rep-btn-sec" onClick={loadDemoData}>
                ✨ Load Sample Demo Report
              </button>
            </div>
          </div>
        )}

        {hasData && (
          <>
            {/* Top Metric Cards */}
            <div className="rep-grid-kpis">
              <div className="rep-kpi">
                <div className="rep-kpi-bar" style={{ background: "#2563eb" }} />
                <div className="rep-kpi-lbl">Total Recorded Sales</div>
                <div className="rep-kpi-val" style={{ color: "#2563eb" }}>
                  {fmt(results.total_actual)}
                </div>
                <div className="rep-kpi-sub">
                  Across {results.rows?.toLocaleString() || "all"} transaction records
                </div>
              </div>

              <div className="rep-kpi">
                <div className="rep-kpi-bar" style={{ background: "#7c3aed" }} />
                <div className="rep-kpi-lbl">Next Month Projection</div>
                <div className="rep-kpi-val" style={{ color: "#7c3aed" }}>
                  {fmt(results.next_month_total)}
                </div>
                <div className="rep-kpi-sub">
                  Target Period: <strong>{results.next_month_label || "Next Month"}</strong>
                </div>
              </div>

              <div className="rep-kpi">
                <div className="rep-kpi-bar" style={{ background: results.growth_rate >= 0 ? "#16a34a" : "#dc2626" }} />
                <div className="rep-kpi-lbl">Projected MoM Trajectory</div>
                <div
                  className="rep-kpi-val"
                  style={{ color: results.growth_rate >= 0 ? "#16a34a" : "#dc2626" }}
                >
                  {results.growth_rate !== undefined ? (results.growth_rate >= 0 ? `+${results.growth_rate}%` : `${results.growth_rate}%`) : "Stable"}
                </div>
                <div className="rep-kpi-sub">Compared to last historical month</div>
              </div>

              <div className="rep-kpi">
                <div className="rep-kpi-bar" style={{ background: "#f59e0b" }} />
                <div className="rep-kpi-lbl">Total Recommended Inventory</div>
                <div className="rep-kpi-val" style={{ color: "#d97706" }}>
                  {metrics.total_stock_needed
                    ? `${metrics.total_stock_needed.toLocaleString()} units`
                    : `${products.reduce((acc, p) => acc + (p.stock_needed || 0), 0).toLocaleString()} units`}
                </div>
                <div className="rep-kpi-sub">
                  Top Demand: <strong>{metrics.top_product || products[0]?.product || "N/A"}</strong>
                </div>
              </div>
            </div>

            {/* Main Interactive Table & Report Tabs */}
            <div className="rep-panel">
              {/* Navigation Tabs */}
              <div className="rep-tabs">
                <button
                  className={`rep-tab ${activeTab === "products" ? "active" : ""}`}
                  onClick={() => setActiveTab("products")}
                >
                  📦 Product Performance & Stock ({products.length})
                </button>
                <button
                  className={`rep-tab ${activeTab === "monthly" ? "active" : ""}`}
                  onClick={() => setActiveTab("monthly")}
                >
                  📅 Monthly History & 3-Month Projection
                </button>
                <button
                  className={`rep-tab ${activeTab === "daily" ? "active" : ""}`}
                  onClick={() => setActiveTab("daily")}
                >
                  📈 30-Day Daily Forecast Ledger
                </button>
              </div>

              {/* Tab 1: Products Ledger */}
              {activeTab === "products" && (
                <>
                  <div className="rep-tools">
                    <div className="rep-search">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search product or category..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>Sort by:</span>
                      <select
                        className="rep-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                      >
                        <option value="forecast_desc">Forecasted Revenue (High to Low)</option>
                        <option value="growth_desc">Projected Growth Rate</option>
                        <option value="stock_desc">Recommended Stock Needed</option>
                        <option value="accuracy_desc">Model Confidence Score</option>
                      </select>
                    </div>
                  </div>

                  <div className="rep-table-wrap">
                    <table className="rep-table">
                      <thead>
                        <tr>
                          <th>Product / Category</th>
                          <th>Historical Sales</th>
                          <th>Next Month Forecast</th>
                          <th>Revenue Share</th>
                          <th>MoM Trend</th>
                          <th>Stock Required</th>
                          <th>Est. Unit Price</th>
                          <th>Model Accuracy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map((p, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: "600", color: "#0f172a" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <div
                                  style={{
                                    width: "8px",
                                    height: "8px",
                                    borderRadius: "50%",
                                    background: COLORS[i % COLORS.length],
                                  }}
                                />
                                {p.product}
                              </div>
                            </td>
                            <td style={{ fontFamily: "'Space Mono', monospace" }}>{fmt(p.actual)}</td>
                            <td style={{ fontFamily: "'Space Mono', monospace", fontWeight: "700", color: "#2563eb" }}>
                              {fmt(p.forecast)}
                            </td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "11.5px" }}>
                                  {p.forecast_share !== undefined ? `${p.forecast_share}%` : "—"}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className={`rep-badge ${p.growth >= 0 ? "rep-badge-g" : "rep-badge-r"}`}>
                                {p.growth >= 0 ? `+${p.growth}%` : `${p.growth}%`}
                              </span>
                            </td>
                            <td>
                              <span className="rep-badge rep-badge-o">
                                📦 {p.stock_needed.toLocaleString()} units
                              </span>
                            </td>
                            <td style={{ fontFamily: "'Space Mono', monospace", color: "#64748b" }}>
                              {p.avg_price ? `₹${p.avg_price}` : "—"}
                            </td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <div style={{ width: "40px", height: "4px", background: "#f1f5f9", borderRadius: "2px", overflow: "hidden" }}>
                                  <div style={{ width: `${p.accuracy || 85}%`, height: "100%", background: "#16a34a" }} />
                                </div>
                                <span style={{ fontSize: "11px", fontWeight: "700", fontFamily: "'Space Mono', monospace", color: "#16a34a" }}>
                                  {p.accuracy || 85}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Tab 2: Monthly Comparison Ledger */}
              {activeTab === "monthly" && (
                <div className="rep-table-wrap">
                  <table className="rep-table">
                    <thead>
                      <tr>
                        <th>Time Period</th>
                        <th>Classification</th>
                        <th>Total Revenue</th>
                        <th>Status</th>
                        <th>Variance vs Previous</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(results.last6_labels || []).map((lb, idx) => {
                        const val = results.last6_actual?.[idx] || 0;
                        const prevVal = idx > 0 ? results.last6_actual?.[idx - 1] : null;
                        const change = prevVal ? roundNum(((val - prevVal) / prevVal) * 100) : null;
                        return (
                          <tr key={`act_${idx}`}>
                            <td style={{ fontWeight: "600", fontFamily: "'Space Mono', monospace" }}>{lb}</td>
                            <td>
                              <span className="rep-badge rep-badge-b">Historical Actual</span>
                            </td>
                            <td style={{ fontFamily: "'Space Mono', monospace", fontWeight: "700" }}>{fmt(val)}</td>
                            <td>
                              <span style={{ color: "#16a34a", fontSize: "12px", fontWeight: "600" }}>
                                ✓ Verified Ledger
                              </span>
                            </td>
                            <td>
                              {change !== null ? (
                                <span className={`rep-badge ${change >= 0 ? "rep-badge-g" : "rep-badge-r"}`}>
                                  {change >= 0 ? `+${change}%` : `${change}%`}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Forecast Periods */}
                      {(results.forecast_3m_lb || [results.next_month_label || "Next Month"]).map((lb, idx) => {
                        const val = results.forecast_3m?.[idx] || results.next_month_total || 0;
                        const lastAct = results.last6_actual?.[results.last6_actual.length - 1];
                        const change = idx === 0 && lastAct ? roundNum(((val - lastAct) / lastAct) * 100) : null;
                        return (
                          <tr key={`fc_${idx}`} style={{ background: "#fbfaff" }}>
                            <td style={{ fontWeight: "700", fontFamily: "'Space Mono', monospace", color: "#7c3aed" }}>
                              {lb}
                            </td>
                            <td>
                              <span className="rep-badge" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
                                AI Forecast (Month {idx + 1})
                              </span>
                            </td>
                            <td style={{ fontFamily: "'Space Mono', monospace", fontWeight: "700", color: "#7c3aed" }}>
                              {fmt(val)}
                            </td>
                            <td>
                              <span style={{ color: "#7c3aed", fontSize: "12px", fontWeight: "600" }}>
                                ⚡ Ensemble Projected
                              </span>
                            </td>
                            <td>
                              {change !== null ? (
                                <span className={`rep-badge ${change >= 0 ? "rep-badge-g" : "rep-badge-r"}`}>
                                  {change >= 0 ? `+${change}%` : `${change}%`}
                                </span>
                              ) : (
                                "Projected"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 3: Daily Breakdown Ledger */}
              {activeTab === "daily" && (
                <div className="rep-table-wrap">
                  <table className="rep-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Day of Week</th>
                        <th>Predicted Daily Revenue</th>
                        <th>80% Lower Bound</th>
                        <th>80% Upper Bound</th>
                        <th>Confidence Range</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(results.future_30days || []).map((d, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: "600", fontFamily: "'Space Mono', monospace" }}>{d.date}</td>
                          <td>
                            <span
                              className="rep-badge"
                              style={{
                                background: d.day_name === "Sun" || d.day_name === "Sat" ? "#fef3c7" : "#f1f5f9",
                                color: d.day_name === "Sun" || d.day_name === "Sat" ? "#b45309" : "#475569",
                              }}
                            >
                              {d.day_name}
                            </span>
                          </td>
                          <td style={{ fontFamily: "'Space Mono', monospace", fontWeight: "700", color: "#7c3aed" }}>
                            {fmt(d.value)}
                          </td>
                          <td style={{ fontFamily: "'Space Mono', monospace", color: "#64748b" }}>
                            {fmt(d.lower_bound)}
                          </td>
                          <td style={{ fontFamily: "'Space Mono', monospace", color: "#64748b" }}>
                            {fmt(d.upper_bound)}
                          </td>
                          <td>
                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                              ±{roundNum(((d.upper_bound - d.lower_bound) / (2 * d.value)) * 100)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Model Architecture & Integrity Audit Card */}
            <div className="rep-panel" style={{ borderLeft: "4px solid #7c3aed" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                <h3 style={{ fontFamily: "'Space Mono', monospace", fontSize: "14px", color: "#0f172a" }}>
                  MODEL INTEGRITY & AUDIT TRAIL
                </h3>
                <span className="rep-badge rep-badge-g">✓ Validated Score: {results.accuracy}%</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", fontSize: "12.5px", color: "#475569" }}>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: "11px", textTransform: "uppercase" }}>Algorithm Engine</div>
                  <div style={{ fontWeight: "600", marginTop: "2px" }}>
                    {metrics.model_type || "Ridge Regression + Gradient Boosted Regressor"}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: "11px", textTransform: "uppercase" }}>Dataset Date Coverage</div>
                  <div style={{ fontWeight: "600", marginTop: "2px" }}>
                    {metrics.date_range || "Chronological series"}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: "11px", textTransform: "uppercase" }}>Historical Peak Month</div>
                  <div style={{ fontWeight: "600", marginTop: "2px" }}>
                    {metrics.peak_month ? `${metrics.peak_month} (${fmt(metrics.peak_month_value)})` : "N/A"}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: "11px", textTransform: "uppercase" }}>Avg Order Value (AOV)</div>
                  <div style={{ fontWeight: "600", marginTop: "2px" }}>
                    {metrics.avg_order_value ? fmt(metrics.avg_order_value) : "—"}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Floating Toast Notification */}
        {copiedNotification && <div className="rep-toast">{copiedNotification}</div>}
      </div>
    </>
  );
};

function roundNum(n) {
  return Math.round(n * 10) / 10;
}

export default Reports;