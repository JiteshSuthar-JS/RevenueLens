import { useState, useMemo, useRef } from "react";
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

// Helper to determine whether on-hand stock has been uploaded / provided
const isStockAvailable = (p) => {
  return (
    (p.stock_source === "UPLOADED_STOCK_FILE" || p.stock_source === "DATA_PROVIDED") &&
    p.current_stock !== null &&
    p.current_stock !== undefined
  );
};

// Helper to recalculate supply chain metrics when current stock is uploaded
const recalculateItemMetrics = (item, newStock) => {
  const stock = Math.max(0, parseInt(newStock, 10) || 0);
  const units = item.forecast_units || Math.round(item.forecast / (item.avg_price || 1));
  const leadTime = item.lead_time_days || 14;
  const dRate = item.daily_demand || (units > 0 ? units / 30.0 : 1.0);
  const safetyStock = item.safety_stock || Math.round(dRate * Math.sqrt(leadTime) * 1.645);
  const rop = item.reorder_point || Math.round(dRate * leadTime + safetyStock);
  const coverageDays = dRate > 0 ? Math.round((stock / dRate) * 10) / 10 : 999;

  // When current stock is uploaded, stock needed is based on the stock deficit vs forecast demand
  const stockNeeded = Math.max(0, units - stock);

  // Risk & Status
  let status = "OPTIMAL";
  let riskLevel = "LOW";
  if (stock <= 0) {
    status = "OUT_OF_STOCK";
    riskLevel = "CRITICAL";
  } else if (stock <= Math.round(dRate * leadTime)) {
    status = "CRITICAL";
    riskLevel = "HIGH";
  } else if (stock < units) {
    status = "REORDER_NOW";
    riskLevel = "MEDIUM";
  } else if (coverageDays > 60 || stock > units * 2) {
    status = "OVERSTOCK";
    riskLevel = "WARNING";
  }

  return {
    ...item,
    current_stock: stock,
    stock_source: "UPLOADED_STOCK_FILE",
    safety_stock: safetyStock,
    reorder_point: rop,
    suggested_order_qty: stockNeeded,
    coverage_days: coverageDays,
    stock_status: status,
    risk_level: riskLevel,
    stock_needed: stockNeeded,
  };
};

