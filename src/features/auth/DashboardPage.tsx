import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { UserTopBar } from "../../shared/components/UserTopBar";
import { getStoredUser, refreshSession } from "./auth.client";
import { getEnabledModules } from "./module-routing";
import { userCanAccessSaasAdmin } from "./tenant-capabilities";

type ModuleCardDefinition = {
  key: string;
  title: string;
  description: string;
  route: string;
  accent: string;
  surface: string;
};

const MODULE_CARDS: ModuleCardDefinition[] = [
  {
    key: "camiones",
    title: "Camiones",
    description: "Clientes, lugares y viajes.",
    route: "/camiones",
    accent: "#c2410c",
    surface: "linear-gradient(180deg, #fff7ed 0%, #fed7aa 100%)"
  }
];

export function DashboardPage() {
  const [status, setStatus] = useState<string | null>(null);
  const user = useMemo(() => getStoredUser(), []);
  const modules = getEnabledModules(user);
  const canAccessSaasAdmin = userCanAccessSaasAdmin(user);
  const tenantName = user?.tenantContext?.tenant.name || "Sin tenant";
  const userLabel = user?.fullName?.trim() || user?.email || "Usuario";
  const visibleModuleCards = MODULE_CARDS.filter((moduleCard) => modules.includes(moduleCard.key));

  const handleRefresh = async () => {
    setStatus("Renovando sesion...");
    const tokens = await refreshSession();
    setStatus(tokens ? "Sesion renovada" : "No se pudo renovar");
  };

  return (
    <main style={pageStyle}>
      <UserTopBar showDashboardLink={false} />

      <section style={heroStyle}>
        <span style={heroEyebrowStyle}>{tenantName}</span>
        <h1 style={heroTitleStyle}>Hola, {userLabel}</h1>
        <p style={heroTextStyle}>Elegi tu modulo y entra directo al trabajo.</p>
      </section>

      <section style={moduleSectionStyle}>
        {visibleModuleCards.length > 0 ? (
          <div style={moduleGridStyle}>
            {visibleModuleCards.map((moduleCard) => (
              <Link
                key={moduleCard.key}
                to={moduleCard.route}
                style={{
                  ...moduleCardStyle,
                  background: moduleCard.surface,
                  borderColor: `${moduleCard.accent}2f`
                }}
              >
                <span style={{ ...moduleTagStyle, color: moduleCard.accent }}>{moduleCard.key}</span>
                <strong style={moduleTitleStyle}>{moduleCard.title}</strong>
                <p style={moduleBodyStyle}>{moduleCard.description}</p>
              </Link>
            ))}

            {canAccessSaasAdmin ? (
              <Link to="/saas-admin" style={{ ...moduleCardStyle, background: "#ffffff", borderColor: "#d8e1ea" }}>
                <span style={{ ...moduleTagStyle, color: "#334155" }}>staff</span>
                <strong style={moduleTitleStyle}>SaaS Admin</strong>
                <p style={moduleBodyStyle}>Tenants, billing y modulos.</p>
              </Link>
            ) : null}
          </div>
        ) : (
          <section style={emptyStateStyle}>
            <strong style={{ fontSize: 20, color: "#7c4a12" }}>Todavia no tenes modulos habilitados</strong>
            <p style={emptyTextStyle}>
              Cuando `SaasPro` active tus accesos, los vas a ver aca listos para entrar.
            </p>
            {canAccessSaasAdmin ? (
              <Link to="/saas-admin" style={emptyActionStyle}>
                Ir a SaaS Admin
              </Link>
            ) : null}
          </section>
        )}
      </section>

      <section style={footerStripStyle}>
        <div style={footerCardStyle}>
          <span style={footerLabelStyle}>Tenant</span>
          <strong style={footerValueStyle}>{tenantName}</strong>
        </div>
        <div style={footerCardStyle}>
          <span style={footerLabelStyle}>Modulos</span>
          <strong style={footerValueStyle}>{modules.length}</strong>
        </div>
        <button type="button" onClick={handleRefresh} style={refreshButtonStyle}>
          Renovar sesion
        </button>
      </section>

      {status ? <p style={statusStyle}>{status}</p> : null}
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: "clamp(16px, 4vw, 32px) clamp(12px, 3.6vw, 16px) clamp(32px, 7vw, 56px)",
  fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif",
  background:
    "radial-gradient(circle at top left, rgba(251, 191, 36, 0.20), transparent 24%), radial-gradient(circle at top right, rgba(56, 189, 248, 0.18), transparent 22%), linear-gradient(180deg, #fffdf8 0%, #f7fbff 100%)",
  display: "grid",
  gap: 20
};

const heroStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 1080,
  margin: "0 auto",
  padding: "clamp(10px, 3vw, 18px) 2px 4px"
};

