import { API_BASE_URL } from "../../shared/config/api";
import { fetchWithAuth } from "../auth/auth.client";
import { DistribuidoraShellStatus } from "./distribuidora.types";

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { message?: string | string[] };
  if (!response.ok) {
    const rawMessage = "message" in payload ? payload.message : null;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(", ")
      : rawMessage || "Request failed";
    throw new Error(message);
  }

  return payload;
}

export async function getDistribuidoraStatus() {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/distribuidora/status`);
  return readJson<DistribuidoraShellStatus>(response);
}

export async function getDistribuidoraAdminStatus() {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/distribuidora/admin/status`);
  return readJson<DistribuidoraShellStatus>(response);
}
