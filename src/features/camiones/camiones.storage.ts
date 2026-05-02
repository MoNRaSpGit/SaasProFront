const PLACES_KEY = "saaspro_camiones_places_v1";

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

function ensureCamionesPlaceSeedData() {
  if (typeof window === "undefined") {
    return;
  }

  if (!window.localStorage.getItem(PLACES_KEY)) {
    writeJson(PLACES_KEY, seedPlaces);
  }
}

export function getCamionesPlaces() {
  ensureCamionesPlaceSeedData();
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
