import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getStoredUser, logoutSession, refreshSession } from "./auth.client";

export function DashboardPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string | null>(null);
  const user = useMemo(() => getStoredUser(), []);

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
    </main>
  );
}
