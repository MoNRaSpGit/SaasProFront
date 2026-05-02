import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BuildMetaCard } from "../../shared/components/BuildMetaCard";
import { getStoredUser, logoutSession, refreshSession } from "./auth.client";
import { getEnabledModules } from "./module-routing";
import { userCanAccessSaasAdmin } from "./tenant-capabilities";

export function DashboardPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string | null>(null);
  const user = useMemo(() => getStoredUser(), []);
  const modules = getEnabledModules(user);
  const hasModules = modules.length > 0;
  const canAccessSaasAdmin = userCanAccessSaasAdmin(user);
  const handleRefresh = async () => {
    setStatus("Renovando token...");
    const tokens = await refreshSession();
    setStatus(tokens ? "Refresh OK" : "Refresh fallido");
  };

  const handleLogout = async () => {
    await logoutSession();
    navigate("/login", { replace: true });
  };

  return (
    <main style={{ maxWidth: 640, margin: "48px auto", fontFamily: "system-ui, sans-serif", padding: "0 16px" }}>
      <h1>Dashboard</h1>
      <p>Ruta protegida activa.</p>
      <p>
        Usuario: <strong>{user?.email || "N/A"}</strong>
      </p>
      <p>
        Tenant activo: <strong>{user?.tenantContext?.tenant.name || "Sin tenant cargado"}</strong>
      </p>
      <p>
        Modulos activos: <strong>{modules.join(", ") || "Ninguno"}</strong>
      </p>

      {hasModules ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {modules.includes("pos") ? <Link to="/pos">Abrir POS</Link> : null}
          {modules.includes("camiones") ? <Link to="/camiones">Abrir Camiones</Link> : null}
          {modules.includes("distribuidora") ? <Link to="/distribuidora">Abrir Distribuidora</Link> : null}
          {canAccessSaasAdmin ? <Link to="/saas-admin">Abrir SaaS Admin</Link> : null}
        </div>
      ) : (
        <section
          style={{
            marginBottom: 16,
            padding: "14px 16px",
            borderRadius: 16,
            background: "#fff7e8",
            border: "1px solid #eed7a6",
            color: "#6e5320"
          }}
        >
          Tu cuenta esta creada, pero todavia no tiene modulos habilitados. Cuando `SaasPro` active tus modelos,
          van a aparecer aca.
          {canAccessSaasAdmin ? " Tu acceso interno SaaS sigue disponible desde el panel admin." : null}
        </section>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={handleRefresh}>
          Probar refresh
        </button>
        <button type="button" onClick={handleLogout}>
          Logout
        </button>
        <Link to="/">Ir a home</Link>
      </div>

      {status ? <p style={{ marginTop: 12 }}>{status}</p> : null}

      <div style={{ marginTop: 20 }}>
        <BuildMetaCard />
      </div>
    </main>
  );
}
