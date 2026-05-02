import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BuildMetaCard } from "../../shared/components/BuildMetaCard";
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
    key: "pos",
    title: "POS",
    description: "Ventas, scanner, cobros y panel operativo del punto de venta.",
    route: "/pos",
    accent: "#155e75",
    surface: "linear-gradient(180deg, #ecfeff 0%, #cffafe 100%)"
  },
  {
    key: "camiones",
    title: "Camiones",
    description: "Clientes, viajes y control simple de cobro para operativa en calle.",
    route: "/camiones",
    accent: "#9a3412",
    surface: "linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%)"
  },
  {
    key: "distribuidora",
    title: "Distribuidora",
    description: "Modulo oficial del SaaS ya integrado, hoy disponible en modo shell.",
    route: "/distribuidora",
    accent: "#166534",
    surface: "linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)"
  }
];

export function DashboardPage() {
  const [status, setStatus] = useState<string | null>(null);
  const user = useMemo(() => getStoredUser(), []);
  const modules = getEnabledModules(user);
  const hasModules = modules.length > 0;
  const canAccessSaasAdmin = userCanAccessSaasAdmin(user);
  const tenantName = user?.tenantContext?.tenant.name || "Sin tenant cargado";
  const userLabel = user?.fullName?.trim() || user?.email || "Usuario";
  const billing = user?.tenantContext?.billing;
  const visibleModuleCards = MODULE_CARDS.filter((moduleCard) => modules.includes(moduleCard.key));

  const handleRefresh = async () => {
    setStatus("Renovando token...");
    const tokens = await refreshSession();
    setStatus(tokens ? "Refresh OK" : "Refresh fallido");
  };

  return (
    <main style={pageStyle}>
      <UserTopBar showDashboardLink={false} />

      <section style={heroSectionStyle}>
        <div style={heroCopyStyle}>
          <span style={eyebrowStyle}>SaasPro Dashboard</span>
          <h1 style={heroTitleStyle}>Hola, {userLabel}</h1>
          <p style={heroTextStyle}>
            Este es tu punto de entrada al SaaS. Desde aca podes ver el estado de tu cuenta y abrir los modulos
            habilitados para <strong>{tenantName}</strong>.
          </p>
          <div style={heroActionsStyle}>
            <button type="button" onClick={handleRefresh} style={primaryButtonStyle}>
              Renovar sesion
            </button>
          </div>
          {status ? <p style={statusPillStyle}>{status}</p> : null}
        </div>

        <div style={heroSummaryCardStyle}>
          <div style={summaryHeaderStyle}>
            <span style={summaryLabelStyle}>Tenant activo</span>
            <span style={billingBadgeStyle(billing?.status)}>{formatBillingStatus(billing?.status)}</span>
          </div>
          <strong style={tenantNameStyle}>{tenantName}</strong>
          <div style={summaryGridStyle}>
            <SummaryItem label="Usuario" value={user?.email || "N/A"} />
            <SummaryItem label="Rol tenant" value={user?.tenantContext?.membership.role || "Sin rol"} />
            <SummaryItem label="Modulos" value={String(modules.length)} />
            <SummaryItem label="Slug" value={user?.tenantContext?.tenant.slug || "Sin slug"} />
          </div>
        </div>
      </section>

      <section style={infoStripStyle}>
        <InfoCard
          title="Estado de cuenta"
          value={formatBillingStatus(billing?.status)}
          detail={formatBillingDetail(billing?.paidUntil, billing?.graceUntil)}
        />
        <InfoCard
          title="Modulos activos"
          value={modules.join(", ") || "Ninguno"}
          detail={hasModules ? "Tus accesos visibles salen de tenantContext.modules." : "Todavia no hay modulos habilitados."}
        />
      </section>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Tus modulos</h2>
            <p style={sectionBodyStyle}>
              Mostramos solo los modulos habilitados para este tenant. Cada acceso mantiene sus guardas y permisos.
            </p>
          </div>
        </div>

        {hasModules ? (
          <div style={moduleGridStyle}>
            {visibleModuleCards.map((moduleCard) => (
              <article
                key={moduleCard.key}
                style={{
                  ...moduleCardStyle,
                  background: moduleCard.surface,
                  borderColor: `${moduleCard.accent}33`
                }}
              >
                <div style={moduleCardHeaderStyle}>
                  <span style={{ ...moduleTagStyle, color: moduleCard.accent, borderColor: `${moduleCard.accent}3d` }}>
                    {moduleCard.key}
                  </span>
                  <h3 style={moduleCardTitleStyle}>{moduleCard.title}</h3>
                </div>
                <p style={moduleCardBodyStyle}>{moduleCard.description}</p>
                <Link to={moduleCard.route} style={{ ...moduleLinkStyle, background: moduleCard.accent }}>
                  Abrir modulo
                </Link>
              </article>
            ))}

            {canAccessSaasAdmin ? (
              <article style={{ ...moduleCardStyle, background: "#fff", borderColor: "#d6e1ea" }}>
                <div style={moduleCardHeaderStyle}>
                  <span style={{ ...moduleTagStyle, color: "#334155", borderColor: "#cbd5e1" }}>staff</span>
                  <h3 style={moduleCardTitleStyle}>SaaS Admin</h3>
                </div>
                <p style={moduleCardBodyStyle}>
                  Panel interno para revisar tenants, billing y modulos habilitados dentro de la operacion del SaaS.
                </p>
                <Link to="/saas-admin" style={{ ...moduleLinkStyle, background: "#172433" }}>
                  Abrir panel interno
                </Link>
              </article>
            ) : null}
          </div>
        ) : (
          <section style={emptyStateStyle}>
            <strong style={{ fontSize: 18, color: "#734c10" }}>Todavia no tenes modulos habilitados</strong>
            <p style={{ margin: 0, color: "#7a5a1b", lineHeight: 1.6 }}>
              Tu cuenta ya existe, pero aun no tiene modelos activos. Cuando `SaasPro` habilite tus modulos van a
              aparecer aca listos para entrar.
            </p>
            {canAccessSaasAdmin ? (
              <Link to="/saas-admin" style={{ ...moduleLinkStyle, background: "#7a4b12", width: "fit-content" }}>
                Ir a SaaS Admin
              </Link>
            ) : null}
          </section>
        )}
      </section>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Estado tecnico</h2>
            <p style={sectionBodyStyle}>
              Herramientas utiles para validar sesion y build mientras seguimos afinando el producto.
            </p>
          </div>
        </div>

        <div style={technicalGridStyle}>
          <div style={technicalCardStyle}>
            <h3 style={technicalTitleStyle}>Sesion</h3>
            <p style={technicalBodyStyle}>
              Si queres probar persistencia o renovacion manual del token, este acceso sigue disponible desde el
              dashboard.
            </p>
            <button type="button" onClick={handleRefresh} style={ghostButtonStyle}>
              Ejecutar refresh
            </button>
          </div>

          <BuildMetaCard />
        </div>
      </section>
    </main>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={summaryItemStyle}>
      <span style={summaryItemLabelStyle}>{label}</span>
      <strong style={summaryItemValueStyle}>{value}</strong>
    </div>
  );
}

function InfoCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <article style={infoCardStyle}>
      <span style={infoCardLabelStyle}>{title}</span>
      <strong style={infoCardValueStyle}>{value}</strong>
      <p style={infoCardDetailStyle}>{detail}</p>
    </article>
  );
}

function formatBillingStatus(status: string | undefined) {
  if (status === "active") return "Activa";
  if (status === "grace_period") return "En gracia";
  if (status === "pending_manual_block") return "Pendiente revision";
  if (status === "blocked") return "Bloqueada";
  return "Sin estado";
}

function formatBillingDetail(paidUntil: string | null | undefined, graceUntil: string | null | undefined) {
  if (paidUntil) {
    return `Cobertura paga hasta ${formatIsoDate(paidUntil)}.`;
  }

  if (graceUntil) {
    return `Gracia visible hasta ${formatIsoDate(graceUntil)}.`;
  }

  return "Sin fechas de billing cargadas por ahora.";
}

function formatIsoDate(value: string) {
  return new Date(value).toLocaleDateString("es-UY");
}

function billingBadgeStyle(status: string | undefined): React.CSSProperties {
  if (status === "active") {
    return {
      ...summaryBadgeBaseStyle,
      color: "#166534",
      background: "#dcfce7"
    };
  }

  if (status === "grace_period") {
    return {
      ...summaryBadgeBaseStyle,
      color: "#9a3412",
      background: "#ffedd5"
    };
  }

  if (status === "pending_manual_block") {
    return {
      ...summaryBadgeBaseStyle,
      color: "#92400e",
      background: "#fef3c7"
    };
  }

  if (status === "blocked") {
    return {
      ...summaryBadgeBaseStyle,
      color: "#991b1b",
      background: "#fee2e2"
    };
  }

  return {
    ...summaryBadgeBaseStyle,
    color: "#475569",
    background: "#e2e8f0"
  };
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: "32px 16px 56px",
  fontFamily: "Georgia, Cambria, 'Times New Roman', serif",
  background:
    "radial-gradient(circle at top left, rgba(255, 237, 213, 0.88), transparent 24%), radial-gradient(circle at top right, rgba(207, 250, 254, 0.9), transparent 28%), linear-gradient(180deg, #f8f4ec 0%, #f6fbff 100%)",
  display: "grid",
  gap: 22
};

const heroSectionStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 1120,
  margin: "0 auto",
  display: "grid",
  gap: 18,
  gridTemplateColumns: "minmax(0, 1.5fr) minmax(280px, 0.9fr)",
  alignItems: "stretch"
};

const heroCopyStyle: React.CSSProperties = {
  padding: "28px 28px 30px",
  borderRadius: 32,
  background: "#172433",
  color: "#f8fafc",
  boxShadow: "0 24px 64px rgba(23, 36, 51, 0.2)",
  display: "grid",
  gap: 14
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  color: "rgba(248, 250, 252, 0.68)"
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "clamp(36px, 6vw, 58px)",
  lineHeight: 0.96
};

const heroTextStyle: React.CSSProperties = {
  margin: 0,
  maxWidth: 620,
  fontSize: 18,
  lineHeight: 1.65,
  color: "rgba(248, 250, 252, 0.86)"
};

const heroActionsStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  marginTop: 6
};

const primaryButtonStyle: React.CSSProperties = {
  minHeight: 52,
  padding: "0 18px",
  borderRadius: 999,
  border: "1px solid rgba(255, 255, 255, 0.2)",
  background: "#f59e0b",
  color: "#172433",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer"
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 52,
  padding: "0 18px",
  borderRadius: 999,
  border: "1px solid rgba(255, 255, 255, 0.24)",
  background: "transparent",
  color: "#f8fafc",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer"
};

const statusPillStyle: React.CSSProperties = {
  margin: 0,
  width: "fit-content",
  padding: "8px 12px",
  borderRadius: 999,
  background: "rgba(255, 255, 255, 0.12)",
  color: "#f8fafc",
  fontSize: 13,
  fontWeight: 700
};

const heroSummaryCardStyle: React.CSSProperties = {
  padding: "24px 22px",
  borderRadius: 30,
  background: "rgba(255, 255, 255, 0.9)",
  border: "1px solid rgba(255, 255, 255, 0.75)",
  boxShadow: "0 18px 46px rgba(53, 87, 118, 0.12)",
  display: "grid",
  gap: 16,
  alignContent: "start"
};

const summaryHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap"
};

const summaryLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "#617486"
};

const summaryBadgeBaseStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "7px 12px",
  fontSize: 12,
  fontWeight: 800
};

const tenantNameStyle: React.CSSProperties = {
  fontSize: 30,
  lineHeight: 1.05,
  color: "#172433"
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12
};

