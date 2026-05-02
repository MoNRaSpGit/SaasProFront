import { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getStoredUser, logoutSession } from "../../features/auth/auth.client";

type UserTopBarProps = {
  showDashboardLink?: boolean;
};

export function UserTopBar({ showDashboardLink = true }: UserTopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useMemo(() => getStoredUser(), []);
  const userLabel = user?.fullName?.trim() || user?.email || "Usuario";
  const shouldShowDashboardLink = showDashboardLink && location.pathname !== "/dashboard";

  async function handleLogout() {
    await logoutSession();
    navigate("/", { replace: true });
  }

  return (
    <nav style={navStyle} aria-label="Sesion">
      <div style={userBadgeStyle}>
        <span style={iconWrapStyle} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21a8 8 0 0 0-16 0" />
            <circle cx="12" cy="8" r="4" />
          </svg>
        </span>
        <span style={userTextStyle}>{userLabel}</span>
      </div>

      <div style={actionsStyle}>
        {shouldShowDashboardLink ? (
          <Link to="/dashboard" style={linkStyle}>
            Ir al dashboard
          </Link>
        ) : null}
        <button type="button" onClick={() => void handleLogout()} style={buttonStyle}>
          Cerrar sesion
        </button>
      </div>
    </nav>
  );
}

const navStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 1120,
  margin: "0 auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  padding: "10px 14px",
  borderRadius: 22,
  background: "rgba(255, 255, 255, 0.74)",
  border: "1px solid rgba(212, 223, 232, 0.95)",
  boxShadow: "0 10px 24px rgba(44, 69, 94, 0.08)",
  backdropFilter: "blur(14px)"
};

const userBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0
};

const iconWrapStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 36,
  height: 36,
  borderRadius: 999,
  background: "#172433",
  color: "#f8fafc",
  flexShrink: 0
};

const userTextStyle: React.CSSProperties = {
  color: "#1c2c3d",
  fontWeight: 800,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: 280
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap"
};

const baseActionStyle: React.CSSProperties = {
  minHeight: 42,
  padding: "0 14px",
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 14
};

const linkStyle: React.CSSProperties = {
  ...baseActionStyle,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  border: "1px solid #cad7e2",
  background: "#ffffff",
  color: "#1e425f"
};

const buttonStyle: React.CSSProperties = {
  ...baseActionStyle,
  border: "1px solid rgba(23, 36, 51, 0.18)",
  background: "#172433",
  color: "#f8fafc",
  cursor: "pointer"
};
