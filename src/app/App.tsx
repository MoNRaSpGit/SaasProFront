import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardPage } from "../features/auth/DashboardPage";
import { CamionesHomePage } from "../features/camiones/CamionesHomePage";
import { LoginPage } from "../features/auth/LoginPage";
import { ProtectedRoute } from "../features/auth/ProtectedRoute";
import { RegisterPage } from "../features/auth/RegisterPage";
import { SaasAdminHomePage } from "../features/saas-admin/SaasAdminHomePage";

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
      <Route path="/" element={<Navigate to="/login" replace />} />
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
        path="/saas-admin"
        element={
          <ProtectedRoute requireSaasAdmin>
            <SaasAdminHomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/camiones"
        element={
          <ProtectedRoute requiredModule="camiones">
            <CamionesHomePage />
          </ProtectedRoute>
        }
      />
      <Route path="/health" element={<HealthPage />} />
      <Route path="*" element={<Navigate to="/camiones" replace />} />
    </Routes>
  );
}
