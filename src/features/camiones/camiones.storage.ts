import { CamionesClient, CamionesTrip } from "./camiones.types";

const CLIENTS_KEY = "saaspro_camiones_clients_v1";
const PLACES_KEY = "saaspro_camiones_places_v1";
const TRIPS_KEY = "saaspro_camiones_trips_v1";

const seedClients: CamionesClient[] = [
  { id: "truck-client-1", name: "Juan", createdAt: "2026-05-01T09:00:00.000Z" },
  { id: "truck-client-2", name: "Maria", createdAt: "2026-05-01T09:05:00.000Z" },
  { id: "truck-client-3", name: "Taller Norte", createdAt: "2026-05-01T09:10:00.000Z" }
];

const seedPlaces = [
  "Piedra Sola",
  "Solimar",
  "Lavalleja",
  "Montevideo",
  "Pando",
  "Las Piedras",
  "Canelones",
  "Sauce",
  "Florida",
  "San Ramon"
];

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function ensureCamionesSeedData() {
  if (typeof window === "undefined") {
    return;
  }

  if (!window.localStorage.getItem(CLIENTS_KEY)) {
    writeJson(CLIENTS_KEY, seedClients);
  }

  if (!window.localStorage.getItem(PLACES_KEY)) {
    writeJson(PLACES_KEY, seedPlaces);
  }

  if (!window.localStorage.getItem(TRIPS_KEY)) {
    writeJson(TRIPS_KEY, []);
  }
}

export function getCamionesClients() {
  const clients = readJson<CamionesClient[]>(CLIENTS_KEY, []);
  return [...clients].sort((a, b) => a.name.localeCompare(b.name));
}

export function createCamionesClient(name: string) {
  const normalizedName = name.trim();
  const clients = getCamionesClients();
  const existing = clients.find((client) => client.name.toLowerCase() === normalizedName.toLowerCase());

  if (existing) {
    return existing;
  }

  const newClient: CamionesClient = {
    id: `truck-client-${Date.now()}`,
    name: normalizedName,
    createdAt: new Date().toISOString()
  };

  const nextClients = [...clients, newClient].sort((a, b) => a.name.localeCompare(b.name));
  writeJson(CLIENTS_KEY, nextClients);
  return newClient;
}

export function getCamionesPlaces() {
  const places = readJson<string[]>(PLACES_KEY, seedPlaces);
  return [...places].sort((a, b) => a.localeCompare(b));
}

export function createCamionesPlace(name: string) {
  const normalizedName = name.trim();
  const places = getCamionesPlaces();
  const existing = places.find((place) => place.toLowerCase() === normalizedName.toLowerCase());

  if (existing) {
    return existing;
  }

  const nextPlaces = [...places, normalizedName].sort((a, b) => a.localeCompare(b));
  writeJson(PLACES_KEY, nextPlaces);
  return normalizedName;
}

export function getCamionesTrips() {
  const trips = readJson<CamionesTrip[]>(TRIPS_KEY, []);
  return [...trips].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function saveCamionesTrip(trip: CamionesTrip) {
  const trips = getCamionesTrips();
  writeJson(TRIPS_KEY, [trip, ...trips]);
}

export function markCamionesTripPaid(tripId: string) {
  const trips = getCamionesTrips();
  const nextTrips = trips.map((trip) =>
    trip.id === tripId
      ? {
          ...trip,
          status: "paid" as const,
          paidAt: new Date().toISOString()
        }
      : trip
  );

  writeJson(TRIPS_KEY, nextTrips);
}
