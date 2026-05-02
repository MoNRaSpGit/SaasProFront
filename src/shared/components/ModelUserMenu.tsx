import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getStoredUser, logoutSession } from "../../features/auth/auth.client";

type ModelUserMenuProps = {
  maxNameLength?: number;
};

function buildShortUserName(value: string, maxNameLength: number) {
  const trimmed = value.trim();
  if (trimmed.length <= maxNameLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxNameLength)}...`;
}

export function ModelUserMenu({ maxNameLength = 5 }: ModelUserMenuProps) {
  const navigate = useNavigate();
  const user = useMemo(() => getStoredUser(), []);
  const [menuOpen, setMenuOpen] = useState(false);
  const shortUserName = buildShortUserName(user?.fullName?.trim() || user?.email || "Usuario", maxNameLength);

  async function handleLogout() {
    await logoutSession();
    navigate("/", { replace: true });
  }

  return (
    <div style={clusterStyle}>
      <div style={userBadgeStyle}>
        <span style={userIconStyle} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21a8 8 0 0 0-16 0" />
            <circle cx="12" cy="8" r="4" />
          </svg>
        </span>
        <span style={userNameStyle}>{shortUserName}</span>
      </div>

      <div style={menuWrapStyle}>
        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          style={menuButtonStyle}
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
        >
          <span style={hamburgerLineStyle} />
          <span style={hamburgerLineStyle} />
          <span style={hamburgerLineStyle} />
        </button>

        {menuOpen ? (
          <div style={menuPanelStyle}>
            <Link to="/dashboard" style={menuLinkStyle} onClick={() => setMenuOpen(false)}>
              Ir al dashboard
            </Link>
            <button type="button" onClick={() => void handleLogout()} style={menuActionStyle}>
              Cerrar sesion
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const clusterStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  position: "relative"
};

const userBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 999,
  background: "rgba(255, 255, 255, 0.1)",
  border: "1px solid rgba(255, 255, 255, 0.14)"
};

const userIconStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  borderRadius: 999,
  background: "#f3c57d",
  color: "#2f2117",
  flexShrink: 0
};

const userNameStyle: React.CSSProperties = {
  maxWidth: 74,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: "#fbf5ec",
  fontWeight: 700,
  fontSize: 14
};

const menuWrapStyle: React.CSSProperties = {
  position: "relative"
};

const menuButtonStyle: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 14,
  border: "1px solid rgba(255, 255, 255, 0.16)",
  background: "rgba(255, 255, 255, 0.1)",
  display: "inline-flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  cursor: "pointer"
};

const hamburgerLineStyle: React.CSSProperties = {
  width: 16,
  height: 2,
  borderRadius: 999,
  background: "#fbf5ec"
};

const menuPanelStyle: React.CSSProperties = {
  position: "absolute",
  top: 52,
  right: 0,
  minWidth: 220,
  padding: 10,
  borderRadius: 22,
  background: "rgba(255, 250, 244, 0.98)",
  border: "1px solid rgba(217, 205, 191, 0.95)",
  boxShadow: "0 22px 38px rgba(23, 16, 12, 0.22)",
  display: "grid",
  gap: 8,
  zIndex: 10
};

const menuLinkStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "12px 14px",
  borderRadius: 16,
  color: "#2f241e",
  textDecoration: "none",
  fontWeight: 700,
  background: "#fffdf9",
  border: "1px solid #eadfd1"
};

const menuActionStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 16,
  border: "1px solid #efd8c2",
  background: "#fff3e6",
  color: "#5d2f19",
  textAlign: "left",
  fontWeight: 700,
  cursor: "pointer"
};
