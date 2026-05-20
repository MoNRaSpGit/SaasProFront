import { AuthSession, AuthTokens, StoredAuthUser } from "./auth.types";
import { API_BASE_URL } from "../../shared/config/api";

const ACCESS_TOKEN_KEY = "frontend-camiones.access_token";
const REFRESH_TOKEN_KEY = "frontend-camiones.refresh_token";
const USER_KEY = "frontend-camiones.user";
const REMEMBERED_ACCOUNT_KEY = "frontend-camiones.remembered_account";
const DEMO_SESSION_PREFIX = "demo-";
const DEMO_AUTH_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_AUTH === "true";
const REQUIRED_MODULE = "camiones";

type SessionPersistence = "local" | "session";

export function saveSession(session: AuthSession, options?: { persistence?: SessionPersistence }) {
  const scopedSession = normalizeCamionesSession(session);
  const persistence = options?.persistence ?? "local";
  const storage = persistence === "local" ? localStorage : sessionStorage;

  clearSession();

  storage.setItem(ACCESS_TOKEN_KEY, session.tokens.accessToken);
  storage.setItem(REFRESH_TOKEN_KEY, session.tokens.refreshToken);
  storage.setItem(
    USER_KEY,
    JSON.stringify({
      ...scopedSession.user,
      tenantContext: scopedSession.tenantContext,
      isDemoSession: scopedSession.isDemoSession === true,
      sessionScope: "camiones"
    } satisfies StoredAuthUser)
  );
}

export function getStoredUser(): StoredAuthUser | null {
  const raw = getSessionStorageItem(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredAuthUser;
    return isCamionesStoredUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function getAccessToken() {
  return getSessionStorageItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return getSessionStorageItem(REFRESH_TOKEN_KEY);
}

export function isDemoAuthEnabled() {
  return DEMO_AUTH_ENABLED;
}

export function isDemoToken(token: string | null) {
  return Boolean(token && token.startsWith(DEMO_SESSION_PREFIX));
}

export async function refreshSession(): Promise<AuthTokens | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  const currentUser = getStoredUser();

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as AuthSession;
  if (!isSessionCompatibleWithCurrentTenant(payload, currentUser)) {
    clearSession();
    return null;
  }

  saveSession(payload);
  return payload.tokens;
}

export async function logoutSession() {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken })
    });
  }
  clearSession();
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export async function fetchWithAuth(input: string, init?: RequestInit) {
  const token = getAccessToken();
  const headers = new Headers(init?.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const doRequest = () =>
    fetch(input, {
      ...init,
      headers
    });

  let response = await doRequest();
  if (response.status !== 401) return response;

  const refreshed = await refreshSession();
  if (!refreshed) return response;

  headers.set("Authorization", `Bearer ${refreshed.accessToken}`);
  response = await doRequest();
  return response;
}

function normalizeCamionesSession(session: AuthSession) {
  const modules = session.tenantContext?.modules || [];
  if (!modules.includes(REQUIRED_MODULE)) {
    throw new Error("La sesion no tiene acceso al modulo camiones.");
  }

  return {
    ...session,
    tenantContext: session.tenantContext
      ? {
          ...session.tenantContext,
          modules: [REQUIRED_MODULE]
        }
      : session.tenantContext
  };
}

function isCamionesStoredUser(user: StoredAuthUser | null): user is StoredAuthUser {
  return Boolean(user?.tenantContext?.modules?.includes(REQUIRED_MODULE) && user.sessionScope === "camiones");
}

function isSessionCompatibleWithCurrentTenant(session: AuthSession, currentUser: StoredAuthUser | null) {
  if (!currentUser?.tenantContext?.tenant.id) {
    return true;
  }

  return session.tenantContext?.tenant.id === currentUser.tenantContext.tenant.id;
}

function getSessionStorageItem(key: string) {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

export function getRememberedAccount() {
  return localStorage.getItem(REMEMBERED_ACCOUNT_KEY) ?? "";
}

export function setRememberedAccount(account: string) {
  const normalized = account.trim();

  if (!normalized) {
    localStorage.removeItem(REMEMBERED_ACCOUNT_KEY);
    return;
  }

  localStorage.setItem(REMEMBERED_ACCOUNT_KEY, normalized);
}

export function clearRememberedAccount() {
  localStorage.removeItem(REMEMBERED_ACCOUNT_KEY);
}
