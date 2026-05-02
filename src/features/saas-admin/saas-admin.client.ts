import { API_BASE_URL } from "../../shared/config/api";
import { fetchWithAuth } from "../auth/auth.client";
import { SaasAdminTenantListResponse, UpdateTenantBillingPayload } from "./saas-admin.types";

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

export async function getSaasAdminTenants() {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/saas-admin/tenants`);
  return readJson<SaasAdminTenantListResponse>(response);
}

export async function updateSaasAdminTenantBilling(tenantId: number, payload: UpdateTenantBillingPayload) {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/saas-admin/tenants/${tenantId}/billing`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return readJson<{
    tenant: { id: number; name: string; slug: string; status: string };
    billing: {
      status: string;
      paidUntil: string | null;
      graceUntil: string | null;
      blockedReason: string | null;
    };
  }>(response);
}
