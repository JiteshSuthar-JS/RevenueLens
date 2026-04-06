import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API = "http://127.0.0.1:5000";

const UploadData = () => {
  const [file, setFile]             = useState(null);
  const [step, setStep]             = useState(1); // 1=select, 2=uploaded, 3=done
  const [uploading, setUploading]   = useState(false);
  const [forecasting, setForecasting] = useState(false);
  const [filePath, setFilePath]     = useState(null);
  const [fileInfo, setFileInfo]     = useState(null);
  const [error, setError]           = useState("");
  const [dragOver, setDragOver]     = useState(false);
  const fileRef                     = useRef();
  const navigate                    = useNavigate();

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

      const res  = await fetch(`${API}/api/upload`, { method: "POST", body: formData });
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
      setError("Cannot reach server. Make sure Flask is running.");
    }
    setUploading(false);
  };

  // ── Step 2: Run forecast ─────────────────────────────
  const handleForecast = async () => {
    if (!filePath) return;
    setForecasting(true);
    setError("");

    try {
      const res  = await fetch(`${API}/api/forecast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_path: filePath }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Forecast failed.");
        setForecasting(false);
        return;
      }

      // Save results to localStorage → Dashboard reads this
      localStorage.setItem("forecastResults", JSON.stringify(data));
      setStep(3);
    } catch {
      setError("Cannot reach server. Make sure Flask is running.");
    }
    setForecasting(false);
  };

  const reset = () => {
    setFile(null); setStep(1); setFilePath(null);
    setFileInfo(null); setError("");
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

        /* Steps */
        .up-steps { display: flex; align-items: center; gap: 0; margin-bottom: 32px; }
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

        /* Card */
        .up-card {
          max-width: 580px; margin: 0 auto;
          background: #fff; border: 1px solid #e2e8f4;
          border-radius: 16px; padding: 36px;
          box-shadow: 0 4px 24px rgba(15,23,42,.07);
        }

        /* Dropzone */
        .up-drop {
          border: 2px dashed #e2e8f4; border-radius: 12px;
          padding: 52px 24px; text-align: center; cursor: pointer;
          background: #fafbff; transition: all 0.2s;
        }
        .up-drop:hover, .up-drop.over { border-color: #2563eb; background: rgba(37,99,235,.04); }
        .up-drop-icon {
          width: 60px; height: 60px; border-radius: 16px; margin: 0 auto 16px;
          background: linear-gradient(135deg, rgba(37,99,235,.1), rgba(124,58,237,.1));
          border: 1px solid rgba(37,99,235,.15);
          display: flex; align-items: center; justify-content: center;
        }
        .up-drop-icon svg { width: 26px; height: 26px; color: #2563eb; }
        .up-drop-title { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 6px; }
        .up-drop-sub { font-size: 13px; color: #94a3b8; margin-bottom: 18px; }
        .up-browse {
          padding: 10px 24px; background: linear-gradient(135deg, #2563eb, #7c3aed);
          color: #fff; border: none; border-radius: 8px; font-size: 13.5px;
          font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif;
        }

        /* File info */
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
        .up-file-rm svg { width: 18px; height: 18px; }

        /* Info box */
        .up-info {
          padding: 12px 16px; border-radius: 8px; font-size: 13px;
          display: flex; align-items: center; gap: 10px; margin-bottom: 18px;
        }
        .up-info.green { background: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; }
        .up-info svg { width: 16px; height: 16px; flex-shrink: 0; }

        /* Error */
        .up-err { padding: 12px 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; font-size: 13px; color: #dc2626; margin-bottom: 18px; }

        /* Buttons */
        .up-btn {
          width: 100%; padding: 14px; border: none; border-radius: 10px; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 700;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          transition: all 0.2s;
        }
        .up-btn-blue   { background: linear-gradient(135deg,#2563eb,#7c3aed); color:#fff; box-shadow:0 4px 14px rgba(37,99,235,.3); }
        .up-btn-violet { background: linear-gradient(135deg,#7c3aed,#2563eb); color:#fff; box-shadow:0 4px 14px rgba(124,58,237,.3); }
        .up-btn-green  { background: linear-gradient(135deg,#22c55e,#16a34a); color:#fff; box-shadow:0 4px 14px rgba(22,163,74,.3); }
        .up-btn:hover:not(:disabled) { opacity:.9; transform:translateY(-1px); }
        .up-btn:disabled { opacity:.6; cursor:not-allowed; }
        .up-btn svg { width: 18px; height: 18px; }

        /* Spinner */
        .spin { width:18px;height:18px;border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite; }
        @keyframes spin{to{transform:rotate(360deg)}}

        /* Success */
        .up-success { text-align: center; padding: 16px 0; }
        .up-success-icon {
          width: 68px; height: 68px; border-radius: 50%; margin: 0 auto 16px;
          background: linear-gradient(135deg,#22c55e,#16a34a);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 20px rgba(22,163,74,.3);
          animation: popIn .4s ease;
        }
        @keyframes popIn{from{transform:scale(.5);opacity:0}to{transform:scale(1);opacity:1}}
        .up-success-icon svg { width: 30px; height: 30px; color: #fff; }
        .up-success-title { font-family:'Space Mono',monospace; font-size:18px; font-weight:700; color:#0f172a; margin-bottom:6px; }
        .up-success-sub { font-size:13.5px; color:#64748b; margin-bottom:24px; }

        /* Stats grid */
        .up-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
        .up-stat { background: #f8fafc; border: 1px solid #e2e8f4; border-radius: 8px; padding: 12px; text-align: center; }
        .up-stat-val { font-family:'Space Mono',monospace; font-size:18px; font-weight:700; color:#2563eb; }
        .up-stat-lbl { font-size:11px; color:#94a3b8; margin-top:3px; text-transform:uppercase; letter-spacing:.05em; }
      `}</style>

      <div className="up">
        <h1 className="up-title"><span className="b">Upload</span> <span className="v">& Forecast</span></h1>
        <p className="up-sub">Upload your sales CSV → Run ML forecast → Results appear on Dashboard</p>

        {/* Steps */}
        <div className="up-steps">
          {[
            { n:"1", lbl:"Upload File",   s: step >= 2 ? "done" : "active" },
            { n:"2", lbl:"Run Forecast",  s: step >= 3 ? "done" : step === 2 ? "active" : "idle" },
            { n:"3", lbl:"View Dashboard",s: step === 3 ? "active" : "idle" },
          ].map((item, i, arr) => (
            <div key={i} style={{display:"flex",alignItems:"center",flex: i<arr.length-1?1:"none"}}>
              <div className="up-step-item">
                <div className={`up-step-num ${item.s}`}>{item.s==="done"?"✓":item.n}</div>
                <span className={`up-step-lbl ${item.s}`}>{item.lbl}</span>
              </div>
              {i < arr.length-1 && <div className={`up-step-line ${item.s==="done"?"done":""}`}/>}
            </div>
          ))}
        </div>

        <div className="up-card">

          {error && <div className="up-err">⚠ {error}</div>}

          {/* STEP 1 — Select & Upload file */}
          {step === 1 && (
            <>
              {!file ? (
                <div
                  className={`up-drop ${dragOver?"over":""}`}
                  onDragOver={e=>{e.preventDefault();setDragOver(true)}}
                  onDragLeave={()=>setDragOver(false)}
                  onDrop={onDrop}
                  onClick={()=>fileRef.current.click()}
                >
                  <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls"
                    style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
                  <div className="up-drop-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <div className="up-drop-title">Drop your CSV file here</div>
                  <div className="up-drop-sub">or click to browse — CSV, XLSX supported</div>
                  <button className="up-browse">Browse File</button>
                </div>
              ) : (
                <>
                  <div className="up-file-row">
                    <div className="up-file-ico">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>
                    <div>
                      <div className="up-file-name">{file.name}</div>
                      <div className="up-file-size">{(file.size/1024).toFixed(1)} KB</div>
                    </div>
                    <button className="up-file-rm" onClick={reset}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                  <button className="up-btn up-btn-blue" onClick={handleUpload} disabled={uploading}>
                    {uploading ? <span className="spin"/> : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                    )}
                    {uploading ? "Uploading..." : "Upload File"}
                  </button>
                </>
              )}
            </>
          )}

          {/* STEP 2 — Run Forecast */}
          {step === 2 && (
            <>
              <div className="up-info green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                File uploaded! {fileInfo?.rows?.toLocaleString()} rows detected. Now run the ML forecast.
              </div>

              <div className="up-stats">
                <div className="up-stat">
                  <div className="up-stat-val">{fileInfo?.rows?.toLocaleString()}</div>
                  <div className="up-stat-lbl">Total Rows</div>
                </div>
                <div className="up-stat">
                  <div className="up-stat-val">{fileInfo?.columns?.length}</div>
                  <div className="up-stat-lbl">Columns</div>
                </div>
              </div>

              <button className="up-btn up-btn-violet" onClick={handleForecast} disabled={forecasting}>
                {forecasting ? <span className="spin"/> : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                )}
                {forecasting ? "Running ML Model..." : "🚀 Run Forecast"}
              </button>
            </>
          )}

          {/* STEP 3 — Done, go to dashboard */}
          {step === 3 && (
            <div className="up-success">
              <div className="up-success-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div className="up-success-title">Forecast Complete!</div>
              <div className="up-success-sub">ML model ran successfully. Your results are ready on the Dashboard.</div>
              <button className="up-btn up-btn-green" onClick={() => navigate("/")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
                View Dashboard
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default UploadData;