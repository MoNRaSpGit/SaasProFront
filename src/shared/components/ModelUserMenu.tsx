import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getStoredUser, logoutSession } from "../../features/auth/auth.client";

type ModelUserMenuProps = {
  maxNameLength?: number;
  showDashboardLink?: boolean;
  variant?: "light" | "dark";
};

function buildShortUserName(value: string, maxNameLength: number) {
  const trimmed = value.trim();
  if (trimmed.length <= maxNameLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxNameLength)}...`;
}

export function ModelUserMenu({
  maxNameLength = 5,
  showDashboardLink = true,
  variant = "dark"
}: ModelUserMenuProps) {
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
      <div style={userBadgeStyle(variant)}>
        <span style={userIconStyle(variant)} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21a8 8 0 0 0-16 0" />
            <circle cx="12" cy="8" r="4" />
          </svg>
        </span>
        <span style={userNameStyle(variant)}>{shortUserName}</span>
      </div>

      <div style={menuWrapStyle}>
        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          style={menuButtonStyle(variant)}
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
        >
          <span style={hamburgerLineStyle(variant)} />
          <span style={hamburgerLineStyle(variant)} />
          <span style={hamburgerLineStyle(variant)} />
        </button>

        {menuOpen ? (
          <div style={menuPanelStyle}>
            {showDashboardLink ? (
              <Link to="/dashboard" style={menuLinkStyle} onClick={() => setMenuOpen(false)}>
                Ir al dashboard
              </Link>
            ) : null}
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
  gap: 8,
  position: "relative"
};

const baseBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 9px",
  borderRadius: 999
};

function userBadgeStyle(variant: "light" | "dark"): React.CSSProperties {
  return {
    ...baseBadgeStyle,
    background: variant === "dark" ? "rgba(255, 255, 255, 0.1)" : "#ffffff",
    border: variant === "dark" ? "1px solid rgba(255, 255, 255, 0.14)" : "1px solid #d8e1ea"
  };
}

function userIconStyle(variant: "light" | "dark"): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: 999,
    background: variant === "dark" ? "#f3c57d" : "#172433",
    color: variant === "dark" ? "#2f2117" : "#f8fafc",
    flexShrink: 0
  };
}

function userNameStyle(variant: "light" | "dark"): React.CSSProperties {
  return {
    maxWidth: 68,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: variant === "dark" ? "#fbf5ec" : "#172433",
    fontWeight: 700,
    fontSize: 14
  };
}

const menuWrapStyle: React.CSSProperties = {
  position: "relative"
};

function menuButtonStyle(variant: "light" | "dark"): React.CSSProperties {
  return {
    width: 40,
    height: 40,
    borderRadius: 14,
    border: variant === "dark" ? "1px solid rgba(255, 255, 255, 0.16)" : "1px solid #d8e1ea",
    background: variant === "dark" ? "rgba(255, 255, 255, 0.1)" : "#ffffff",
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    cursor: "pointer"
  };
}

function hamburgerLineStyle(variant: "light" | "dark"): React.CSSProperties {
  return {
    width: 16,
    height: 2,
    borderRadius: 999,
    background: variant === "dark" ? "#fbf5ec" : "#172433"
  };
}

const menuPanelStyle: React.CSSProperties = {
  position: "absolute",
  top: 48,
  right: 0,
  minWidth: "min(220px, calc(100vw - 32px))",
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
