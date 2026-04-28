import { Link, Route, Routes } from "react-router-dom";
import { LoginPage } from "../features/auth/LoginPage";

function HomePage() {
  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>SaasPro Frontend</h1>
      <p>Scaffold base listo para iniciar el MVP de almacen.</p>
      <p>
        <Link to="/login">Ir a login</Link>
      </p>
      <Link to="/health">Ir a health page</Link>
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
      <Route path="/health" element={<HealthPage />} />
    </Routes>
  );
}
