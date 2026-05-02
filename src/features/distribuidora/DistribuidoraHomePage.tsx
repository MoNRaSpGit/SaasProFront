import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStoredUser } from "../auth/auth.client";
import { getDistribuidoraStatus } from "./distribuidora.client";
import { DistribuidoraShellStatus } from "./distribuidora.types";

export function DistribuidoraHomePage() {
  const user = getStoredUser();
  const [status, setStatus] = useState<DistribuidoraShellStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      setLoading(true);
      setError(null);

      try {
        const payload = await getDistribuidoraStatus();
        if (!cancelled) {
          setStatus(payload);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "No se pudo cargar distribuidora");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  const userDisplayName = user?.fullName?.trim() || user?.email || "Usuario";

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 920, margin: "0 auto", display: "grid", gap: 18 }}>
        <section style={heroStyle}>
          <p style={eyebrowStyle}>Modulo oficial SaaS</p>
          <div style={headerRowStyle}>
            <div>
              <h1 style={{ margin: 0, fontSize: 34 }}>Distribuidora</h1>
              <p style={heroTextStyle}>
                El modulo ya forma parte oficial de `SaasPro`, con acceso real por tenant y modulo habilitado.
              </p>
            </div>
            <div style={heroActionsStyle}>
              <Link to="/dashboard" style={secondaryLinkStyle}>
                Dashboard
              </Link>
              <Link to="/distribuidora/admin" style={primaryLinkStyle}>
                Vista admin
              </Link>
            </div>
          </div>
        </section>

        <section style={panelStyle}>
          {loading ? <p style={mutedTextStyle}>Cargando shell oficial de distribuidora...</p> : null}
          {error ? <div style={errorBoxStyle}>{error}</div> : null}
          {status ? (
            <div style={{ display: "grid", gap: 18 }}>
              <div style={chipRowStyle}>
                <span style={chipStyle}>Modo: {status.mode}</span>
                <span style={chipStyle}>Estado: {status.status}</span>
                <span style={chipStyle}>Rol: {status.user.membershipRole}</span>
              </div>

              <div style={gridStyle}>
                <article style={cardStyle}>
                  <p style={cardEyebrowStyle}>Tenant</p>
                  <h2 style={cardTitleStyle}>{status.tenant.name}</h2>
                  <p style={cardBodyStyle}>Slug: {status.tenant.slug}</p>
                </article>

                <article style={cardStyle}>
                  <p style={cardEyebrowStyle}>Usuario</p>
                  <h2 style={cardTitleStyle}>{userDisplayName}</h2>
                  <p style={cardBodyStyle}>{status.user.email}</p>
                </article>

                <article style={cardStyle}>
                  <p style={cardEyebrowStyle}>Shell</p>
                  <h2 style={cardTitleStyle}>Sin operacion aun</h2>
                  <p style={cardBodyStyle}>{status.message}</p>
                </article>
              </div>

              <div style={panelInsetStyle}>
                <h3 style={{ marginTop: 0, marginBottom: 12 }}>Capacidades actuales</h3>
                <ul style={listStyle}>
                  <li>Acceso real por `tenant` y `tenant_modules`.</li>
                  <li>Ruta oficial protegida dentro del SaaS.</li>
                  <li>Vista admin registrada para el modulo.</li>
                  <li>Funcionalidad de pedidos todavia no integrada al backend.</li>
                </ul>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: "28px 16px 48px",
  fontFamily: "system-ui, sans-serif",
  background: "linear-gradient(180deg, #edf3f7 0%, #e6eef5 100%)"
};

const heroStyle: React.CSSProperties = {
  padding: "24px 24px 26px",
  borderRadius: 28,
  background: "#183348",
  color: "#f6fbff",
  boxShadow: "0 22px 54px rgba(19, 44, 67, 0.2)"
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  opacity: 0.74
};

const headerRowStyle: React.CSSProperties = {
  marginTop: 12,
  display: "flex",
  gap: 16,
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap"
};

const heroTextStyle: React.CSSProperties = {
  margin: "10px 0 0",
  maxWidth: 620,
  lineHeight: 1.6,
  color: "rgba(246, 251, 255, 0.84)"
};

const heroActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap"
};

const primaryLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: "11px 14px",
  borderRadius: 14,
  textDecoration: "none",
  background: "#f0d6a4",
  color: "#2f2412",
  fontWeight: 700
};

const secondaryLinkStyle: React.CSSProperties = {
  ...primaryLinkStyle,
  background: "rgba(255,255,255,0.08)",
  color: "#f6fbff"
};

const panelStyle: React.CSSProperties = {
  padding: 22,
  borderRadius: 24,
  background: "#ffffff",
  border: "1px solid #d9e4ec",
  boxShadow: "0 16px 34px rgba(24, 51, 72, 0.08)"
};

const mutedTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#60707d"
};

const errorBoxStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 16,
  background: "#fff1f1",
  border: "1px solid #f0c8c8",
  color: "#a12626"
};

const chipRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap"
};

const chipStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  background: "#edf4fb",
  color: "#25435d",
  fontWeight: 700,
  fontSize: 13
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
};

const cardStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 20,
  background: "#f9fbfd",
  border: "1px solid #dce6ef"
};

const cardEyebrowStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "#71808d"
};

const cardTitleStyle: React.CSSProperties = {
  margin: "8px 0 6px",
  fontSize: 24,
  color: "#183348"
};

const cardBodyStyle: React.CSSProperties = {
  margin: 0,
  color: "#586774",
  lineHeight: 1.55
};

const panelInsetStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 20,
  background: "#f3f7fb",
  border: "1px solid #dce6ef"
};

const listStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  color: "#304250",
  lineHeight: 1.7
};
