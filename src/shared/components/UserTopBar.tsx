import { useLocation } from "react-router-dom";
import { ModelUserMenu } from "./ModelUserMenu";

type UserTopBarProps = {
  showDashboardLink?: boolean;
};

export function UserTopBar({ showDashboardLink = true }: UserTopBarProps) {
  const location = useLocation();
  const shouldShowDashboardLink = showDashboardLink && location.pathname !== "/dashboard";

  return (
    <nav style={navStyle} aria-label="Sesion">
      <div style={brandWrapStyle}>
        <span style={brandAccentStyle} />
        <strong style={brandTextStyle}>SaaSPro</strong>
      </div>

      <ModelUserMenu variant="light" showDashboardLink={shouldShowDashboardLink} />
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
  padding: "10px 12px",
  borderRadius: 22,
  background: "rgba(255, 255, 255, 0.74)",
  border: "1px solid rgba(212, 223, 232, 0.95)",
  boxShadow: "0 10px 24px rgba(44, 69, 94, 0.08)",
  backdropFilter: "blur(14px)"
};

const brandWrapStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0
};

const brandAccentStyle: React.CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: 999,
  background: "linear-gradient(180deg, #fb7185 0%, #f59e0b 100%)",
  flexShrink: 0
};

const brandTextStyle: React.CSSProperties = {
  color: "#1c2c3d",
  fontWeight: 800,
  letterSpacing: "-0.03em",
  fontSize: "clamp(14px, 3.5vw, 16px)"
};
