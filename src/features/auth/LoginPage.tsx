import { FormEvent, useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../shared/config/api";
import { clearRememberedAccount, getRememberedAccount, saveSession, setRememberedAccount } from "./auth.client";
import { AuthSession } from "./auth.types";

type LoginResponse = AuthSession;

type QuickAccessAccount = {
  id: string;
  label: string;
  identifier: string;
  password: string;
};

const QUICK_ACCESS_ACCOUNTS: QuickAccessAccount[] = [
  {
    id: "guest",
    label: "Entrar como invitado",
    identifier: "camiones.video@saaspro.com",
    password: "camiones123"
  }
];

export function LoginPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);
  const [account, setAccount] = useState(() => getRememberedAccount());
  const [password, setPassword] = useState("");
  const [rememberSession, setRememberSession] = useState(() => Boolean(getRememberedAccount()));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const prefetchedSessionsRef = useRef<Record<string, LoginResponse | null>>({});
  const loginPromisesRef = useRef<Record<string, Promise<LoginResponse> | null>>({});

  const performLoginRequest = useCallback(async (credentials: { identifier: string; password: string }) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: credentials.identifier,
        password: credentials.password
      })
    });

    const responsePayload = (await response.json()) as LoginResponse | { message?: string | string[] };
    if (!response.ok) {
      const rawMessage = "message" in responsePayload ? responsePayload.message : null;
      const message = Array.isArray(rawMessage) ? rawMessage.join(", ") : rawMessage || "Error al iniciar sesion";
      throw new Error(message);
    }

    return responsePayload as LoginResponse;
  }, []);

  const startLoginPrefetch = useCallback(
    (account: QuickAccessAccount) => {
      if (loginPromisesRef.current[account.id] || prefetchedSessionsRef.current[account.id]) {
        return loginPromisesRef.current[account.id];
      }

      const promise = performLoginRequest({ identifier: account.identifier, password: account.password })
        .then((session) => {
          prefetchedSessionsRef.current[account.id] = session;
          return session;
        })
        .catch((error) => {
          loginPromisesRef.current[account.id] = null;
          throw error;
        });

      loginPromisesRef.current[account.id] = promise;
      return promise;
    },
    [performLoginRequest]
  );

  const persistSessionAndGo = useCallback(
    (data: LoginResponse, options?: { persistence?: "local" | "session" }) => {
      const camionesOnlySession: LoginResponse = {
        ...data,
        tenantContext: data.tenantContext
          ? {
              ...data.tenantContext,
              modules: ["camiones"]
            }
          : data.tenantContext
      };

      saveSession(camionesOnlySession, options);
      navigate("/camiones");
    },
    [navigate]
  );

  const handleClassicLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setApiError(null);
    setIsSubmitting(true);

    try {
      if (rememberSession) {
        setRememberedAccount(account);
      } else {
        clearRememberedAccount();
      }

      const data = await performLoginRequest({
        identifier: account.trim(),
        password
      });
      persistSessionAndGo(data, {
        persistence: rememberSession ? "local" : "session"
      });
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "No se pudo conectar al backend.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (account: QuickAccessAccount) => {
    setApiError(null);
    setActiveAccountId(account.id);

    try {
      const data =
        prefetchedSessionsRef.current[account.id] ??
        (await (
          loginPromisesRef.current[account.id] ??
          startLoginPrefetch(account) ??
          performLoginRequest({ identifier: account.identifier, password: account.password })
        ));
      persistSessionAndGo(data);
    } catch (error) {
      loginPromisesRef.current[account.id] = null;
      prefetchedSessionsRef.current[account.id] = null;
      setApiError(error instanceof Error ? error.message : "No se pudo conectar al backend.");
    } finally {
      setActiveAccountId(null);
    }
  };

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <div style={{ display: "grid", gap: 6 }}>
          <p style={eyebrowStyle}>Camiones</p>
          <h1 style={titleStyle}>Login</h1>
        </div>

        <form style={loginFormStyle} onSubmit={handleClassicLogin}>
          <label style={fieldStyle}>
            <span style={fieldLabelStyle}>Cuenta</span>
            <input
              type="text"
              value={account}
              onChange={(event) => setAccount(event.target.value)}
              autoComplete="username"
              required
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            <span style={fieldLabelStyle}>Contrasena</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              style={inputStyle}
            />
          </label>

          <label style={rememberRowStyle}>
            <input
              type="checkbox"
              checked={rememberSession}
              onChange={(event) => setRememberSession(event.target.checked)}
              style={checkboxStyle}
            />
            <span style={rememberLabelStyle}>Recordarme en este dispositivo</span>
          </label>

          <button type="submit" disabled={isSubmitting || activeAccountId !== null} style={isSubmitting ? submitButtonActiveStyle : submitButtonStyle}>
            <span style={buttonTitleStyle}>{isSubmitting ? "Entrando..." : "Entrar"}</span>
          </button>
        </form>

        <div style={quickAccessListStyle}>
          {QUICK_ACCESS_ACCOUNTS.map((account) => {
            const isQuickSubmitting = activeAccountId === account.id;
            return (
              <button
                key={account.id}
                type="button"
                onMouseEnter={() => void startLoginPrefetch(account)}
                onFocus={() => void startLoginPrefetch(account)}
                onPointerDown={() => void startLoginPrefetch(account)}
                onClick={() => void handleLogin(account)}
                disabled={activeAccountId !== null || isSubmitting}
                style={isQuickSubmitting ? secondaryButtonActiveStyle : secondaryButtonStyle}
              >
                <span style={buttonTitleStyle}>{isQuickSubmitting ? "Entrando..." : account.label}</span>
              </button>
            );
          })}
        </div>

        {apiError ? <div style={errorBoxStyle}>{apiError}</div> : null}
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

