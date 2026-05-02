import { Link, Route, Routes } from "react-router-dom";
import { DashboardPage } from "../features/auth/DashboardPage";
import { CamionesHomePage } from "../features/camiones/CamionesHomePage";
import { DistribuidoraAdminPage } from "../features/distribuidora/DistribuidoraAdminPage";
import { DistribuidoraHomePage } from "../features/distribuidora/DistribuidoraHomePage";
import { LoginPage } from "../features/auth/LoginPage";
import { ProtectedRoute } from "../features/auth/ProtectedRoute";
import { RegisterPage } from "../features/auth/RegisterPage";
import { PosHomePage } from "../features/pos/PosHomePage";

function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "32px 16px 56px",
        fontFamily: "system-ui, sans-serif",
        background:
          "radial-gradient(circle at top left, rgba(222, 234, 247, 0.95), transparent 28%), linear-gradient(180deg, #f5f8fb 0%, #eef3f8 100%)"
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <section
          style={{
            padding: "28px 28px 30px",
            borderRadius: 28,
            background: "#172433",
            color: "#f7fafc",
            boxShadow: "0 24px 60px rgba(23, 36, 51, 0.22)"
          }}
        >
          <p style={{ margin: 0, letterSpacing: "0.16em", textTransform: "uppercase", fontSize: 12, opacity: 0.74 }}>
            SaaS Multi-Modelo
          </p>
          <h1 style={{ margin: "12px 0 10px", fontSize: 42, lineHeight: 1.05 }}>SaaSPro Frontend</h1>
          <p style={{ margin: 0, maxWidth: 720, fontSize: 18, lineHeight: 1.6, opacity: 0.86 }}>
            Base del SaaS con auth y modelo <strong>`pos`</strong> ya operativo dentro del contexto multi-tenant.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 22 }}>
            <Link to="/login" style={heroLinkStyle(true)}>
              Ir a login
            </Link>
            <Link to="/register" style={heroLinkStyle(false)}>
              Crear cuenta
            </Link>
            <Link to="/dashboard" style={heroLinkStyle(false)}>
              Ir al dashboard
            </Link>
          </div>
        </section>

        <section
          style={{
            marginTop: 22,
            display: "grid",
            gap: 18,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))"
          }}
        >
          <article style={homeCardStyle}>
            <p style={eyebrowStyle}>Acceso</p>
            <h2 style={cardTitleStyle}>Auth</h2>
            <p style={cardBodyStyle}>Entra con tu usuario del SaaS o registra un tenant nuevo con su contexto inicial.</p>
            <Link to="/login" style={cardLinkStyle}>
              Abrir login
            </Link>
          </article>

          <article style={homeCardStyle}>
            <p style={eyebrowStyle}>Modelo</p>
            <h2 style={cardTitleStyle}>POS</h2>
            <p style={cardBodyStyle}>Caja con scanner, carrito, ventas, pagos y panel por tenant dentro del SaaS.</p>
            <Link to="/pos" style={cardLinkStyle}>
              Abrir POS
            </Link>
          </article>

          <article style={homeCardStyle}>
            <p style={eyebrowStyle}>Modelo</p>
            <h2 style={cardTitleStyle}>Distribuidora</h2>
            <p style={cardBodyStyle}>
              Pedido por cliente con productos mock, guardado en `localStorage` y vista admin simulada.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <Link to="/distribuidora" style={cardLinkStyle}>
                Abrir modelo
              </Link>
              <Link to="/distribuidora/admin" style={subtleLinkStyle}>
                Ver admin
              </Link>
            </div>
          </article>

          <article style={homeCardStyle}>
            <p style={eyebrowStyle}>Modelo</p>
            <h2 style={cardTitleStyle}>Camiones</h2>
            <p style={cardBodyStyle}>
              Base visual mobile-first para viajes, registro operativo y futuros flujos SaaS del cliente.
            </p>
            <Link to="/camiones" style={cardLinkStyle}>
              Abrir modelo
            </Link>
          </article>

          <article style={homeCardStyle}>
            <p style={eyebrowStyle}>Estado</p>
            <h2 style={cardTitleStyle}>Health</h2>
            <p style={cardBodyStyle}>Chequeo simple del frontend para validar que la app esta levantando bien.</p>
            <Link to="/health" style={cardLinkStyle}>
              Ver health
            </Link>
          </article>
        </section>
      </div>
    </main>
  );
}

function HealthPage() {
  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h2>Frontend OK</h2>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pos"
        element={
          <ProtectedRoute>
            <PosHomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/distribuidora"
        element={
          <ProtectedRoute>
            <DistribuidoraHomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/distribuidora/admin"
        element={
          <ProtectedRoute>
            <DistribuidoraAdminPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/camiones"
        element={
          <ProtectedRoute>
            <CamionesHomePage />
          </ProtectedRoute>
        }
      />
      <Route path="/health" element={<HealthPage />} />
    </Routes>
  );
}

const heroLinkStyle = (primary: boolean): React.CSSProperties => ({
  padding: "12px 16px",
  borderRadius: 999,
  textDecoration: "none",
  fontWeight: 700,
  border: primary ? "1px solid #f4d7a2" : "1px solid rgba(255,255,255,0.18)",
  background: primary ? "#f1d8a8" : "transparent",
  color: primary ? "#2d2110" : "#f7fafc"
});

const homeCardStyle: React.CSSProperties = {
  padding: 22,
  borderRadius: 24,
  background: "#ffffff",
  border: "1px solid #dce4ec",
  boxShadow: "0 16px 38px rgba(27, 54, 85, 0.07)"
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#66717c"
};

const cardTitleStyle: React.CSSProperties = {
  margin: "10px 0 8px",
  fontSize: 26,
  color: "#182433"
};

const cardBodyStyle: React.CSSProperties = {
  margin: 0,
  color: "#5e6a76",
  lineHeight: 1.6
};

const cardLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  marginTop: 14,
  padding: "10px 14px",
  borderRadius: 14,
  textDecoration: "none",
  background: "#172433",
  color: "#f7fafc",
  fontWeight: 700
};

const subtleLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  marginTop: 14,
  padding: "10px 14px",
  borderRadius: 14,
  textDecoration: "none",
  background: "#eef4fa",
  color: "#1f3953",
  fontWeight: 700
};
