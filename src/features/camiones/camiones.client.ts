import { fetchWithAuth } from "../auth/auth.client";
import { CamionesClientsResponse, CamionesTripsResponse } from "./camiones.types";
import { API_BASE_URL } from "../../shared/config/api";

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

export async function listCamionesClients(params?: { limit?: number; search?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.search) searchParams.set("search", params.search);
  const query = searchParams.toString();
  const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/camiones/clients${query ? `?${query}` : ""}`);
  return readJson<CamionesClientsResponse>(response);
}

export async function createCamionesClient(payload: {
  name: string;
  phone?: string;
  notes?: string;
}) {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/camiones/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  return readJson<{ item: CamionesClientsResponse["items"][number] }>(response);
}

export async function listCamionesTrips(params?: {
  limit?: number;
  clientId?: number;
  status?: "pending" | "paid" | "cancelled";
}) {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.clientId) searchParams.set("clientId", String(params.clientId));
  if (params?.status) searchParams.set("status", params.status);
  const query = searchParams.toString();
  const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/camiones/trips${query ? `?${query}` : ""}`);
  return readJson<CamionesTripsResponse>(response);
}

export async function createCamionesTrip(payload: {
  clientId: number;
  tripDate: string;
  place: string;
  kilometers: number;
  notes?: string;
}) {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/camiones/trips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  return readJson<{ trip: CamionesTripsResponse["items"][number] }>(response);
}

export async function markCamionesTripPaid(tripId: number) {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/camiones/trips/${tripId}/pay`, {
    method: "PATCH"
  });

  return readJson<{ trip: CamionesTripsResponse["items"][number] }>(response);
}