const quickAccessListStyle: React.CSSProperties = {
  display: "grid",
  gap: 12
};

const loginFormStyle: React.CSSProperties = {
  display: "grid",
  gap: 12
};

const fieldStyle: React.CSSProperties = {
  display: "grid",
  gap: 8
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "#665342"
};

const inputStyle: React.CSSProperties = {
  boxSizing: "border-box",
  width: "100%",
  minHeight: 52,
  padding: "12px 14px",
  borderRadius: 16,
  border: "1px solid #d6ccbe",
  background: "#fffcf7",
  color: "#2f241e",
  fontSize: 16,
  lineHeight: 1.2,
  outline: "none",
  boxShadow: "inset 0 1px 2px rgba(47, 36, 30, 0.04)"
};

const rememberRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "#5f4b3d"
};

const checkboxStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  margin: 0,
  accentColor: "#2b7a57"
};

const rememberLabelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600
};

const submitButtonStyle: React.CSSProperties = {
  minHeight: 72,
  padding: "14px 16px",
  borderRadius: 18,
  border: "1px solid rgba(16, 74, 53, 0.2)",
  background: "#2b7a57",
  color: "#f7fffb",
  fontWeight: 800,
  fontSize: 18,
  cursor: "pointer",
  boxShadow: "0 16px 28px rgba(43, 122, 87, 0.22)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center"
};

const submitButtonActiveStyle: React.CSSProperties = {
  ...submitButtonStyle,
  background: "#215f44"
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 72,
  padding: "14px 16px",
  borderRadius: 18,
  border: "1px solid #d8d2c8",
  background: "#f5efe6",
  color: "#2f241e",
  fontWeight: 800,
  fontSize: 18,
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(76, 66, 58, 0.08)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center"
};

const secondaryButtonActiveStyle: React.CSSProperties = {
  ...secondaryButtonStyle,
  background: "#e7ddd0"
};

const buttonTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 800
};

const errorBoxStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 16,
  background: "#fff1f1",
  border: "1px solid #f0c8c8",
  color: "#a12626"
};
