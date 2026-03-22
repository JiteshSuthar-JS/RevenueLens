import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Login = () => {
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handle = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const submit = async () => {
    setError("");
    setSuccess("");

    if (!form.email || !form.password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (mode === "register") {
      if (!form.name) { setError("Name is required."); return; }
      if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
      if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    }

    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/login" : "/api/register";
      const body = mode === "login"
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };

      const res = await fetch(`http://127.0.0.1:5000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        if (mode === "login") {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          navigate("/");
        } else {
          setSuccess("Account created! You can now log in.");
          setMode("login");
          setForm({ name: "", email: "", password: "", confirmPassword: "" });
        }
      }
    } catch {
      setError("Cannot connect to server. Make sure Flask is running.");
    }
    setLoading(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Sora:wght@300;400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .auth-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: 'Sora', sans-serif;
          background: #f4f6fb;
          background-image:
            radial-gradient(ellipse at 20% 30%, rgba(37,99,235,0.06) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 70%, rgba(124,58,237,0.05) 0%, transparent 60%);

          /* 
            Key fix: padding-top pushes ALL content (logo + card) 
            below the fixed navbar (64px tall).
            padding-bottom keeps it balanced.
          */
          padding: 84px 20px 40px;
        }

        /* ── LOGO ── */
        .auth-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          margin-bottom: 28px;
          flex-shrink: 0;
        }

        .auth-logo-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.28);
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }

        .auth-logo-icon::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 50%;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 9px 9px 0 0;
        }

        .auth-logo-icon svg {
          width: 18px;
          height: 18px;
          color: #ffffff;
          position: relative;
          z-index: 1;
        }

        .auth-logo-text {
          display: flex;
          flex-direction: column;
          line-height: 1;
        }

        .auth-logo-title {
          font-family: 'Space Mono', monospace;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .auth-logo-title .revenue { color: #2563eb; }
        .auth-logo-title .lens    { color: #7c3aed; }

        .auth-logo-sub {
          font-size: 10px;
          font-weight: 500;
          color: #64748b;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-top: 3px;
        }

        /* ── CARD ── */
        .auth-card {
          width: 100%;
          max-width: 420px;
          background: #ffffff;
          border-radius: 16px;
          padding: 36px 36px 28px;
          box-shadow: 0 4px 32px rgba(15, 23, 42, 0.08);
          border: 1px solid #e2e8f4;
        }

        .auth-card-title {
          font-size: 22px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 4px;
          letter-spacing: -0.02em;
          text-align: center;
        }

        .auth-card-sub {
          font-size: 13.5px;
          color: #64748b;
          margin-bottom: 24px;
          text-align: center;
        }

        /* TABS */
        .auth-tabs {
          display: flex;
          background: #f1f5f9;
          border-radius: 10px;
          padding: 4px;
          margin-bottom: 22px;
        }

        .auth-tab {
          flex: 1;
          padding: 9px;
          text-align: center;
          font-size: 13.5px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          border-radius: 7px;
          transition: all 0.2s;
          user-select: none;
        }

        .auth-tab.active {
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 1px 6px rgba(15,23,42,0.1);
        }

        /* FIELDS */
        .auth-field { margin-bottom: 14px; }

        .auth-label {
          display: block;
          font-size: 11.5px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .auth-input {
          width: 100%;
          padding: 11px 14px;
          background: #f8fafc;
          border: 1.5px solid #e2e8f4;
          border-radius: 8px;
          font-family: 'Sora', sans-serif;
          font-size: 14px;
          color: #0f172a;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }

        .auth-input::placeholder { color: #94a3b8; }

        .auth-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
          background: #ffffff;
        }

        /* ALERTS */
        .auth-error {
          padding: 10px 14px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          font-size: 13px;
          color: #dc2626;
          margin-bottom: 14px;
        }

        .auth-success {
          padding: 10px 14px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          font-size: 13px;
          color: #16a34a;
          margin-bottom: 14px;
        }

        /* SUBMIT */
        .auth-submit {
          width: 100%;
          padding: 13px;
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
          color: #ffffff;
          font-family: 'Sora', sans-serif;
          font-size: 14.5px;
          font-weight: 600;
          border: none;
          border-radius: 9px;
          cursor: pointer;
          margin-top: 6px;
          box-shadow: 0 4px 14px rgba(37,99,235,0.3);
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .auth-submit:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(37,99,235,0.4);
        }

        .auth-submit:disabled { opacity: 0.7; cursor: not-allowed; }

        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .auth-back {
          display: block;
          text-align: center;
          margin-top: 18px;
          font-size: 13px;
          color: #64748b;
          text-decoration: none;
        }

        .auth-back span { color: #2563eb; font-weight: 600; }
      `}</style>

      <div className="auth-page">

        {/* Logo — always sits 84px from top (safely below 64px navbar) */}
        <Link to="/" className="auth-logo">
          <div className="auth-logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div className="auth-logo-text">
            <span className="auth-logo-title">
              <span className="revenue">Revenue</span><span className="lens">Lens</span>
            </span>
            <span className="auth-logo-sub">AI Forecasting</span>
          </div>
        </Link>

        {/* Card — grows downward when register adds fields, logo never moves */}
        <div className="auth-card">
          <h2 className="auth-card-title">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h2>
          <p className="auth-card-sub">
            {mode === "login"
              ? "Sign in to your RevenueLens account"
              : "Start forecasting your sales today"}
          </p>

          <div className="auth-tabs">
            <div
              className={`auth-tab${mode === "login" ? " active" : ""}`}
              onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
            >Login</div>
            <div
              className={`auth-tab${mode === "register" ? " active" : ""}`}
              onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
            >Register</div>
          </div>

          {error   && <div className="auth-error">⚠ {error}</div>}
          {success && <div className="auth-success">✓ {success}</div>}

          {mode === "register" && (
            <div className="auth-field">
              <label className="auth-label">Full Name</label>
              <input className="auth-input" name="name" type="text" placeholder="John Doe" value={form.name} onChange={handle} />
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Email Address</label>
            <input className="auth-input" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handle} />
          </div>

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input className="auth-input" name="password" type="password" placeholder="••••••••" value={form.password} onChange={handle} />
          </div>

          {mode === "register" && (
            <div className="auth-field">
              <label className="auth-label">Confirm Password</label>
              <input className="auth-input" name="confirmPassword" type="password" placeholder="••••••••" value={form.confirmPassword} onChange={handle} />
            </div>
          )}

          <button className="auth-submit" onClick={submit} disabled={loading}>
            {loading && <span className="spinner" />}
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>

          <Link to="/" className="auth-back">← Back to <span>Home</span></Link>
        </div>

      </div>
    </>
  );
};

export default Login;