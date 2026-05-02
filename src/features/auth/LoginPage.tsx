import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../shared/config/api";
import { saveSession } from "./auth.client";
import { getDefaultAuthenticatedRoute } from "./module-routing";
import { AuthSession } from "./auth.types";

type LoginFormValues = {
  email: string;
  password: string;
};

type LoginResponse = AuthSession;

const CAMIONES_DEMO_EMAIL = "camiones.demo@saaspro.com";
const CAMIONES_DEMO_PASSWORD = "camiones123";

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
      navigate(getDefaultAuthenticatedRoute({ ...data.user, tenantContext: data.tenantContext }));
    } catch {
      setApiError("No se pudo conectar al backend. Revisar CORS/URL/API.");
    }
  };

  return (
    <main style={pageStyle}>
      <section style={heroPanelStyle}>
        <p style={eyebrowStyle}>SaaS Multi-Modelo</p>
        <h1 style={heroTitleStyle}>Entrar a SaasPro</h1>
        <p style={heroBodyStyle}>
          Ingresa con tu usuario real o usa uno de los accesos rapidos para probar los modelos que ya tenemos listos.
        </p>
      </section>

      <section style={cardStyle}>
        <div style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 24, color: "#182433" }}>Login</h2>
          <p style={{ margin: 0, color: "#5f6a75", lineHeight: 1.5 }}>
            Usa tu email y password del backend. Los accesos demo son solo temporales para probar.
          </p>
        </div>

        <div style={demoGridStyle}>
          <button
            type="button"
            onClick={() => {
              setValue("email", "juan@saaspro.com");
              setValue("password", "12345");
            }}
            style={demoButtonStyle}
          >
            <strong style={demoTitleStyle}>Demo base</strong>
            <span style={demoTextStyle}>juan@saaspro.com / 12345</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setValue("email", CAMIONES_DEMO_EMAIL);
              setValue("password", CAMIONES_DEMO_PASSWORD);
            }}
            style={camionesDemoButtonStyle}
          >
            <strong style={demoTitleStyle}>Camiones</strong>
            <span style={demoTextStyle}>{CAMIONES_DEMO_EMAIL}</span>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={formStyle}>
          <label style={fieldWrapStyle}>
            <span style={fieldLabelStyle}>Email</span>
            <input
              type="email"
              placeholder="tu@email.com"
              style={inputStyle}
              {...register("email", { required: "Email requerido" })}
            />
          </label>
          {errors.email ? <small style={errorTextStyle}>{errors.email.message}</small> : null}

          <label style={fieldWrapStyle}>
            <span style={fieldLabelStyle}>Password</span>
            <input
              type="password"
              placeholder="********"
              style={inputStyle}
              {...register("password", { required: "Password requerido" })}
            />
          </label>
          {errors.password ? <small style={errorTextStyle}>{errors.password.message}</small> : null}

          <button type="submit" disabled={isSubmitting} style={submitButtonStyle}>
            {isSubmitting ? "Entrando..." : "Iniciar sesion"}
          </button>
        </form>

        {apiError ? <div style={errorBoxStyle}>{apiError}</div> : null}
        {loggedUser ? <div style={successBoxStyle}>Login OK: {loggedUser.email}</div> : null}

        <p style={{ margin: 0, color: "#5f6a75" }}>
          No tenes cuenta?{" "}
          <Link to="/register" style={inlineLinkStyle}>
            Crear cuenta
          </Link>
        </p>
        <p style={{ margin: 0, color: "#7a8793", fontSize: 13 }}>
          `distribuidora` ya no entra por sesion fake: ahora forma parte oficial del SaaS y requiere modulo habilitado.
        </p>
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: "32px 16px 48px",
  fontFamily: "system-ui, sans-serif",
  background:
    "radial-gradient(circle at top left, rgba(223, 232, 244, 0.95), transparent 28%), linear-gradient(180deg, #f5f8fb 0%, #ecf2f8 100%)",
  display: "grid",
  gap: 18,
  alignContent: "center",
  justifyItems: "center"
};

const heroPanelStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 520,
  padding: "24px 24px 26px",
  borderRadius: 28,
  background: "#172433",
  color: "#f7fafc",
  boxShadow: "0 24px 60px rgba(23, 36, 51, 0.22)"
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.16em",
  color: "rgba(247, 250, 252, 0.72)"
};

const heroTitleStyle: React.CSSProperties = {
  margin: "10px 0 8px",
  fontSize: 36,
  lineHeight: 1.05
};

const heroBodyStyle: React.CSSProperties = {
  margin: 0,
  color: "rgba(247, 250, 252, 0.82)",
  lineHeight: 1.6
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 520,
  padding: 24,
  borderRadius: 28,
  background: "#ffffff",
  border: "1px solid #dbe4ec",
  boxShadow: "0 20px 44px rgba(27, 54, 85, 0.08)",
  display: "grid",
  gap: 18
};

const demoGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 10
};

const demoButtonStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  width: "100%",
  textAlign: "left",
  padding: "14px 16px",
  borderRadius: 18,
  border: "1px solid #d6dde6",
  background: "#f7fafc",
  cursor: "pointer"
};

const camionesDemoButtonStyle: React.CSSProperties = {
  ...demoButtonStyle,
  border: "1px solid #e5d3a9",
  background: "#fff4df"
};

const demoTitleStyle: React.CSSProperties = {
  fontSize: 15,
  color: "#182433"
};

const demoTextStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#60707d"
};

const formStyle: React.CSSProperties = {
  display: "grid",
  gap: 12
};

const fieldWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: 8
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "#3d4a57"
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 52,
  padding: "14px 16px",
  borderRadius: 16,
  border: "1px solid #d5dde6",
  background: "#fbfdff",
  fontSize: 16,
  boxSizing: "border-box"
};

const submitButtonStyle: React.CSSProperties = {
  minHeight: 54,
  padding: "14px 16px",
  borderRadius: 16,
  border: "1px solid rgba(20, 47, 71, 0.2)",
  background: "#172433",
  color: "#f7fafc",
  fontWeight: 800,
  fontSize: 16,
  cursor: "pointer",
  boxShadow: "0 16px 28px rgba(23, 36, 51, 0.18)"
};

const errorTextStyle: React.CSSProperties = {
  color: "#b42318",
  marginTop: -4
};

const errorBoxStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 16,
  background: "#fff1f1",
  border: "1px solid #f0c8c8",
  color: "#a12626"
};

const successBoxStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 16,
  background: "#eef8f1",
  border: "1px solid #cde7d4",
  color: "#21613d"
};

const inlineLinkStyle: React.CSSProperties = {
  color: "#1f4f7b",
  fontWeight: 700,
  textDecoration: "none"
};
