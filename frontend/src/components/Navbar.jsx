import { useState, useRef, useEffect } from "react";
import "./Navbar.css";
import { Link, useLocation, useNavigate } from "react-router-dom";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const stored = localStorage.getItem("user");
  const user = stored ? JSON.parse(stored) : null;

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  };

  const getShortName = (name) => {
    if (!name) return "User";
    return name.split(" ")[0];
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("forecastResults");
    setDropdownOpen(false);
    navigate("/login");
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const navLinks = [
    { label: "Dashboard",   path: "/" }, 
    { label: "Upload Data", path: "/upload" },
    { label: "Reports",     path: "/reports" },
  ];

  return (
    <>

      <nav className="nav">
        <div className="nav__inner">

          {/* Logo */}
          <Link className="nav__logo" to="/">
            <div className="nav__logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div className="nav__logo-text">
              <span className="nav__logo-title">
                <span className="revenue">Revenue</span><span className="lens">Lens</span>
              </span>
              <span className="nav__logo-sub">AI Forecasting</span>
            </div>
          </Link>

          {/* Right group */}
          <div className="nav__right-group">

            <ul className="nav__links">
              {navLinks.map(({ label, path }) => (
                <li key={label}>
                  <Link
                    to={path}
                    className={`nav__link${location.pathname === path ? " active" : ""}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Auth: avatar (name LEFT, circle RIGHT) or login button */}
            {user ? (
              <div className="nav__user" ref={dropdownRef} onClick={() => setDropdownOpen(!dropdownOpen)}>
                {/* Name on the LEFT */}
                <span className="nav__user-name">{getShortName(user.name)}</span>
                {/* Circle on the RIGHT (rightmost corner) */}
                <div className="nav__user-avatar">{getInitials(user.name)}</div>

                {dropdownOpen && (
                  <div className="nav__dropdown">
                    <div className="nav__dropdown-header">
                      <div className="nav__dropdown-name">{user.name}</div>
                      <div className="nav__dropdown-email">{user.email}</div>
                    </div>

                    <Link to="/settings" className="nav__dropdown-item" onClick={() => setDropdownOpen(false)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      Profile
                    </Link>

                    <Link to="/settings" className="nav__dropdown-item" onClick={() => setDropdownOpen(false)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
                      </svg>
                      Settings
                    </Link>

                    <div className="nav__dropdown-divider" />

                    <div className="nav__dropdown-item nav__dropdown-logout" onClick={handleLogout}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Logout
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="nav__auth-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Login / Register
              </Link>
            )}

          </div>

          {/* Hamburger */}
          <button
            className={`nav__hamburger${menuOpen ? " open" : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>

        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="nav__mobile">
            {navLinks.map(({ label, path }) => (
              <Link
                key={label}
                to={path}
                className={`nav__mobile-link${location.pathname === path ? " active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
            <div className="nav__mobile-divider" />
            {user ? (
              <div className="nav__mobile-link nav__dropdown-logout" onClick={handleLogout}>
                Logout ({getShortName(user.name)})
              </div>
            ) : (
              <Link to="/login" className="nav__mobile-auth" onClick={() => setMenuOpen(false)}>
                Login / Register
              </Link>
            )}
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;