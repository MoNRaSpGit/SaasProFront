import { API_BASE_URL } from "./api";

declare const __APP_VERSION__: string;
declare const __APP_RELEASE_SHA__: string;
declare const __APP_RELEASE_CREATED_AT__: string | null;

export type BackendBuildMeta = {
  service: string;
  environment: string;
  version: string;
  releaseSha: string;
  releaseCreatedAt: string | null;
  startedAt: string;
  uptimeSeconds: number;
  timestamp: string;
};

export type FrontendBuildMeta = {
  version: string;
  releaseSha: string;
  releaseCreatedAt: string | null;
  environment: string;
};

export const FRONTEND_BUILD_INFO: FrontendBuildMeta = {
  version: __APP_VERSION__,
  releaseSha: __APP_RELEASE_SHA__,
  releaseCreatedAt: __APP_RELEASE_CREATED_AT__,
  environment: import.meta.env.MODE
};

export async function fetchBackendBuildMeta() {
  const response = await fetch(`${API_BASE_URL}/api/v1/health/meta`, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("No se pudo cargar metadata del backend");
  }

  return (await response.json()) as BackendBuildMeta;
}

export async function fetchPublishedFrontendBuildMeta() {
  const response = await fetch(`${import.meta.env.BASE_URL}app-build.json?ts=${Date.now()}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("No se pudo cargar metadata del frontend");
  }

  return (await response.json()) as FrontendBuildMeta;
}
