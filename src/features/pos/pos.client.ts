import { fetchWithAuth } from "../auth/auth.client";
import { PosDashboard, PosLookupResponse, PosPaymentsResponse, PosSalesResponse } from "./pos.types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://saasproback.onrender.com";

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

export async function lookupPosProduct(params: { barcode?: string; sku?: string }) {
  const searchParams = new URLSearchParams();
  if (params.barcode) searchParams.set("barcode", params.barcode);
  if (params.sku) searchParams.set("sku", params.sku);

  const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/pos/products/lookup?${searchParams.toString()}`);
  return readJson<PosLookupResponse>(response);
}

export async function lookupPosProductByBarcodeOrSku(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Ingresa un barcode o SKU para buscar");
  }

  try {
    return await lookupPosProduct({ barcode: trimmed });
  } catch {
    return lookupPosProduct({ sku: trimmed });
  }
}

export async function createPosSale(payload: {
  externalId?: string;
  notes?: string;
  items: Array<{
    productId?: number | null;
    isManual?: boolean;
    name: string;
    unitPrice: number;
    quantity: number;
    barcode?: string | null;
    sku?: string | null;
    imageUrl?: string | null;
  }>;
}) {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/pos/sales`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  return readJson<{ sale: PosSalesResponse["items"][number] }>(response);
}

export async function listPosSales(limit = 10) {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/pos/sales?limit=${limit}`);
  return readJson<PosSalesResponse>(response);
}

export async function createPosPayment(payload: {
  externalId?: string;
  amount: number;
  description?: string;
}) {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/pos/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  return readJson<{ payment: PosPaymentsResponse["items"][number] }>(response);
}

export async function listPosPayments(limit = 10) {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/pos/payments?limit=${limit}`);
  return readJson<PosPaymentsResponse>(response);
}

export async function getPosDashboard(params?: { movementLimit?: number; rankingLimit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.movementLimit) searchParams.set("movementLimit", String(params.movementLimit));
  if (params?.rankingLimit) searchParams.set("rankingLimit", String(params.rankingLimit));
  const query = searchParams.toString();
  const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/pos/dashboard${query ? `?${query}` : ""}`);
  return readJson<PosDashboard>(response);
}
