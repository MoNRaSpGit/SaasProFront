import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../shared/config/api";
import { BuildMetaCard } from "../../shared/components/BuildMetaCard";
import { saveSession } from "./auth.client";
import { AuthSession } from "./auth.types";

type LoginResponse = AuthSession;

const CAMIONES_DEMO_ACCESS = {
  email: "camiones.demo@saaspro.com",
  password: "camiones123"
};

export function LoginPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prefetchedSession, setPrefetchedSession] = useState<LoginResponse | null>(null);
  const loginPromiseRef = useRef<Promise<LoginResponse> | null>(null);

  const performLoginRequest = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(CAMIONES_DEMO_ACCESS)
    });

    const payload = (await response.json()) as LoginResponse | { message?: string | string[] };
    if (!response.ok) {
      const rawMessage = "message" in payload ? payload.message : null;
      const message = Array.isArray(rawMessage) ? rawMessage.join(", ") : rawMessage || "Error al iniciar sesion";
      throw new Error(message);
    }

    return payload as LoginResponse;
  }, []);

  const startLoginPrefetch = useCallback(() => {
    if (loginPromiseRef.current || prefetchedSession) {
      return loginPromiseRef.current;
    }

    const promise = performLoginRequest()
      .then((session) => {
        setPrefetchedSession(session);
        return session;
      })
      .catch((error) => {
        loginPromiseRef.current = null;
        throw error;
      });

    loginPromiseRef.current = promise;
    return promise;
  }, [performLoginRequest, prefetchedSession]);

  const handleLogin = async () => {
    setApiError(null);
    setIsSubmitting(true);

    try {
      const data = prefetchedSession ?? (await (loginPromiseRef.current ?? startLoginPrefetch() ?? performLoginRequest()));
      const camionesOnlySession: LoginResponse = {
        ...data,
        tenantContext: data.tenantContext
          ? {
              ...data.tenantContext,
              modules: ["camiones"]
            }
          : data.tenantContext
      };

      saveSession(camionesOnlySession);
      navigate("/camiones");
    } catch (error) {
      loginPromiseRef.current = null;
      setPrefetchedSession(null);
      setApiError(error instanceof Error ? error.message : "No se pudo conectar al backend.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <div style={{ display: "grid", gap: 6 }}>
          <p style={eyebrowStyle}>Camiones</p>
          <h1 style={titleStyle}>Login</h1>
        </div>

        <button
          type="button"
          onMouseEnter={() => void startLoginPrefetch()}
          onFocus={() => void startLoginPrefetch()}
          onPointerDown={() => void startLoginPrefetch()}
          onClick={() => void handleLogin()}
          disabled={isSubmitting}
          style={submitButtonStyle}
        >
          {isSubmitting ? "Entrando..." : "Login"}
        </button>

        {apiError ? <div style={errorBoxStyle}>{apiError}</div> : null}

        {!isSubmitting ? <BuildMetaCard compact /> : null}
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: "24px 16px",
  fontFamily: "system-ui, sans-serif",
  background:
    "radial-gradient(circle at top left, rgba(254, 207, 121, 0.22), transparent 28%), linear-gradient(180deg, #f8f4ec 0%, #eee5d9 100%)",
  display: "grid",
  placeItems: "center"
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  padding: 24,
  borderRadius: 28,
  background: "#fffdf9",
  border: "1px solid #ded3c6",
  boxShadow: "0 20px 44px rgba(27, 54, 85, 0.08)",
  display: "grid",
  gap: 18
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.16em",
  color: "#8b755d",
  fontWeight: 800
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 34,
  lineHeight: 1.05,
  color: "#2f241e"
};

const submitButtonStyle: React.CSSProperties = {
  minHeight: 56,
  padding: "14px 16px",
  borderRadius: 18,
  border: "1px solid rgba(16, 74, 53, 0.2)",
  background: "#2b7a57",
  color: "#f7fffb",
  fontWeight: 800,
  fontSize: 18,
  cursor: "pointer",
  boxShadow: "0 16px 28px rgba(43, 122, 87, 0.22)"
};

const errorBoxStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 16,
  background: "#fff1f1",
  border: "1px solid #f0c8c8",
  color: "#a12626"
};