const heroEyebrowStyle: React.CSSProperties = {
  display: "inline-block",
  marginBottom: 10,
  padding: "6px 10px",
  borderRadius: 999,
  background: "#fff1d6",
  color: "#9a5c00",
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em"
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "clamp(32px, 5vw, 54px)",
  lineHeight: 0.95,
  color: "#172433"
};

const heroTextStyle: React.CSSProperties = {
  margin: "10px 0 0",
  color: "#5f6d7a",
  fontSize: "clamp(15px, 3.6vw, 18px)",
  lineHeight: 1.45,
  maxWidth: 560
};

const moduleSectionStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 1080,
  margin: "0 auto"
};

const moduleGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
  gap: "clamp(12px, 3vw, 16px)"
};

const moduleCardStyle: React.CSSProperties = {
  minHeight: "clamp(188px, 38vw, 220px)",
  padding: "clamp(16px, 4vw, 20px) clamp(14px, 3.8vw, 18px)",
  borderRadius: 26,
  border: "1px solid",
  textDecoration: "none",
  boxShadow: "0 16px 34px rgba(41, 64, 88, 0.08)",
  display: "grid",
  gap: 10,
  alignContent: "space-between"
};

const moduleTagStyle: React.CSSProperties = {
  width: "fit-content",
  padding: "5px 9px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.7)",
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em"
};

const moduleTitleStyle: React.CSSProperties = {
  fontSize: "clamp(26px, 6vw, 30px)",
  lineHeight: 0.98,
  color: "#172433"
};

const moduleBodyStyle: React.CSSProperties = {
  margin: 0,
  color: "#425364",
  lineHeight: 1.5,
  fontSize: "clamp(14px, 3.4vw, 15px)"
};

const emptyStateStyle: React.CSSProperties = {
  padding: "clamp(18px, 4vw, 24px) clamp(16px, 4vw, 22px)",
  borderRadius: 26,
  background: "#fff7e8",
  border: "1px solid #ecd8ab",
  display: "grid",
  gap: 12
};

const emptyTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#7a5a1b",
  lineHeight: 1.6
};

const emptyActionStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  minHeight: 46,
  padding: "0 14px",
  borderRadius: 999,
  background: "#7a4b12",
  color: "#fff",
  fontWeight: 800,
  textDecoration: "none"
};

const footerStripStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 1080,
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
  gap: 12,
  alignItems: "stretch"
};

const footerCardStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderRadius: 22,
  background: "rgba(255,255,255,0.82)",
  border: "1px solid #e1e8ef",
  display: "grid",
  gap: 6
};

const footerLabelStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#708090",
  fontWeight: 800
};

const footerValueStyle: React.CSSProperties = {
  fontSize: 20,
  color: "#172433"
};

const refreshButtonStyle: React.CSSProperties = {
  minHeight: 84,
  borderRadius: 22,
  border: "1px solid #cdd9e3",
  background: "#ffffff",
  color: "#17324a",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(41, 64, 88, 0.06)"
};

const statusStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 1080,
  margin: "0 auto",
  color: "#4f6477",
  fontSize: 14
};
