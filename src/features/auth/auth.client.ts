import { AuthSession, AuthTokens, StoredAuthUser } from "./auth.types";
import { API_BASE_URL } from "../../shared/config/api";

const ACCESS_TOKEN_KEY = "saaspro_access_token";
const REFRESH_TOKEN_KEY = "saaspro_refresh_token";
const USER_KEY = "saaspro_user";
const DEMO_SESSION_PREFIX = "demo-";
const DEMO_AUTH_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_AUTH === "true";

export function saveSession(session: AuthSession) {
  localStorage.setItem(ACCESS_TOKEN_KEY, session.tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, session.tokens.refreshToken);
  localStorage.setItem(
    USER_KEY,
    JSON.stringify({
      ...session.user,
      tenantContext: session.tenantContext,
      isDemoSession: session.isDemoSession === true
    } satisfies StoredAuthUser)
  );
}

export function getStoredUser(): StoredAuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuthUser;
  } catch {
    return null;
  }
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
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

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as AuthSession;
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
