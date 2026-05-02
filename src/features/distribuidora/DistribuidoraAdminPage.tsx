import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDistribuidoraAdminStatus } from "./distribuidora.client";
import { DistribuidoraShellStatus } from "./distribuidora.types";

export function DistribuidoraAdminPage() {
  const [status, setStatus] = useState<DistribuidoraShellStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      setLoading(true);
      setError(null);

      try {
        const payload = await getDistribuidoraAdminStatus();
        if (!cancelled) {
          setStatus(payload);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "No se pudo cargar la vista admin");
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

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gap: 18 }}>
        <header style={heroStyle}>
          <p style={eyebrowStyle}>Vista admin shell</p>
          <div style={headerRowStyle}>
            <div>
              <h1 style={{ margin: 0, fontSize: 32 }}>Distribuidora Admin</h1>
              <p style={heroTextStyle}>
                La vista administrativa ya esta registrada dentro del SaaS, pero todavia no consume pedidos reales.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link to="/distribuidora" style={secondaryLinkStyle}>
                Modulo
              </Link>
              <Link to="/dashboard" style={secondaryLinkStyle}>
                Dashboard
              </Link>
            </div>
          </div>
        </header>

        <section style={panelStyle}>
          {loading ? <p style={mutedTextStyle}>Cargando vista admin shell...</p> : null}
          {error ? <div style={errorBoxStyle}>{error}</div> : null}
          {status ? (
            <div style={{ display: "grid", gap: 16 }}>
              <div style={chipRowStyle}>
                <span style={chipStyle}>Vista: {status.view || "shell"}</span>
                <span style={chipStyle}>Tenant: {status.tenant.slug}</span>
                <span style={chipStyle}>Estado: {status.status}</span>
              </div>

              <div style={panelInsetStyle}>
                <h2 style={{ marginTop: 0, marginBottom: 10, color: "#183348" }}>Que ya esta resuelto</h2>
                <ul style={listStyle}>
                  <li>Acceso real a la ruta admin por auth del SaaS.</li>
                  <li>Validacion de modulo `distribuidora` habilitado.</li>
                  <li>Contexto tenant disponible para futuras pantallas reales.</li>
                </ul>
              </div>

              <div style={panelInsetStyle}>
                <h2 style={{ marginTop: 0, marginBottom: 10, color: "#183348" }}>Que queda para despues</h2>
                <ul style={listStyle}>
                  <li>Pedidos reales por tenant.</li>
                  <li>Productos reales por tenant.</li>
                  <li>Lectura admin conectada a backend de negocio.</li>
                </ul>
              </div>

              <p style={{ margin: 0, color: "#5b6a76" }}>{status.message}</p>
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
  background: "#22323d",
  color: "#f7fbfe"
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
  color: "rgba(247, 251, 254, 0.82)"
};

const secondaryLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: "11px 14px",
  borderRadius: 14,
  textDecoration: "none",
  background: "rgba(255,255,255,0.08)",
  color: "#f7fbfe",
  fontWeight: 700
};

const panelStyle: React.CSSProperties = {
  padding: 22,
  borderRadius: 24,
  background: "#ffffff",
  border: "1px solid #d9e4ec"
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
