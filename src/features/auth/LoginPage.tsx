import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { saveSession } from "./auth.client";
import { AuthSession } from "./auth.types";

type LoginFormValues = {
  email: string;
  password: string;
};

type LoginResponse = AuthSession;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://saasproback.onrender.com";

export function LoginPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);
  const [loggedUser, setLoggedUser] = useState<LoginResponse["user"] | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>();

  const onSubmit = async (values: LoginFormValues) => {
    setApiError(null);
    setLoggedUser(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });

      const payload = (await response.json()) as LoginResponse | { message?: string | string[] };
      if (!response.ok) {
        const rawMessage = "message" in payload ? payload.message : null;
        const message = Array.isArray(rawMessage)
          ? rawMessage.join(", ")
          : rawMessage || "Error al iniciar sesion";
        setApiError(message);
        return;
      }

      const data = payload as LoginResponse;
      saveSession(data);
      setLoggedUser(data.user);
      navigate("/dashboard");
    } catch {
      setApiError("No se pudo conectar al backend. Revisar CORS/URL/API.");
    }
  };

  const handleDistribuidoraDemoAccess = () => {
    const demoSession: AuthSession = {
      user: {
        id: 999001,
        email: "demo.distribuidora@saaspro.local",
        fullName: "Demo Distribuidora",
        role: "admin"
      },
      tenantContext: {
        tenant: {
          id: 999,
          name: "Distribuidora Demo",
          slug: "distribuidora-demo",
          status: "active"
        },
        membership: {
          role: "admin",
          status: "active",
          isDefault: true
        },
        modules: ["distribuidora"]
      },
      tokens: {
        accessToken: "demo-distribuidora-access-token",
        refreshToken: "demo-distribuidora-refresh-token",
        tokenType: "Bearer",
        accessTtl: "24h",
        refreshTtl: "7d"
      }
    };

    saveSession(demoSession);
    setApiError(null);
    setLoggedUser(demoSession.user);
    navigate("/distribuidora");
  };

  return (
    <main style={{ maxWidth: 420, margin: "48px auto", fontFamily: "system-ui, sans-serif", padding: "0 16px" }}>
      <h1 style={{ marginBottom: 8 }}>Login</h1>
      <p style={{ marginTop: 0, color: "#555" }}>Ingresa con tu email y password del backend.</p>
      <button
        type="button"
        onClick={() => {
          setValue("email", "juan@saaspro.com");
          setValue("password", "12345");
        }}
        style={{ marginBottom: 12, padding: "8px 10px" }}
      >
        Usar credenciales demo (juan / 12345)
      </button>
      <button
        type="button"
        onClick={handleDistribuidoraDemoAccess}
        style={{
          marginBottom: 16,
          marginLeft: 8,
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid #cfd7e1",
          background: "#eef4fb",
          fontWeight: 700
        }}
      >
        Entrar demo Distribuidora
      </button>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "grid", gap: 12 }}>
        <label>
          Email
          <input
            type="email"
            placeholder="tu@email.com"
            style={{ width: "100%", padding: 10, marginTop: 4 }}
            {...register("email", { required: "Email requerido" })}
          />
        </label>
        {errors.email ? <small style={{ color: "crimson" }}>{errors.email.message}</small> : null}

        <label>
          Password
          <input
            type="password"
            placeholder="********"
            style={{ width: "100%", padding: 10, marginTop: 4 }}
            {...register("password", { required: "Password requerido" })}
          />
        </label>
        {errors.password ? <small style={{ color: "crimson" }}>{errors.password.message}</small> : null}

        <button type="submit" disabled={isSubmitting} style={{ padding: 12, fontWeight: 600 }}>
          {isSubmitting ? "Entrando..." : "Iniciar sesion"}
        </button>
      </form>

      {apiError ? <p style={{ color: "crimson", marginTop: 12 }}>{apiError}</p> : null}
      {loggedUser ? <p style={{ color: "green", marginTop: 12 }}>Login OK: {loggedUser.email}</p> : null}
      <p style={{ marginTop: 12 }}>
        No tenes cuenta? <Link to="/register">Crear cuenta</Link>
      </p>
    </main>
  );
}
