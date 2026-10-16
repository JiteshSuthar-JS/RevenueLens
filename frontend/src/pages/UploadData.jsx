import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import sampleData from "../assets/sampleForecast.json";

const API = "http://127.0.0.1:5000";

const UploadData = () => {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState(1); // 1=select, 2=uploaded & review, 3=done
  const [uploading, setUploading] = useState(false);
  const [forecasting, setForecasting] = useState(false);
  const [filePath, setFilePath] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [leadTimeDays, setLeadTimeDays] = useState(14);
  const [serviceLevel, setServiceLevel] = useState(95);
  const [showPreview, setShowPreview] = useState(false);

  const fileRef = useRef();
  const navigate = useNavigate();

  const handleFile = (f) => {
    if (!f) return;
    setError("");
    setFile(f);
    setStep(1);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  // ── Step 1: Upload file ──────────────────────────────
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API}/api/upload`, { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed.");
        setUploading(false);
        return;
      }

      setFilePath(data.file_path);
      setFileInfo(data);
      setStep(2);
    } catch {
      setError("Cannot reach backend server. Make sure Flask is active on port 5000.");
    }
    setUploading(false);
  };

  // ── Step 2: Run forecast with inventory parameters ────
  const handleForecast = async () => {
    if (!filePath) return;
    setForecasting(true);
    setError("");

    try {
      const res = await fetch(`${API}/api/forecast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_path: filePath,
          lead_time_days: Number(leadTimeDays),
          service_level: Number(serviceLevel),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Forecast failed.");
        setForecasting(false);
        return;
      }

      localStorage.setItem("forecastResults", JSON.stringify(data));
      setStep(3);
    } catch {
      setError("Forecast failed or connection timed out. Ensure Flask backend is running.");
    }
    setForecasting(false);
  };

  const reset = () => {
    setFile(null);
    setStep(1);
    setFilePath(null);
    setFileInfo(null);
    setError("");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .up { min-height: 100vh; background: #f4f6fb; font-family: 'DM Sans', sans-serif; padding: 90px 32px 48px; }
        .up-title { font-family: 'Space Mono', monospace; font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
        .up-title .b { color: #2563eb; } .up-title .v { color: #7c3aed; }
        .up-sub { font-size: 13.5px; color: #64748b; margin-bottom: 28px; }
        .up-steps { display: flex; align-items: center; gap: 0; margin-bottom: 32px; max-width: 680px; margin-left: auto; margin-right: auto; }
        .up-step-item { display: flex; align-items: center; gap: 8px; }
        .up-step-num {
          width: 30px; height: 30px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Space Mono', monospace; font-size: 12px; font-weight: 700;
          transition: all 0.3s;
        }
        .up-step-num.done   { background: linear-gradient(135deg, #2563eb, #7c3aed); color: #fff; }
        .up-step-num.active { background: #2563eb; color: #fff; box-shadow: 0 0 0 4px rgba(37,99,235,.15); }
        .up-step-num.idle   { background: #f1f5f9; color: #94a3b8; }
        .up-step-lbl { font-size: 13px; font-weight: 600; }
        .up-step-lbl.done   { color: #16a34a; }
        .up-step-lbl.active { color: #2563eb; }
        .up-step-lbl.idle   { color: #94a3b8; }
        .up-step-line { flex: 1; height: 2px; background: #e2e8f4; margin: 0 12px; min-width: 48px; }
        .up-step-line.done { background: linear-gradient(90deg, #2563eb, #7c3aed); }
        .up-card {
          max-width: 660px; margin: 0 auto;
          background: #fff; border: 1px solid #e2e8f4;
          border-radius: 16px; padding: 36px;
          box-shadow: 0 4px 24px rgba(15,23,42,.07);
        }
        .up-drop {
          border: 2px dashed #cbd5e1; border-radius: 12px;
          padding: 48px 24px; text-align: center; cursor: pointer;
          background: #fafbff; transition: all 0.2s;
        }
        .up-drop:hover, .up-drop.over { border-color: #2563eb; background: rgba(37,99,235,.04); }
        .up-drop-icon {
          width: 58px; height: 58px; border-radius: 16px; margin: 0 auto 16px;
          background: linear-gradient(135deg, rgba(37,99,235,.1), rgba(124,58,237,.1));
          border: 1px solid rgba(37,99,235,.15);
          display: flex; align-items: center; justify-content: center;
        }
        .up-drop-icon svg { width: 26px; height: 26px; color: #2563eb; }
        .up-drop-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
        .up-drop-sub { font-size: 13px; color: #94a3b8; margin-bottom: 18px; }
        .up-browse {
          padding: 10px 24px; background: linear-gradient(135deg, #2563eb, #7c3aed);
          color: #fff; border: none; border-radius: 8px; font-size: 13.5px;
          font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif;
        }
        .up-file-row {
          display: flex; align-items: center; gap: 14px; padding: 14px;
          background: #f8fafc; border: 1.5px solid #e2e8f4; border-radius: 10px; margin-bottom: 20px;
        }
        .up-file-ico {
          width: 42px; height: 42px; border-radius: 10px; flex-shrink: 0;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          display: flex; align-items: center; justify-content: center;
        }
        .up-file-ico svg { width: 20px; height: 20px; color: #fff; }
        .up-file-name { font-size: 14px; font-weight: 600; color: #0f172a; }
        .up-file-size { font-size: 12px; color: #94a3b8; margin-top: 2px; }
        .up-file-rm { margin-left: auto; background: none; border: none; cursor: pointer; color: #94a3b8; }
        .up-file-rm:hover { color: #dc2626; }
        .up-err { padding: 12px 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; font-size: 13px; color: #dc2626; margin-bottom: 18px; }
        .up-btn {
          width: 100%; padding: 14px; border: none; border-radius: 10px; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 14.5px; font-weight: 700;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          transition: all 0.2s;
        }
        .up-btn-blue   { background: linear-gradient(135deg,#2563eb,#7c3aed); color:#fff; box-shadow:0 4px 14px rgba(37,99,235,.3); }
        .up-btn-violet { background: linear-gradient(135deg,#7c3aed,#2563eb); color:#fff; box-shadow:0 4px 14px rgba(124,58,237,.3); }
        .up-btn-green  { background: linear-gradient(135deg,#22c55e,#16a34a); color:#fff; box-shadow:0 4px 14px rgba(22,163,74,.3); }
        .up-btn:hover:not(:disabled) { opacity:.92; transform:translateY(-1px); }
        .up-btn:disabled { opacity:.6; cursor:not-allowed; }
        .spin { width:18px;height:18px;border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite; }
        @keyframes spin{to{transform:rotate(360deg)}}
        .up-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-family: 'Space Mono', monospace; font-weight: 700; }
        .up-badge-b { background: #eff6ff; color: #2563eb; }
        .up-badge-g { background: #f0fdf4; color: #16a34a; }
        .up-preview-table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-top: 10px; }
        .up-preview-table th { background: #f1f5f9; padding: 8px 10px; text-align: left; color: #475569; font-weight: 700; border: 1px solid #e2e8f0; }
        .up-preview-table td { padding: 6px 10px; border: 1px solid #e2e8f0; color: #334155; }
      `}</style>

      <div className="up">
        <h1 className="up-title">
          <span className="b">Upload</span> <span className="v">& Validate Dataset</span>
        </h1>
        <p className="up-sub">
          Upload commercial sales CSV/Excel files → inspect data health → configure inventory parameters → run multi-model forecast.
        </p>

        {/* Steps */}
        <div className="up-steps">
          {[
            { n: "1", lbl: "Upload File", s: step >= 2 ? "done" : "active" },
            { n: "2", lbl: "Review & Configure", s: step >= 3 ? "done" : step === 2 ? "active" : "idle" },
            { n: "3", lbl: "Forecast Ready", s: step === 3 ? "active" : "idle" },
          ].map((item, i, arr) => (
            <div key={i} style={{ display: "flex", alignItems: "center", flex: i < arr.length - 1 ? 1 : "none" }}>
              <div className="up-step-item">
                <div className={`up-step-num ${item.s}`}>{item.s === "done" ? "✓" : item.n}</div>
                <span className={`up-step-lbl ${item.s}`}>{item.lbl}</span>
              </div>
              {i < arr.length - 1 && <div className={`up-step-line ${item.s === "done" ? "done" : ""}`} />}
            </div>
          ))}
        </div>

        <div className="up-card">
          {error && <div className="up-err">⚠ {error}</div>}

          {/* STEP 1 — Select & Upload */}
          {step === 1 && (
            <>
              {!file ? (
                <div
                  className={`up-drop ${dragOver ? "over" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => fileRef.current.click()}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    style={{ display: "none" }}
                    onChange={(e) => handleFile(e.target.files[0])}
                  />
                  <div className="up-drop-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div className="up-drop-title">Drop your Sales CSV or Excel file here</div>
                  <div className="up-drop-sub">Supported formats: .csv, .xlsx, .xls (up to 20MB)</div>
                  <button className="up-browse">Browse Files</button>

                  <div style={{ marginTop: "22px", paddingTop: "16px", borderTop: "1px dashed #e2e8f0" }}>
                    <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "8px" }}>
                      Want to test immediately without uploading?
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        localStorage.setItem("forecastResults", JSON.stringify(sampleData));
                        setStep(3);
                      }}
                      style={{
                        padding: "8px 18px",
                        background: "#fff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        fontSize: "12.5px",
                        fontWeight: "600",
                        color: "#2563eb",
                        cursor: "pointer",
                      }}
                    >
                      ✨ Quick Demo with Verified Dataset
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="up-file-row">
                    <div className="up-file-ico">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div>
                      <div className="up-file-name">{file.name}</div>
                      <div className="up-file-size">{(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <button className="up-file-rm" onClick={reset}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>

                  <button className="up-btn up-btn-blue" onClick={handleUpload} disabled={uploading}>
                    {uploading ? <span className="spin" /> : "Upload & Validate Schema"}
                  </button>
                </>
              )}
            </>
          )}

          {/* STEP 2 — Review & Configure */}
          {step === 2 && fileInfo && (
            <>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>Data Validation Audit</span>
                  <span className="up-badge up-badge-g">✓ Clean: {fileInfo.rows?.toLocaleString()} rows</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px", color: "#475569" }}>
                  <div>
                    <span style={{ color: "#94a3b8" }}>Date Column: </span>
                    <strong>{fileInfo.mapping?.date_column || "Not Found"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#94a3b8" }}>Revenue Column: </span>
                    <strong>{fileInfo.mapping?.revenue_column || "Not Found"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#94a3b8" }}>Product Column: </span>
                    <strong>{fileInfo.mapping?.product_column || "Not Detected"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#94a3b8" }}>Quantity Column: </span>
                    <strong>{fileInfo.mapping?.quantity_column || "Default 1 per line"}</strong>
                  </div>
                </div>

                {fileInfo.duplicates_removed > 0 && (
                  <div style={{ marginTop: "8px", fontSize: "11px", color: "#d97706" }}>
                    ℹ️ Removed {fileInfo.duplicates_removed} duplicate records to ensure modeling integrity.
                  </div>
                )}
              </div>

              {/* Inventory Parameter Settings */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px", marginBottom: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", marginBottom: "12px" }}>
                  ⚙️ Supply Chain & Inventory Parameters
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                      Supplier Lead Time (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={leadTimeDays}
                      onChange={(e) => setLeadTimeDays(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontFamily: "'Space Mono', monospace",
                        outline: "none",
                      }}
                    />
                    <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>Transit duration from reorder to shelf</span>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                      Target Service Level (%)
                    </label>
                    <select
                      value={serviceLevel}
                      onChange={(e) => setServiceLevel(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontFamily: "'Space Mono', monospace",
                        outline: "none",
                        background: "#fff",
                      }}
                    >
                      <option value="90">90% (Z = 1.28 - Low Buffer)</option>
                      <option value="95">95% (Z = 1.65 - Standard)</option>
                      <option value="98">98% (Z = 2.05 - High Availability)</option>
                      <option value="99">99% (Z = 2.33 - Critical Buffer)</option>
                    </select>
                    <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>Determines safety stock buffer size</span>
                  </div>
                </div>
              </div>

              {/* Data Preview Toggle */}
              {fileInfo.preview && fileInfo.preview.length > 0 && (
                <div style={{ marginBottom: "18px" }}>
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#2563eb",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {showPreview ? "▼ Hide Data Sample Preview" : "▶ Preview First 5 Rows of Uploaded File"}
                  </button>

                  {showPreview && (
                    <div style={{ overflowX: "auto", marginTop: "10px" }}>
                      <table className="up-preview-table">
                        <thead>
                          <tr>
                            {Object.keys(fileInfo.preview[0]).slice(0, 6).map((col, idx) => (
                              <th key={idx}>{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {fileInfo.preview.map((row, rIdx) => (
                            <tr key={rIdx}>
                              {Object.values(row).slice(0, 6).map((val, cIdx) => (
                                <td key={cIdx}>{String(val)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <button className="up-btn up-btn-violet" onClick={handleForecast} disabled={forecasting}>
                {forecasting ? <span className="spin" /> : "🚀 Run Multi-Model Forecast & Optimization"}
              </button>
            </>
          )}

          {/* STEP 3 — Complete */}
          {step === 3 && (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  margin: "0 auto 16px",
                  background: "linear-gradient(135deg, #22c55e, #16a34a)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 20px rgba(22, 163, 74, .3)",
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="30" height="30">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 style={{ fontFamily: "'Space Mono', monospace", fontSize: "19px", color: "#0f172a", marginBottom: "6px" }}>
                Forecast & Inventory Model Ready!
              </h2>
              <p style={{ fontSize: "13.5px", color: "#64748b", marginBottom: "24px" }}>
                Multi-model backtesting complete. Review your selected model, charts, and inventory recommendations.
              </p>

              <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                <button className="up-btn up-btn-green" onClick={() => navigate("/")} style={{ flex: 1 }}>
                  📊 Go to Dashboard
                </button>
                <button
                  className="up-btn"
                  onClick={() => navigate("/reports")}
                  style={{
                    flex: 1,
                    background: "#fff",
                    border: "1.5px solid #cbd5e1",
                    color: "#334155",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  }}
                >
                  📑 View Detailed Reports
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UploadData;