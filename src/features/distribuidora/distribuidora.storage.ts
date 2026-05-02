import {
  DistribuidoraClient,
  DistribuidoraOrder,
  DistribuidoraProduct
} from "./distribuidora.types";

const CLIENTS_KEY = "saaspro_distribuidora_clients_v1";
const PRODUCTS_KEY = "saaspro_distribuidora_products_v1";
const ORDERS_KEY = "saaspro_distribuidora_orders_v1";

const defaultClients: DistribuidoraClient[] = [
  { id: "cl-juan", name: "Juan Kiosco", address: "18 de Julio 1234", zone: "Centro" },
  { id: "cl-maria", name: "Maria Almacen", address: "Rivera 450", zone: "Cordon" },
  { id: "cl-pedro", name: "Pedro Market", address: "Colonia 980", zone: "Tres Cruces" },
  { id: "cl-cristina", name: "Cristina Autoservicio", address: "Garibaldi 1220", zone: "Parque Batlle" }
];

const defaultProducts: DistribuidoraProduct[] = [
  { id: "pr-urreta", name: "Urreta", price: 240, unitLabel: "botella 2L" },
  { id: "pr-alfajor", name: "Alfajor", price: 65, unitLabel: "unidad 70 g" },
  { id: "pr-main", name: "Main", price: 190, unitLabel: "pack 500 g" },
  { id: "pr-agua", name: "Agua", price: 90, unitLabel: "botella 2L" },
  { id: "pr-mayonesa", name: "Mayonesa", price: 175, unitLabel: "pote 500 g" }
];

function readJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
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
  localStorage.setItem(key, JSON.stringify(value));
}

export function ensureDistribuidoraSeedData() {
  const clients = readJson<DistribuidoraClient[]>(CLIENTS_KEY, []);
  const products = readJson<DistribuidoraProduct[]>(PRODUCTS_KEY, []);
  const hasCurrentProductSeed = defaultProducts.every((product) =>
    products.some((storedProduct) => storedProduct.id === product.id)
  );

  if (clients.length === 0) {
    writeJson(CLIENTS_KEY, defaultClients);
  }

  if (products.length === 0 || !hasCurrentProductSeed) {
    writeJson(PRODUCTS_KEY, defaultProducts);
  }
}

export function getDistribuidoraClients() {
  ensureDistribuidoraSeedData();
  return readJson<DistribuidoraClient[]>(CLIENTS_KEY, defaultClients);
}

export function getDistribuidoraProducts() {
  ensureDistribuidoraSeedData();
  return readJson<DistribuidoraProduct[]>(PRODUCTS_KEY, defaultProducts);
}

export function getDistribuidoraOrders() {
  return readJson<DistribuidoraOrder[]>(ORDERS_KEY, []).sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

export function saveDistribuidoraOrder(order: DistribuidoraOrder) {
  const currentOrders = getDistribuidoraOrders();
  writeJson(ORDERS_KEY, [order, ...currentOrders]);
}