const Reports = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Active Tab: only Inventory Ledger & Model Scorecard
  const [activeTab, setActiveTab] = useState("inventory"); // "inventory" | "models"
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [notification, setNotification] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [customStockCount, setCustomStockCount] = useState(0);

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
    setCustomStockCount(0);
    showNotification("Demo dataset loaded! Current stock shows '-' until a stock file is uploaded.");
  };

  const hasData = !!results;
  const products = useMemo(() => results?.products || [], [results]);
  const scorecard = useMemo(() => results?.scorecard || [], [results]);

  // Check if any product has uploaded stock
  const hasUploadedStock = useMemo(() => {
    return products.some((p) => isStockAvailable(p));
  }, [products]);

  // Totals
  const totalForecastDemand = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.forecast_units || Math.round(p.forecast / (p.avg_price || 1))), 0);
  }, [products]);

  const totalCurrentStock = useMemo(() => {
    if (!hasUploadedStock) return null;
    return products.reduce((acc, p) => acc + (isStockAvailable(p) ? p.current_stock || 0 : 0), 0);
  }, [products, hasUploadedStock]);

  const totalStockNeeded = useMemo(() => {
    if (!hasUploadedStock) return totalForecastDemand;
    return products.reduce((acc, p) => {
      const units = p.forecast_units || Math.round(p.forecast / (p.avg_price || 1));
      if (isStockAvailable(p)) {
        return acc + Math.max(0, units - (p.current_stock || 0));
      }
      return acc + units;
    }, 0);
  }, [products, hasUploadedStock, totalForecastDemand]);

  // ── Filtered Products ─────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (searchTerm.trim()) {
      list = list.filter((p) => p.product.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (statusFilter !== "ALL") {
      list = list.filter((p) => (p.stock_status || "AWAITING_STOCK") === statusFilter);
    }
    return list;
  }, [products, searchTerm, statusFilter]);

  // ── Handle Upload Current Stock File (.csv / .xlsx) ───────────
  const handleStockFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !results) return;

    setUploadLoading(true);

    try {
      let stockMap = {};

      // 1. If CSV, parse directly client-side
      if (file.name.toLowerCase().endsWith(".csv")) {
        const text = await file.text();
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        if (lines.length > 1) {
          const header = lines[0].toLowerCase();
          const delim = header.includes(";") ? ";" : header.includes("\t") ? "\t" : ",";
          const headers = lines[0].split(delim).map((h) => h.replace(/['"]/g, "").trim().toLowerCase());

          let pIdx = headers.findIndex((h) => h.includes("product") || h.includes("item") || h.includes("sku") || h.includes("name") || h.includes("line"));
          let sIdx = headers.findIndex((h) => h.includes("stock") || h.includes("qty") || h.includes("quantity") || h.includes("count") || h.includes("units"));

          if (pIdx === -1 && headers.length >= 1) pIdx = 0;
          if (sIdx === -1 && headers.length >= 2) sIdx = 1;

          if (pIdx !== -1 && sIdx !== -1) {
            for (let i = 1; i < lines.length; i++) {
              const parts = lines[i].split(delim).map((col) => col.replace(/['"]/g, "").trim());
              const pName = parts[pIdx];
              const sVal = parseInt(parts[sIdx], 10);
              if (pName && !isNaN(sVal)) {
                stockMap[pName.toLowerCase()] = Math.max(0, sVal);
              }
            }
          }
        }
      }

      // 2. Fallback to backend route /api/stock-update (for Excel .xlsx or complex sheets)
      if (Object.keys(stockMap).length === 0) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("http://127.0.0.1:5000/api/stock-update", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.stock_map) {
            Object.keys(data.stock_map).forEach((k) => {
              stockMap[k.toLowerCase()] = data.stock_map[k];
            });
          }
        }
      }

      const keys = Object.keys(stockMap);
      if (keys.length === 0) {
        throw new Error("Could not detect product and stock columns. Expected columns: 'Product Line,Current Stock'");
      }

      // 3. Update products and dynamically recalculate stock needed & status
      let updatedCount = 0;
      const updatedProducts = products.map((prod) => {
        const prodKey = prod.product.toLowerCase().trim();
        const matchKey = keys.find((k) => k === prodKey || prodKey.includes(k) || k.includes(prodKey));
        if (matchKey !== undefined) {
          updatedCount++;
          return recalculateItemMetrics(prod, stockMap[matchKey]);
        }
        return prod;
      });

      const updatedResults = {
        ...results,
        products: updatedProducts,
        inventory_summary: {
          ...results.inventory_summary,
          total_suggested_orders: updatedProducts.reduce((sum, p) => sum + (p.stock_needed || 0), 0),
        },
      };

      setResults(updatedResults);
      localStorage.setItem("forecastResults", JSON.stringify(updatedResults));
      setCustomStockCount(updatedCount);
      showNotification(`✓ Stock file applied: ${updatedCount} products updated with current stock!`);
    } catch (err) {
      showNotification(`Upload failed: ${err.message || "Invalid file"}`);
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Download Sample Stock CSV Template ────────────────────────
  const downloadStockTemplate = () => {
    let csv = "Product Line,Current Stock\n";
    if (products.length > 0) {
      products.forEach((p) => {
        csv += `"${p.product}",100\n`;
      });
    } else {
      csv += '"Classic Cars",1200\n"Vintage Cars",400\n"Planes",800\n"Motorcycles",250\n"Trucks and Buses",350\n"Ships",150\n"Trains",50\n';
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Current_Stock_Template.csv";
    a.click();
    URL.revokeObjectURL(url);
    showNotification("Stock template downloaded! Enter your current stock quantities and upload back.");
  };

  // ── Clear Uploaded Stock (Restore to '-' state) ───────────────
  const clearUploadedStock = () => {
    if (!results) return;
    const clearedProducts = products.map((prod) => {
      const units = prod.forecast_units || Math.round(prod.forecast / (prod.avg_price || 1));
      return {
        ...prod,
        current_stock: null,
        stock_source: "NOT_PROVIDED",
        stock_status: null,
        risk_level: null,
        stock_needed: units,
        coverage_days: null,
        suggested_order_qty: 0,
      };
    });

    const updated = {
      ...results,
      products: clearedProducts,
      inventory_summary: {
        ...results.inventory_summary,
        total_suggested_orders: 0,
        critical_count: 0,
        reorder_count: 0,
        optimal_count: 0,
        overstock_count: 0,
        out_of_stock_count: 0,
      },
    };

    setResults(updated);
    localStorage.setItem("forecastResults", JSON.stringify(updated));
    setCustomStockCount(0);
    showNotification("Current stock cleared. Stock needed reset to forecast demand.");
  };

  // ── Download Simplified CSV ───────────────────────────────────
  const downloadSimplifiedCSV = () => {
    if (!results) return;

    let csv = "data:text/csv;charset=utf-8,";
    csv += "Product Line,Forecast Rev,Forecast Demand,Current Stock,Stock Needed,Inventory Status\n";

    products.forEach((p) => {
      const forecastRev = Math.round(p.forecast);
      const forecastDemand = p.forecast_units || Math.round(p.forecast / (p.avg_price || 1));
      const hasStock = isStockAvailable(p);
      const currentStockStr = hasStock ? p.current_stock : "-";
      const stockNeededVal = hasStock ? Math.max(0, forecastDemand - p.current_stock) : forecastDemand;
      const statusStr = hasStock ? (p.stock_status || "OPTIMAL") : "-";

      csv += `"${p.product}",${forecastRev},${forecastDemand},${currentStockStr},${stockNeededVal},"${statusStr}"\n`;
    });

    const encodedUri = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Inventory_Optimization_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification("Inventory Optimization Ledger exported to CSV!");
  };

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3500);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        .rep-page{min-height:100vh;background:#f0f2f8;font-family:'DM Sans',sans-serif;padding:84px 28px 52px;max-width:1360px;margin:0 auto;}
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
        .rep-btn-emerald{background:#16a34a;color:#fff;}
        .rep-btn-emerald:hover{background:#15803d;}
        .rep-grid-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;}
        .rep-kpi{background:#fff;border:1px solid #e8edf6;border-radius:14px;padding:16px 18px;position:relative;overflow:hidden;}
        .rep-kpi-bar{position:absolute;top:0;left:0;right:0;height:3px;}
        .rep-kpi-lbl{font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.03em;margin-bottom:6px;}
        .rep-kpi-val{font-family:'Space Mono',monospace;font-size:21px;font-weight:700;color:#0f172a;line-height:1.2;}
        .rep-kpi-sub{font-size:11px;color:#64748b;margin-top:4px;}
        .rep-panel{background:#fff;border:1px solid #e8edf6;border-radius:16px;padding:22px;margin-bottom:16px;box-shadow:0 2px 10px rgba(15,23,42,.03);}
        .rep-tabs{display:flex;gap:8px;border-bottom:1px solid #e2e8f0;margin-bottom:18px;padding-bottom:1px;overflow-x:auto;}
        .rep-tab{padding:10px 20px;border:none;background:transparent;font-family:'DM Sans',sans-serif;font-size:13.5px;font-weight:700;color:#64748b;cursor:pointer;position:relative;transition:all .2s;white-space:nowrap;}
        .rep-tab.active{color:#2563eb;}
        .rep-tab.active::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:3px;background:#2563eb;border-radius:3px 3px 0 0;}
        .rep-stock-banner{background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:12px;padding:16px 20px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;}
        .rep-tools{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;}
        .rep-search{display:flex;align-items:center;gap:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:7px 12px;width:240px;}
        .rep-search input{border:none;background:transparent;outline:none;font-size:12.5px;font-family:'DM Sans',sans-serif;color:#0f172a;width:100%;}
        .rep-select{padding:7px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;font-size:12.5px;font-family:'DM Sans',sans-serif;color:#334155;outline:none;cursor:pointer;}
        .rep-table-wrap{overflow-x:auto;}
        .rep-table{width:100%;border-collapse:collapse;font-size:12.5px;}
        .rep-table th{background:#f8fafc;color:#64748b;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:12px 14px;text-align:left;border-bottom:1px solid #e2e8f0;}
        .rep-table td{padding:13px 14px;border-bottom:1px solid #f1f5f9;color:#334155;}
        .rep-table tr:hover td{background:#fafcff;}
        .rep-badge{display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;font-family:'Space Mono',monospace;}
        .rep-badge-crit{background:#fef2f2;color:#dc2626;}
        .rep-badge-reord{background:#fffbeb;color:#d97706;}
        .rep-badge-opt{background:#f0fdf4;color:#16a34a;}
        .rep-badge-over{background:#eff6ff;color:#2563eb;}
        .rep-dash{font-family:'Space Mono',monospace;color:#94a3b8;font-size:15px;font-weight:700;}
        .rep-toast{position:fixed;bottom:24px;right:24px;background:#0f172a;color:#fff;padding:12px 20px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.25);font-size:13px;font-weight:600;z-index:999;}
        @media(max-width:1024px){.rep-grid-kpis{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:640px){.rep-grid-kpis{grid-template-columns:1fr}.rep-page{padding:84px 14px 40px}}
        @media print{
          nav,.rep-actions,.rep-tools,.rep-tabs,.rep-stock-banner{display:none!important}
          .rep-page{padding:0!important;background:#fff!important}
          .rep-panel{box-shadow:none!important;border:1px solid #ccc!important}
        }
      `}</style>

      <div className="rep-page">
        {/* Header */}
        <div className="rep-hdr">
          <div>
            <p className="rep-greet">Inventory & Forecasting Audit Report</p>
            <h1 className="rep-h1">
              Supply Chain <span className="b">Reports</span> <span className="v">📑</span>
            </h1>
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>
              Product demand ledger, dynamic stock replenishment, and multi-model backtest scorecard.
            </p>
          </div>

          <div className="rep-actions">
            {hasData && (
              <>
                <button className="rep-btn rep-btn-sec" onClick={downloadSimplifiedCSV}>
                  📥 Download CSV Ledger
                </button>
                <button className="rep-btn rep-btn-sec" onClick={() => window.print()}>
                  🖨️ Print / PDF
                </button>
              </>
            )}
            <button className="rep-btn rep-btn-p" onClick={() => navigate("/")}>
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {/* Empty State */}
        {!hasData && (
          <div className="rep-panel" style={{ textAlign: "center", padding: "64px 20px" }}>
            <div style={{ fontSize: "52px", marginBottom: "16px" }}>📑</div>
            <h2 style={{ fontFamily: "'Space Mono', monospace", fontSize: "19px", color: "#0f172a", marginBottom: "8px" }}>
              No Forecast or Inventory Data Available
            </h2>
            <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "24px", lineHeight: "1.6" }}>
              Upload your sales dataset to generate the Inventory Optimization Ledger and Model Scorecard.
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
            {/* Top Key Metrics */}
            <div className="rep-grid-kpis">
              <div className="rep-kpi">
                <div className="rep-kpi-bar" style={{ background: "#2563eb" }} />
                <div className="rep-kpi-lbl">Forecast Revenue</div>
                <div className="rep-kpi-val" style={{ color: "#2563eb" }}>
                  {fmt(results.next_month_total)}
                </div>
                <div className="rep-kpi-sub">
                  Winning Model: <strong>{results.selected_model || "Ridge Regression"}</strong>
                </div>
              </div>

              <div className="rep-kpi">
                <div className="rep-kpi-bar" style={{ background: "#7c3aed" }} />
                <div className="rep-kpi-lbl">Forecast Demand</div>
                <div className="rep-kpi-val" style={{ color: "#7c3aed" }}>
                  {totalForecastDemand.toLocaleString()} units
                </div>
                <div className="rep-kpi-sub">Projected commercial unit sales</div>
              </div>

              <div className="rep-kpi">
                <div className="rep-kpi-bar" style={{ background: "#0891b2" }} />
                <div className="rep-kpi-lbl">Current Stock on Hand</div>
                <div className="rep-kpi-val" style={{ color: totalCurrentStock !== null ? "#0891b2" : "#94a3b8" }}>
                  {totalCurrentStock !== null ? `${totalCurrentStock.toLocaleString()} units` : "—"}
                </div>
                <div className="rep-kpi-sub">
                  {totalCurrentStock !== null
                    ? `✓ ${customStockCount > 0 ? customStockCount : products.length} products updated from file`
                    : "Upload stock file to calculate"}
                </div>
              </div>

              <div className="rep-kpi">
                <div className="rep-kpi-bar" style={{ background: "#d97706" }} />
                <div className="rep-kpi-lbl">Stock Needed</div>
                <div className="rep-kpi-val" style={{ color: totalStockNeeded !== null ? "#d97706" : "#94a3b8" }}>
                  {totalStockNeeded !== null ? `${totalStockNeeded.toLocaleString()} units` : "—"}
                </div>
                <div className="rep-kpi-sub">
                  {totalStockNeeded !== null
                    ? "Replenishment buffer required"
                    : "Upload stock file to calculate"}
                </div>
              </div>
            </div>

            {/* Main Interactive Panel */}
            <div className="rep-panel">
              {/* Simplified Tab Selection: Ledger and Scorecard */}
              <div className="rep-tabs">
                <button
                  className={`rep-tab ${activeTab === "inventory" ? "active" : ""}`}
                  onClick={() => setActiveTab("inventory")}
                >
                  📦 Inventory Optimization Ledger ({products.length})
                </button>
                <button
                  className={`rep-tab ${activeTab === "models" ? "active" : ""}`}
                  onClick={() => setActiveTab("models")}
                >
                  🏆 Model Backtesting Scorecard ({scorecard.length})
                </button>
              </div>

              {/* ────────────────────────────────────────────────────────
                  TAB 1: Inventory Optimization Ledger
              ──────────────────────────────────────────────────────── */}
              {activeTab === "inventory" && (
                <>
                  {/* Upload Current Stock File Banner */}
                  <div className="rep-stock-banner">
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "16px" }}>📤</span>
                        <strong style={{ fontSize: "13.5px", color: "#0f172a" }}>
                          Upload Current Stock File
                        </strong>
                        {hasUploadedStock ? (
                          <span className="rep-badge rep-badge-opt">
                            ✓ Stock File Applied
                          </span>
                        ) : (
                          <span className="rep-badge" style={{ background: "#f1f5f9", color: "#64748b" }}>
                            Awaiting Stock File
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: "12px", color: "#64748b" }}>
                        Current stock displays <code style={{ fontFamily: "'Space Mono', monospace" }}>"-"</code> until a stock file is uploaded. Upload your inventory sheet to calculate stock on hand, stock needed, and inventory status.
                      </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".csv,.xlsx,.xls"
                        style={{ display: "none" }}
                        onChange={handleStockFileUpload}
                      />
                      <button
                        className="rep-btn rep-btn-sec"
                        onClick={downloadStockTemplate}
                        title="Download sample CSV template pre-filled with your current product lines"
                      >
                        📄 Download Template
                      </button>
                      <button
                        className="rep-btn rep-btn-emerald"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadLoading}
                      >
                        {uploadLoading ? "Processing Stock..." : "📁 Upload Stock File (.csv / .xlsx)"}
                      </button>
                      {hasUploadedStock && (
                        <button
                          className="rep-btn rep-btn-sec"
                          onClick={clearUploadedStock}
                          title="Reset stock values back to '-'"
                        >
                          ↺ Clear Stock File
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Search and Filters */}
                  <div className="rep-tools">
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                      <div className="rep-search">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Search product line..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>

                      {hasUploadedStock && (
                        <select
                          className="rep-select"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                        >
                          <option value="ALL">All Stock Statuses ({products.length})</option>
                          <option value="OUT_OF_STOCK">Out of Stock</option>
                          <option value="CRITICAL">Critical Risk</option>
                          <option value="REORDER_NOW">Reorder Point Reached</option>
                          <option value="OPTIMAL">Healthy / Optimal</option>
                          <option value="OVERSTOCK">Potential Overstock</option>
                        </select>
                      )}
                    </div>

                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      Showing {filteredProducts.length} of {products.length} products
                    </div>
                  </div>

                  {/* Clean Requested Table: 6 Exact Columns */}
                  <div className="rep-table-wrap">
                    <table className="rep-table">
                      <thead>
                        <tr>
                          <th>Product Line</th>
                          <th>Forecast Rev</th>
                          <th>Forecast Demand</th>
                          <th>Current Stock</th>
                          <th>Stock Needed</th>
                          <th>Inventory Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map((p, i) => {
                          const forecastRev = p.forecast;
                          const forecastDemand = p.forecast_units || Math.round(p.forecast / (p.avg_price || 1));
                          const hasStock = isStockAvailable(p);
                          const currentStock = hasStock ? p.current_stock : null;
                          const stockNeeded = hasStock ? Math.max(0, forecastDemand - p.current_stock) : forecastDemand;
                          const status = hasStock ? (p.stock_status || "OPTIMAL") : null;

                          return (
                            <tr key={i}>
                              {/* 1. Product Line */}
                              <td style={{ fontWeight: "600", color: "#0f172a" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <div
                                    style={{
                                      width: "9px",
                                      height: "9px",
                                      borderRadius: "50%",
                                      background: COLORS[i % COLORS.length],
                                    }}
                                  />
                                  <span>{p.product}</span>
                                </div>
                              </td>

                              {/* 2. Forecast Rev */}
                              <td style={{ fontFamily: "'Space Mono', monospace", fontWeight: "700", color: "#2563eb" }}>
                                {fmt(forecastRev)}
                              </td>

                              {/* 3. Forecast Demand */}
                              <td style={{ fontFamily: "'Space Mono', monospace", color: "#334155" }}>
                                {forecastDemand.toLocaleString()} units
                              </td>

                              {/* 4. Current Stock */}
                              <td style={{ fontFamily: "'Space Mono', monospace" }}>
                                {hasStock ? (
                                  <>
                                    <strong>{currentStock.toLocaleString()}</strong> units
                                    <span style={{ display: "block", fontSize: "10px", color: "#16a34a" }}>
                                      ✓ Uploaded File
                                    </span>
                                  </>
                                ) : (
                                  <span className="rep-dash">—</span>
                                )}
                              </td>

                              {/* 5. Stock Needed */}
                              <td style={{ fontFamily: "'Space Mono', monospace" }}>
                                {hasStock ? (
                                  <span
                                    style={{
                                      fontWeight: stockNeeded > 0 ? "700" : "500",
                                      color: stockNeeded > 0 ? "#dc2626" : "#16a34a",
                                    }}
                                  >
                                    {stockNeeded > 0 ? `${stockNeeded.toLocaleString()} units` : "0 (Adequate)"}
                                    <span style={{ display: "block", fontSize: "10px", color: "#64748b" }}>
                                      (Deficit vs {currentStock.toLocaleString()} in stock)
                                    </span>
                                  </span>
                                ) : (
                                  <span style={{ fontWeight: "700", color: "#d97706" }}>
                                    {forecastDemand.toLocaleString()} units
                                  </span>
                                )}
                              </td>

                              {/* 6. Inventory Status */}
                              <td>
                                {hasStock ? (
                                  <span
                                    className={`rep-badge ${
                                      status === "CRITICAL" || status === "OUT_OF_STOCK"
                                        ? "rep-badge-crit"
                                        : status === "REORDER_NOW"
                                        ? "rep-badge-reord"
                                        : status === "OVERSTOCK"
                                        ? "rep-badge-over"
                                        : "rep-badge-opt"
                                    }`}
                                  >
                                    {status}
                                  </span>
                                ) : (
                                  <span className="rep-dash">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* ────────────────────────────────────────────────────────
                  TAB 2: 🏆 Model Backtesting Scorecard
              ──────────────────────────────────────────────────────── */}
              {activeTab === "models" && (
                <div>
                  <div style={{ marginBottom: "16px", padding: "14px 18px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontWeight: "700", color: "#0f172a", marginBottom: "4px" }}>
                      🏆 Chronological Walk-Forward Backtesting Scorecard
                    </div>
                    <p style={{ fontSize: "12.5px", color: "#475569", lineHeight: "1.5" }}>
                      Candidate models were trained strictly on historical sequences and evaluated on holdout validation windows.
                      The model achieving the lowest Weighted Absolute Percentage Error (WAPE) is automatically selected to generate future demand forecasts.
                    </p>
                  </div>

                  <div className="rep-table-wrap">
                    <table className="rep-table">
                      <thead>
                        <tr>
                          <th>Candidate Model</th>
                          <th>Validation WAPE (%)</th>
                          <th>MAE</th>
                          <th>RMSE</th>
                          <th>MASE</th>
                          <th>Validation Accuracy</th>
                          <th>Evaluation Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scorecard.map((s, idx) => (
                          <tr
                            key={idx}
                            style={{
                              background: s.is_winner ? "#f0fdf4" : "transparent",
                              borderLeft: s.is_winner ? "4px solid #16a34a" : "none",
                            }}
                          >
                            <td style={{ fontWeight: s.is_winner ? "700" : "500", color: s.is_winner ? "#16a34a" : "#0f172a" }}>
                              {s.is_winner && "🏆 "}
                              {s.model}
                            </td>
                            <td style={{ fontFamily: "'Space Mono', monospace", fontWeight: "700", color: s.is_winner ? "#16a34a" : "#334155" }}>
                              {s.wape}%
                            </td>
                            <td style={{ fontFamily: "'Space Mono', monospace" }}>{fmt(s.mae)}</td>
                            <td style={{ fontFamily: "'Space Mono', monospace" }}>{fmt(s.rmse)}</td>
                            <td style={{ fontFamily: "'Space Mono', monospace" }}>{s.mase}</td>
                            <td
                              style={{
                                fontFamily: "'Space Mono', monospace",
                                fontWeight: "700",
                                color: s.is_winner ? "#16a34a" : "#475569",
                              }}
                            >
                              {s.accuracy}%
                            </td>
                            <td>
                              {s.is_winner ? (
                                <span className="rep-badge rep-badge-opt">Selected Winner</span>
                              ) : (
                                <span style={{ fontSize: "11px", color: "#94a3b8" }}>Evaluated Baseline</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginTop: "18px", padding: "14px 18px", background: "#f0fdf4", borderRadius: "10px", border: "1px solid #bbf7d0", fontSize: "12.5px", color: "#166534" }}>
                    <strong>Selected Algorithm:</strong> {results.selected_model || "Ridge Regression"} demonstrated superior out-of-sample resilience with an accuracy score of {results.accuracy}%.
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Floating Notification Toast */}
        {notification && <div className="rep-toast">{notification}</div>}
      </div>
    </>
  );
};

export default Reports;