const summaryItemStyle: React.CSSProperties = {
  padding: "14px 14px 12px",
  borderRadius: 18,
  background: "#f8fbfd",
  border: "1px solid #dde6ee",
  display: "grid",
  gap: 6
};

const summaryItemLabelStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#6b7f91",
  fontWeight: 700
};

const summaryItemValueStyle: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.35,
  color: "#182433"
};

const infoStripStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 1120,
  margin: "0 auto",
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))"
};

const infoCardStyle: React.CSSProperties = {
  padding: "18px 20px",
  borderRadius: 24,
  background: "rgba(255, 255, 255, 0.86)",
  border: "1px solid #dfebf4",
  display: "grid",
  gap: 8
};

const infoCardLabelStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "#6f8294",
  fontWeight: 700
};

const infoCardValueStyle: React.CSSProperties = {
  fontSize: 24,
  lineHeight: 1.1,
  color: "#172433"
};

const infoCardDetailStyle: React.CSSProperties = {
  margin: 0,
  color: "#526476",
  lineHeight: 1.55
};

const sectionStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 1120,
  margin: "0 auto",
  padding: "24px 22px 26px",
  borderRadius: 30,
  background: "rgba(255, 255, 255, 0.82)",
  border: "1px solid rgba(221, 230, 238, 0.95)",
  boxShadow: "0 18px 46px rgba(62, 93, 121, 0.08)",
  display: "grid",
  gap: 18
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap"
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 28,
  lineHeight: 1.05,
  color: "#172433"
};

const sectionBodyStyle: React.CSSProperties = {
  margin: "8px 0 0",
  maxWidth: 640,
  color: "#536678",
  lineHeight: 1.6
};

const inlineLinkStyle: React.CSSProperties = {
  color: "#1d4f7d",
  fontWeight: 700,
  textDecoration: "none",
  paddingTop: 8
};

const moduleGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 16
};

const moduleCardStyle: React.CSSProperties = {
  minHeight: 230,
  padding: "20px 18px",
  borderRadius: 24,
  border: "1px solid",
  display: "grid",
  gap: 14,
  alignContent: "space-between"
};

const moduleCardHeaderStyle: React.CSSProperties = {
  display: "grid",
  gap: 10
};

const moduleTagStyle: React.CSSProperties = {
  width: "fit-content",
  borderRadius: 999,
  border: "1px solid",
  padding: "5px 10px",
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  background: "rgba(255, 255, 255, 0.55)"
};

const moduleCardTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 26,
  lineHeight: 1.05,
  color: "#172433"
};

const moduleCardBodyStyle: React.CSSProperties = {
  margin: 0,
  color: "#435466",
  lineHeight: 1.65
};

const moduleLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "fit-content",
  minHeight: 44,
  padding: "0 16px",
  borderRadius: 999,
  color: "#fff",
  fontWeight: 800,
  textDecoration: "none"
};

const emptyStateStyle: React.CSSProperties = {
  padding: "20px 18px",
  borderRadius: 24,
  background: "#fff7e8",
  border: "1px solid #edd7aa",
  display: "grid",
  gap: 12
};

const technicalGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "minmax(0, 320px) minmax(0, 1fr)"
};

const technicalCardStyle: React.CSSProperties = {
  padding: "18px 18px 20px",
  borderRadius: 24,
  background: "#f8fbfd",
  border: "1px solid #dce5ed",
  display: "grid",
  gap: 12,
  alignContent: "start"
};

const technicalTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  color: "#172433"
};

const technicalBodyStyle: React.CSSProperties = {
  margin: 0,
  color: "#536678",
  lineHeight: 1.6
};

const ghostButtonStyle: React.CSSProperties = {
  minHeight: 46,
  width: "fit-content",
  padding: "0 16px",
  borderRadius: 999,
  border: "1px solid #bfd0de",
  background: "#fff",
  color: "#17324a",
  fontWeight: 700,
  cursor: "pointer"
};
