import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { ModelUserMenu } from "../../shared/components/ModelUserMenu";
import {
  archiveCamionesClient,
  archiveCamionesPlace,
  createCamionesClient as createCamionesClientRequest,
  createCamionesPlace as createCamionesPlaceRequest,
  createCamionesTrip,
  deleteCamionesTrip as deleteCamionesTripRequest,
  listCamionesClients,
  listCamionesPlaces,
  listCamionesTrips,
  updateCamionesClient,
  updateCamionesPlace,
  updateCamionesTrip
} from "./camiones.client";
import { CamionesClient, CamionesPlace, CamionesTrip } from "./camiones.types";

type CamionesTab = "cliente" | "viaje" | "registro" | "localidad";
type ClientModalState = { mode: "create" | "edit"; clientId: number | null } | null;
type PlaceModalState = { mode: "create" | "edit"; placeId: number | null } | null;
type TripModalState = { tripId: number } | null;
type TripDeleteConfirmState = { tripId: number; clientName: string; placeName: string } | null;
type TripFilter = "all" | "pending" | "paid";
type RouteField = "from" | "to";
const ROUTE_FROM_PREFIX = "route-from::";
const RATE_PER_KM_PREFIX = "rate-per-km::";
const TOTAL_AMOUNT_PREFIX = "trip-total::";
const COLLECTED_AMOUNT_PREFIX = "collected-amount::";
const TRIP_NOTES_SEPARATOR = "||";

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value: string) {
  if (!value) {
    return "Sin fecha";
  }

  const normalizedValue = value.includes("T") ? value.slice(0, 10) : value;
  const [year, month, day] = normalizedValue.split("-");
  return `${day}/${month}/${year}`;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function normalizeEntityName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function formatMoneyLabel(value: number) {
  return `$${value.toFixed(2)}`;
}

function parsePositiveNumber(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Number(parsed.toFixed(2));
}

function readTripMeta(notes: string | null) {
  const meta = {
    fromPlaceName: "",
    ratePerKilometer: null as number | null,
    totalAmount: null as number | null,
    collectedAmount: null as number | null
  };

  if (!notes) {
    return meta;
  }

  const tokens = notes.split(TRIP_NOTES_SEPARATOR).map((token) => token.trim()).filter(Boolean);
  const sourceTokens = tokens.length > 0 ? tokens : [notes];
  let detectedStructuredToken = false;

  for (const token of sourceTokens) {
    if (token.startsWith(ROUTE_FROM_PREFIX)) {
      detectedStructuredToken = true;
      meta.fromPlaceName = token.slice(ROUTE_FROM_PREFIX.length).trim();
      continue;
    }

    if (token.startsWith(RATE_PER_KM_PREFIX)) {
      detectedStructuredToken = true;
      meta.ratePerKilometer = parsePositiveNumber(token.slice(RATE_PER_KM_PREFIX.length).trim());
      continue;
    }

    if (token.startsWith(TOTAL_AMOUNT_PREFIX)) {
      detectedStructuredToken = true;
      meta.totalAmount = parsePositiveNumber(token.slice(TOTAL_AMOUNT_PREFIX.length).trim());
      continue;
    }

    if (token.startsWith(COLLECTED_AMOUNT_PREFIX)) {
      detectedStructuredToken = true;
      meta.collectedAmount = parsePositiveNumber(token.slice(COLLECTED_AMOUNT_PREFIX.length).trim());
    }
  }

  if (!detectedStructuredToken && notes.trim()) {
    meta.fromPlaceName = notes.trim();
  }

  return meta;
}

function buildTripNotes(fromPlaceName: string, ratePerKilometer: number, tripKilometers: number, collectedAmount?: number | null) {
  const normalizedRate = Number(ratePerKilometer.toFixed(2));
  const totalAmount = Number((normalizedRate * tripKilometers).toFixed(2));
  const tokens = [
    `${ROUTE_FROM_PREFIX}${fromPlaceName.trim()}`,
    `${RATE_PER_KM_PREFIX}${normalizedRate.toFixed(2)}`,
    `${TOTAL_AMOUNT_PREFIX}${totalAmount.toFixed(2)}`
  ];

  if (typeof collectedAmount === "number" && Number.isFinite(collectedAmount) && collectedAmount > 0) {
    tokens.push(`${COLLECTED_AMOUNT_PREFIX}${Number(collectedAmount.toFixed(2)).toFixed(2)}`);
  }

  return tokens.join(TRIP_NOTES_SEPARATOR);
}

function getTripRouteParts(trip: CamionesTrip) {
  const { fromPlaceName } = readTripMeta(trip.notes);
  return {
    from: fromPlaceName || "Sin origen",
    to: trip.place || "Sin destino"
  };
}

function getTripPricing(trip: CamionesTrip) {
  const { ratePerKilometer, totalAmount } = readTripMeta(trip.notes);
  return {
    ratePerKilometer,
    totalAmount: totalAmount ?? (ratePerKilometer ? Number((trip.kilometers * ratePerKilometer).toFixed(2)) : null)
  };
}

function getTripFinancials(trip: CamionesTrip) {
  const pricing = getTripPricing(trip);
  const meta = readTripMeta(trip.notes);
  const totalAmount = pricing.totalAmount;
  const collectedAmount =
    trip.status === "paid"
      ? totalAmount
      : trip.collectedAmount ?? meta.collectedAmount ?? 0;
  const pendingAmount =
    totalAmount === null ? null : Number(Math.max(totalAmount - (collectedAmount ?? 0), 0).toFixed(2));

  return {
    ...pricing,
    collectedAmount: collectedAmount === null ? 0 : Number(collectedAmount.toFixed(2)),
    pendingAmount
  };
}

export function CamionesHomePage() {
  const CLIENTS_PAGE_SIZE = 3;
  const GROUP_TRIPS_PAGE_SIZE = 3;
  const showLegacyRouteInputs = false;
  const clientInputRef = useRef<HTMLInputElement | null>(null);
  const placeInputRef = useRef<HTMLInputElement | null>(null);
  const destinationInputRef = useRef<HTMLInputElement | null>(null);
  const kilometersInputRef = useRef<HTMLInputElement | null>(null);
  const tempIdRef = useRef(-1);
  const [tab, setTab] = useState<CamionesTab>("cliente");
  const [clients, setClients] = useState<CamionesClient[]>([]);
  const [places, setPlaces] = useState<CamionesPlace[]>([]);
  const [trips, setTrips] = useState<CamionesTrip[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [clientListExpanded, setClientListExpanded] = useState(false);
  const [visibleClientCount, setVisibleClientCount] = useState(CLIENTS_PAGE_SIZE);
  const [selectedClient, setSelectedClient] = useState<CamionesClient | null>(null);
  const [recentClientId, setRecentClientId] = useState<number | null>(null);
  const [tripDate, setTripDate] = useState(getTodayDate());
  const [fromPlaceSearch, setFromPlaceSearch] = useState("");
  const [selectedFromPlace, setSelectedFromPlace] = useState<CamionesPlace | null>(null);
  const [toPlaceSearch, setToPlaceSearch] = useState("");
  const [selectedToPlace, setSelectedToPlace] = useState<CamionesPlace | null>(null);
  const [kilometers, setKilometers] = useState("");
  const [ratePerKilometer, setRatePerKilometer] = useState("");
  const [tripFilter, setTripFilter] = useState<TripFilter>("all");
  const [clientsLoading, setClientsLoading] = useState(true);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [tripsLoaded, setTripsLoaded] = useState(false);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesLoaded, setPlacesLoaded] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [savingPlace, setSavingPlace] = useState(false);
  const [savingTripEdit, setSavingTripEdit] = useState(false);
  const [deletingTripId, setDeletingTripId] = useState<number | null>(null);
  const [deletingClient, setDeletingClient] = useState(false);
  const [archivingPlaceId, setArchivingPlaceId] = useState<number | null>(null);
  const [clientModalState, setClientModalState] = useState<ClientModalState>(null);
  const [clientDraftName, setClientDraftName] = useState("");
  const [clientDraftPhone, setClientDraftPhone] = useState("");
  const [clientDeleteConfirmOpen, setClientDeleteConfirmOpen] = useState(false);
  const [placeModalState, setPlaceModalState] = useState<PlaceModalState>(null);
  const [placeDraftName, setPlaceDraftName] = useState("");
  const [tripModalState, setTripModalState] = useState<TripModalState>(null);
  const [tripDraftDate, setTripDraftDate] = useState("");
  const [tripDraftFromPlace, setTripDraftFromPlace] = useState("");
  const [tripDraftPlace, setTripDraftPlace] = useState("");
  const [tripDraftKilometers, setTripDraftKilometers] = useState("");
  const [tripDraftRatePerKilometer, setTripDraftRatePerKilometer] = useState("");
  const [tripDraftStatus, setTripDraftStatus] = useState<"confirmed" | "pending" | "paid">("confirmed");
  const [tripDraftCollectedAmount, setTripDraftCollectedAmount] = useState("");
  const [tripDeleteConfirmState, setTripDeleteConfirmState] = useState<TripDeleteConfirmState>(null);
  const [visibleTripsByGroup, setVisibleTripsByGroup] = useState<Record<string, number>>({});
  const [expandedTripGroups, setExpandedTripGroups] = useState<Record<string, boolean>>({});
  const routePickerOpenField: RouteField | null = null;

  function getTempId() {
    const nextId = tempIdRef.current;
    tempIdRef.current -= 1;
    return nextId;
  }

  function buildOptimisticClient(id: number, name: string, phone: string): CamionesClient {
    const timestamp = new Date().toISOString();
    const source = selectedClient ?? clients[0];
    return {
      id,
      tenantId: source?.tenantId ?? 0,
      branchId: source?.branchId ?? null,
      name,
      phone: phone || null,
      notes: null,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp
    };
  }

  function buildOptimisticPlace(id: number, name: string): CamionesPlace {
    const timestamp = new Date().toISOString();
    const source = places[0];
    return {
      id,
      tenantId: source?.tenantId ?? 0,
      branchId: source?.branchId ?? null,
      name,
      notes: null,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp
    };
  }

  function buildOptimisticTrip(
    client: CamionesClient,
    fromPlaceName: string,
    toPlaceName: string,
    date: string,
    tripKilometers: number,
    tripRatePerKilometer: number
  ): CamionesTrip {
    const timestamp = new Date().toISOString();
    const source = trips[0];
    return {
      id: getTempId(),
      tenantId: client.tenantId || source?.tenantId || 0,
      branchId: client.branchId ?? source?.branchId ?? null,
      userId: source?.userId ?? 0,
      clientId: client.id,
      placeId: null,
      clientName: client.name,
      tripDate: date,
      place: toPlaceName,
      kilometers: Number(tripKilometers.toFixed(2)),
      status: "confirmed",
      collectedAmount: null,
      notes: buildTripNotes(fromPlaceName, tripRatePerKilometer, tripKilometers),
      updatedAt: timestamp,
      createdAt: timestamp,
      paidAt: null
    };
  }

  const refreshTrips = useCallback(async () => {
    setTripsLoading(true);
    try {
      const payload = await listCamionesTrips({ limit: 100 });
      setTrips(payload.items);
      setTripsLoaded(true);
    } finally {
      setTripsLoading(false);
    }
  }, []);

  const refreshPlaces = useCallback(async () => {
    setPlacesLoading(true);
    try {
      const payload = await listCamionesPlaces({ limit: 100 });
      setPlaces(payload.items);
      setPlacesLoaded(true);
    } finally {
      setPlacesLoading(false);
    }
  }, []);

  const ensurePlacesLoaded = useCallback(async () => {
    if (placesLoaded || placesLoading) {
      return;
    }

    try {
      await refreshPlaces();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar los lugares");
    }
  }, [placesLoaded, placesLoading, refreshPlaces]);

  const ensureTripsLoaded = useCallback(async () => {
    if (tripsLoaded || tripsLoading) {
      return;
    }

    try {
      await refreshTrips();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el registro");
    }
  }, [refreshTrips, tripsLoaded, tripsLoading]);

  const loadInitialClients = useCallback(async () => {
    setClientsLoading(true);

    try {
      const clientsPayload = await listCamionesClients({ limit: 100 });
      setClients(clientsPayload.items);
      void ensureTripsLoaded();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar camiones");
    } finally {
      setClientsLoading(false);
    }
  }, [ensureTripsLoaded]);

  async function refreshClients() {
    const payload = await listCamionesClients({ limit: 100 });
    setClients(payload.items);
  }

  useEffect(() => {
    void loadInitialClients();
  }, [loadInitialClients]);

  useEffect(() => {
    if (tab === "cliente") {
      clientInputRef.current?.focus();
    }

    if (tab === "viaje") {
      placeInputRef.current?.focus();
    }

    if (tab === "registro") {
      void ensureTripsLoaded();
    }

    if (tab === "localidad") {
      void ensurePlacesLoaded();
    }

  }, [ensurePlacesLoaded, ensureTripsLoaded, tab]);

  const filteredClients = useMemo(() => {
    const query = normalizeText(clientSearch);
    const baseClients = !query
      ? clients
      : clients.filter((client) => {
      const phone = client.phone?.toLowerCase() || "";
      return client.name.toLowerCase().includes(query) || phone.includes(query);
    });

    if (!recentClientId) {
      return baseClients;
    }

    const recentClient = baseClients.find((client) => client.id === recentClientId);
    if (!recentClient) {
      return baseClients;
    }

    return [recentClient, ...baseClients.filter((client) => client.id !== recentClientId)];
  }, [clientSearch, clients, recentClientId]);

  const visibleClients = useMemo(
    () => filteredClients.slice(0, visibleClientCount),
    [filteredClients, visibleClientCount]
  );

  useEffect(() => {
    setVisibleClientCount(CLIENTS_PAGE_SIZE);
  }, [clientSearch, clients]);

  const filteredPlaces = useMemo(() => {
    return places;
  }, [places]);

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      if (tripFilter === "all") {
        return trip.status === "confirmed";
      }

      if (tripFilter === "pending") {
        return trip.status === "pending";
      }

      return trip.status === "paid";
    });
  }, [tripFilter, trips]);

  const groupedTrips = useMemo(() => {
    const groups = new Map<
      string,
      {
        clientId: number;
        clientName: string;
        items: CamionesTrip[];
      }
    >();

    for (const trip of filteredTrips) {
      const key = String(trip.clientId);
      const existingGroup = groups.get(key);

      if (existingGroup) {
        existingGroup.items.push(trip);
        continue;
      }

      groups.set(key, {
        clientId: trip.clientId,
        clientName: trip.clientName,
        items: [trip]
      });
    }

    return Array.from(groups.values()).map((group) => {
      const orderedItems = [...group.items].sort((left, right) => {
        const leftTime = new Date(left.tripDate).getTime();
        const rightTime = new Date(right.tripDate).getTime();

        if (leftTime !== rightTime) {
          return rightTime - leftTime;
        }

        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      });

      const latestTripDate = orderedItems[0]?.tripDate.includes("T") ? orderedItems[0].tripDate.slice(0, 10) : orderedItems[0]?.tripDate ?? "";
      const oldestTripDate =
        orderedItems[orderedItems.length - 1]?.tripDate.includes("T")
          ? orderedItems[orderedItems.length - 1].tripDate.slice(0, 10)
          : orderedItems[orderedItems.length - 1]?.tripDate ?? "";
      const groupKey = String(group.clientId);
      return {
        ...group,
        groupKey,
        items: orderedItems,
        latestTripDate,
        oldestTripDate,
        totalKilometers: orderedItems.reduce((total, trip) => total + trip.kilometers, 0),
        pendingKilometers: orderedItems.reduce((total, trip) => (trip.status === "paid" ? total : total + trip.kilometers), 0),
        pendingAmount: orderedItems.reduce((total, trip) => {
          const financials = getTripFinancials(trip);
          if (financials.pendingAmount === null || financials.pendingAmount <= 0) {
            return total;
          }

          return total + financials.pendingAmount;
        }, 0),
        hasPricing: orderedItems.some((trip) => getTripFinancials(trip).totalAmount !== null)
      };
    });
  }, [filteredTrips]);

  const visibleGroupedTrips = useMemo(() => {
    return groupedTrips;
  }, [groupedTrips]);

  function clearTripForm() {
    setTripDate(getTodayDate());
    setFromPlaceSearch("");
    setSelectedFromPlace(null);
    setToPlaceSearch("");
    setSelectedToPlace(null);
    setKilometers("");
    setRatePerKilometer("");
  }

  function selectClient(client: CamionesClient) {
    setSelectedClient(client);
    setClientSearch("");
    setClientListExpanded(true);
    clearTripForm();
    setTab("viaje");
  }

  function selectPlace(place: CamionesPlace) {
    void place;
  }

  function toggleRoutePicker(field: RouteField) {
    void field;
  }

  function openClientCreateModal() {
    setClientDraftName(clientSearch.trim());
    setClientDraftPhone("");
    setClientModalState({ mode: "create", clientId: null });
  }

  function closeClientModal() {
    if (savingClient || deletingClient) {
      return;
    }

    setClientModalState(null);
    setClientDraftName("");
    setClientDraftPhone("");
    setClientDeleteConfirmOpen(false);
  }

  function closePlaceModal() {
    if (savingPlace) {
      return;
    }

    setPlaceModalState(null);
    setPlaceDraftName("");
  }

  function openTripEditModal(trip: CamionesTrip) {
    const tripMeta = readTripMeta(trip.notes);
    const financials = getTripFinancials(trip);
    setTripDraftDate(trip.tripDate.includes("T") ? trip.tripDate.slice(0, 10) : trip.tripDate);
    setTripDraftFromPlace(tripMeta.fromPlaceName);
    setTripDraftPlace(trip.place);
    setTripDraftKilometers(String(trip.kilometers));
    setTripDraftRatePerKilometer(financials.ratePerKilometer ? String(financials.ratePerKilometer) : "");
    setTripDraftStatus(trip.status === "cancelled" ? "confirmed" : trip.status);
    setTripDraftCollectedAmount(
      trip.status === "pending" && financials.collectedAmount > 0 ? String(financials.collectedAmount) : ""
    );
    setTripModalState({ tripId: trip.id });
  }

  function closeTripModal() {
    if (savingTripEdit || deletingTripId !== null) {
      return;
    }

    setTripModalState(null);
    setTripDraftDate("");
    setTripDraftFromPlace("");
    setTripDraftPlace("");
    setTripDraftKilometers("");
    setTripDraftRatePerKilometer("");
    setTripDraftStatus("confirmed");
    setTripDraftCollectedAmount("");
  }

  function openTripDeleteConfirm(trip: CamionesTrip) {
    if (trip.status !== "paid") {
      return;
    }

    setTripDeleteConfirmState({
      tripId: trip.id,
      clientName: trip.clientName,
      placeName: trip.place
    });
  }

  function closeTripDeleteConfirm() {
    if (deletingTripId !== null) {
      return;
    }

    setTripDeleteConfirmState(null);
  }

  async function handleSaveClient() {
    const name = clientDraftName.trim();
    const phone = clientDraftPhone.trim();
    if (!name) {
      toast.error("Escribe el nombre del cliente");
      return;
    }

    const mode = clientModalState?.mode;
    const editingClientId = clientModalState?.clientId ?? null;
    const previousClients = clients;
    const previousTrips = trips;
    const previousSelectedClient = selectedClient;
    const previousClientSearch = clientSearch;
    const previousTab = tab;
    const currentClient =
      mode === "edit" && editingClientId ? previousClients.find((client) => client.id === editingClientId) ?? null : null;
    const nextClient =
      mode === "edit" && currentClient
        ? { ...currentClient, name, phone: phone || null, updatedAt: new Date().toISOString() }
        : buildOptimisticClient(getTempId(), name, phone);

    setSavingClient(true);
    setClients((current) =>
      mode === "edit" && editingClientId ? current.map((client) => (client.id === editingClientId ? nextClient : client)) : [nextClient, ...current]
    );
    if (mode === "edit") {
      setSelectedClient(nextClient);
    } else {
      setSelectedClient(null);
      setRecentClientId(nextClient.id);
    }
    setClientSearch("");
    setClientListExpanded(true);
    setClientModalState(null);
    setClientDraftName("");
    setClientDraftPhone("");
    setClientDeleteConfirmOpen(false);
    setSavingClient(false);
    toast.success(mode === "edit" ? "Cliente actualizado" : `Cliente agregado: ${nextClient.name}`);

    if (previousTab === "cliente" && mode !== "edit") {
      clearTripForm();
      clientInputRef.current?.focus();
    }

    try {
      const payload =
        mode === "edit" && editingClientId
          ? await updateCamionesClient(editingClientId, {
              name,
              phone: phone || undefined
            })
          : await createCamionesClientRequest({
              name,
              phone: phone || undefined
            });
      setClients((current) => {
        const deduped = current.filter((client) => {
          if (client.id === nextClient.id || client.id === payload.item.id) {
            return false;
          }

          return normalizeEntityName(client.name) !== normalizeEntityName(payload.item.name);
        });

        return [payload.item, ...deduped].sort((left, right) => left.name.localeCompare(right.name, "es"));
      });
      setSelectedClient((current) => {
        if (mode === "edit" && current?.id === editingClientId) {
          return payload.item;
        }

        return current?.id === nextClient.id ? payload.item : current;
      });
      setRecentClientId((current) => (current === nextClient.id || current === payload.item.id ? payload.item.id : current));
      setClientSearch((current) => (normalizeText(current) === normalizeText(nextClient.name) ? payload.item.name : current));
      void refreshClients();
      void refreshTrips();
    } catch (error) {
      setClients(previousClients);
      setTrips(previousTrips);
      setSelectedClient(previousSelectedClient);
      setRecentClientId(null);
      setClientSearch(previousClientSearch);
      setTab(previousTab);
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el cliente");
    }
  }

  function handleDeleteClient() {
    if (clientModalState?.mode !== "edit") {
      return;
    }

    setClientDeleteConfirmOpen(true);
  }

  function closeClientDeleteConfirm() {
    if (deletingClient) {
      return;
    }

    setClientDeleteConfirmOpen(false);
  }

  async function confirmDeleteClient() {
    if (clientModalState?.mode !== "edit" || !clientModalState.clientId) {
      return;
    }

    const clientId = clientModalState.clientId;
    const previousClients = clients;
    const previousTrips = trips;
    const previousSelectedClient = selectedClient;
    const previousClientSearch = clientSearch;

    setDeletingClient(true);
    setClients((current) => current.filter((client) => client.id !== clientId));
    setTrips((current) => current.filter((trip) => trip.clientId !== clientId));

    if (selectedClient?.id === clientId) {
      setSelectedClient(null);
      setClientSearch("");
      setClientListExpanded(true);
    }

    if (recentClientId === clientId) {
      setRecentClientId(null);
    }

    setClientDeleteConfirmOpen(false);
    setClientModalState(null);
    setClientDraftName("");
    setClientDraftPhone("");
    setDeletingClient(false);
    toast.success("Cliente eliminado");

    try {
      await archiveCamionesClient(clientId);
      void refreshClients();
      void refreshTrips();
    } catch (error) {
      setClients(previousClients);
      setTrips(previousTrips);
      setSelectedClient(previousSelectedClient);
      setClientSearch(previousClientSearch);
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el cliente");
    }
  }

  async function handleSavePlace() {
    const name = placeDraftName.trim();
    if (!name) {
      toast.error("Escribe el lugar");
      return;
    }

    const mode = placeModalState?.mode;
    const editingPlaceId = placeModalState?.placeId ?? null;
    const previousPlaces = places;
    const previousSelectedFromPlace = selectedFromPlace;
    const previousFromPlaceSearch = fromPlaceSearch;
    const previousSelectedToPlace = selectedToPlace;
    const previousToPlaceSearch = toPlaceSearch;
    const currentPlace =
      mode === "edit" && editingPlaceId ? previousPlaces.find((place) => place.id === editingPlaceId) ?? null : null;
    const nextPlace =
      mode === "edit" && currentPlace ? { ...currentPlace, name, updatedAt: new Date().toISOString() } : buildOptimisticPlace(getTempId(), name);

    setSavingPlace(true);
    setPlaces((current) =>
      mode === "edit" && editingPlaceId ? current.map((place) => (place.id === editingPlaceId ? nextPlace : place)) : [nextPlace, ...current]
    );
    if (mode === "edit" && editingPlaceId) {
      if (selectedFromPlace?.id === editingPlaceId) {
        setSelectedFromPlace(nextPlace);
        setFromPlaceSearch(nextPlace.name);
      }

      if (selectedToPlace?.id === editingPlaceId) {
        setSelectedToPlace(nextPlace);
        setToPlaceSearch(nextPlace.name);
      }
    }
    setPlaceModalState(null);
    setPlaceDraftName("");
    setSavingPlace(false);
    toast.success(mode === "edit" ? "Lugar actualizado" : `Lugar agregado: ${nextPlace.name}`);

    try {
      const payload =
        mode === "edit" && editingPlaceId
          ? await updateCamionesPlace(editingPlaceId, { name })
          : await createCamionesPlaceRequest({ name });
      setPlaces((current) => current.map((place) => (place.id === nextPlace.id ? payload.item : place)));
      if (mode === "edit" && editingPlaceId) {
        setSelectedFromPlace((current) => (current?.id === nextPlace.id ? payload.item : current));
        setSelectedToPlace((current) => (current?.id === nextPlace.id ? payload.item : current));
        setFromPlaceSearch((current) => (normalizeText(current) === normalizeText(nextPlace.name) ? payload.item.name : current));
        setToPlaceSearch((current) => (normalizeText(current) === normalizeText(nextPlace.name) ? payload.item.name : current));
      }
      void refreshPlaces();
    } catch (error) {
      setPlaces(previousPlaces);
      setSelectedFromPlace(previousSelectedFromPlace);
      setFromPlaceSearch(previousFromPlaceSearch);
      setSelectedToPlace(previousSelectedToPlace);
      setToPlaceSearch(previousToPlaceSearch);
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el lugar");
    }
  }

  async function handleCreatePlaceInline() {
    const name = placeDraftName.trim();
    if (!name) {
      toast.error("Escribe el lugar");
      return;
    }

    const previousPlaces = places;
    const nextPlace = buildOptimisticPlace(getTempId(), name);

    setSavingPlace(true);
    setPlaces((current) => [nextPlace, ...current]);
    setPlaceDraftName("");
    toast.success(`Lugar agregado: ${nextPlace.name}`);

    try {
      const payload = await createCamionesPlaceRequest({ name });
      setPlaces((current) => current.map((place) => (place.id === nextPlace.id ? payload.item : place)));
      setSavingPlace(false);
      setTab("viaje");
      void refreshPlaces();
    } catch (error) {
      setPlaces(previousPlaces);
      setSavingPlace(false);
      setPlaceDraftName(name);
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el lugar");
    }
  }

  async function handleArchivePlace(place: CamionesPlace) {
    const previousPlaces = places;
    const previousSelectedFromPlace = selectedFromPlace;
    const previousFromPlaceSearch = fromPlaceSearch;
    const previousSelectedToPlace = selectedToPlace;
    const previousToPlaceSearch = toPlaceSearch;
    setArchivingPlaceId(place.id);
    setPlaces((current) => current.filter((item) => item.id !== place.id));

    if (selectedFromPlace?.id === place.id) {
      setSelectedFromPlace(null);
      setFromPlaceSearch("");
    }

    if (selectedToPlace?.id === place.id) {
      setSelectedToPlace(null);
      setToPlaceSearch("");
    }

    setArchivingPlaceId(null);
    toast.success(`Lugar archivado: ${place.name}`);

    try {
      await archiveCamionesPlace(place.id);
      void refreshPlaces();
    } catch (error) {
      setPlaces(previousPlaces);
      setSelectedFromPlace(previousSelectedFromPlace);
      setFromPlaceSearch(previousFromPlaceSearch);
      setSelectedToPlace(previousSelectedToPlace);
      setToPlaceSearch(previousToPlaceSearch);
      toast.error(error instanceof Error ? error.message : "No se pudo archivar el lugar");
    }
  }

  async function handleDeletePlaceFromModal() {
    if (placeModalState?.mode !== "edit" || !placeModalState.placeId) {
      return;
    }

    const confirmed = window.confirm(`Seguro desea eliminar el lugar "${placeDraftName.trim() || "sin nombre"}"?`);
    if (!confirmed) {
      return;
    }

    const place = places.find((item) => item.id === placeModalState.placeId);
    if (!place) {
      toast.error("Lugar no encontrado");
      return;
    }

    await handleArchivePlace(place);
    closePlaceModal();
  }

  async function goToTripStep() {
    const clientName = clientSearch.trim();
    if (!clientName) {
      toast.error("Falta el cliente");
      return;
    }

    const existingClient = clients.find((client) => normalizeText(client.name) === normalizeText(clientName));
    if (existingClient) {
      selectClient(existingClient);
      return;
    }

    openClientCreateModal();
  }

  async function handleSaveTrip() {
    const kmValue = Number(kilometers);
    const rateValue = Number(ratePerKilometer);
    const fromPlaceName = fromPlaceSearch.trim();
    const toPlaceName = toPlaceSearch.trim();

    if (!selectedClient) {
      toast.error("Falta el cliente");
      return;
    }

    if (!tripDate) {
      toast.error("Falta la fecha");
      return;
    }

    if (!fromPlaceName) {
      toast.error("Falta el origen");
      return;
    }

    if (!toPlaceName) {
      toast.error("Falta el destino");
      return;
    }

    if (!Number.isFinite(kmValue) || kmValue <= 0) {
      toast.error("Escribe kilometros validos");
      return;
    }

    if (!Number.isFinite(rateValue) || rateValue <= 0) {
      toast.error("Escribe un valor por kilometro valido");
      return;
    }

    const previousTrips = trips;
    const previousClientSearch = clientSearch;
    const previousSelectedClient = selectedClient;
    const previousTripDate = tripDate;
    const previousFromPlaceSearch = fromPlaceSearch;
    const previousSelectedFromPlace = selectedFromPlace;
    const previousToPlaceSearch = toPlaceSearch;
    const previousSelectedToPlace = selectedToPlace;
    const previousKilometers = kilometers;
    const previousRatePerKilometer = ratePerKilometer;
    const previousTab = tab;
    const optimisticTrip = buildOptimisticTrip(selectedClient, fromPlaceName, toPlaceName, tripDate, kmValue, rateValue);

    setSavingTrip(true);
    setTrips((current) => [optimisticTrip, ...current]);
    toast.success(`Viaje guardado para ${selectedClient.name}`);
    setFromPlaceSearch("");
    setSelectedFromPlace(null);
    setToPlaceSearch("");
    setSelectedToPlace(null);
    setKilometers("");
    setRatePerKilometer("");
    setTripFilter("all");
    setTab("registro");
    setSavingTrip(false);
    placeInputRef.current?.focus();

    try {
      const payload = await createCamionesTrip({
        clientId: selectedClient.id,
        placeName: toPlaceName,
        tripDate,
        kilometers: Number(kmValue.toFixed(2)),
        notes: buildTripNotes(fromPlaceName, rateValue, kmValue)
      });
      setTrips((current) => current.map((trip) => (trip.id === optimisticTrip.id ? payload.trip : trip)));
      void refreshTrips();
    } catch (error) {
      setTrips(previousTrips);
      setClientSearch(previousClientSearch);
      setSelectedClient(previousSelectedClient);
      setTripDate(previousTripDate);
      setFromPlaceSearch(previousFromPlaceSearch);
      setSelectedFromPlace(previousSelectedFromPlace);
      setToPlaceSearch(previousToPlaceSearch);
      setSelectedToPlace(previousSelectedToPlace);
      setKilometers(previousKilometers);
      setRatePerKilometer(previousRatePerKilometer);
      setTab(previousTab);
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el viaje");
    }
  }

  async function handleSaveTripVisualEdit() {
    const tripId = tripModalState?.tripId;
    const tripDateValue = tripDraftDate.trim();
    const fromPlaceName = tripDraftFromPlace.trim();
    const placeName = tripDraftPlace.trim();
    const kilometersValue = Number(tripDraftKilometers);
    const rateValue = Number(tripDraftRatePerKilometer);
    const totalAmount = Number((kilometersValue * rateValue).toFixed(2));
    const collectedAmountValue = tripDraftCollectedAmount.trim() ? Number(tripDraftCollectedAmount) : 0;

    if (!tripId) {
      return;
    }

    if (!tripDateValue) {
      toast.error("Falta la fecha");
      return;
    }

    if (!fromPlaceName) {
      toast.error("Falta el origen");
      return;
    }

    if (!placeName) {
      toast.error("Falta el lugar");
      return;
    }

    if (!Number.isFinite(kilometersValue) || kilometersValue <= 0) {
      toast.error("Escribe kilometros validos");
      return;
    }

    if (!Number.isFinite(rateValue) || rateValue <= 0) {
      toast.error("Escribe un valor por kilometro valido");
      return;
    }

    if (tripDraftStatus === "pending") {
      if (!Number.isFinite(collectedAmountValue) || collectedAmountValue <= 0) {
        toast.error("Escribe cuanto se cobro");
        return;
      }

      if (collectedAmountValue >= totalAmount) {
        toast.error("Si se cobro todo, marcá el viaje como pago");
        return;
      }
    }

    const previousTrips = trips;
    const nextCollectedAmount =
      tripDraftStatus === "pending"
        ? Number(collectedAmountValue.toFixed(2))
        : tripDraftStatus === "paid"
          ? totalAmount
          : null;
    setSavingTripEdit(true);
    setTrips((current) =>
      current.map((trip) =>
        trip.id === tripId
          ? {
              ...trip,
              tripDate: tripDateValue,
              placeId: null,
              place: placeName,
              kilometers: Number(kilometersValue.toFixed(2)),
              status: tripDraftStatus,
              collectedAmount: nextCollectedAmount,
              paidAt: tripDraftStatus === "paid" ? new Date().toISOString() : null,
              notes: buildTripNotes(fromPlaceName, rateValue, kilometersValue, nextCollectedAmount),
              updatedAt: new Date().toISOString()
            }
          : trip
      )
    );
    setTripModalState(null);
    setTripDraftDate("");
    setTripDraftFromPlace("");
    setTripDraftPlace("");
    setTripDraftKilometers("");
    setTripDraftRatePerKilometer("");
    setTripDraftStatus("confirmed");
    setTripDraftCollectedAmount("");
    setSavingTripEdit(false);
    toast.success("Registro actualizado");

    try {
      await updateCamionesTrip(tripId, {
        placeName,
        tripDate: tripDateValue,
        kilometers: Number(kilometersValue.toFixed(2)),
        status: tripDraftStatus,
        collectedAmount: nextCollectedAmount ?? undefined,
        notes: buildTripNotes(fromPlaceName, rateValue, kilometersValue, nextCollectedAmount)
      });
      void refreshTrips();
    } catch (error) {
      setTrips(previousTrips);
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el registro");
    }
  }

  async function confirmDeleteTrip() {
    const tripId = tripDeleteConfirmState?.tripId;
    if (!tripId) {
      return;
    }

    const previousTrips = trips;
    setDeletingTripId(tripId);
    setTrips((current) => current.filter((trip) => trip.id !== tripId));
    setTripDeleteConfirmState(null);
    toast.success("Viaje eliminado");

    try {
      await deleteCamionesTripRequest(tripId);
      void refreshTrips();
    } catch (error) {
      setTrips(previousTrips);
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el viaje");
    } finally {
      setDeletingTripId(null);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "14px 10px 28px",
        fontFamily: "system-ui, sans-serif",
        background:
          "radial-gradient(circle at top left, rgba(254, 207, 121, 0.26), transparent 28%), linear-gradient(180deg, #f8f4ec 0%, #eee5d9 100%)"
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <header style={heroStyle}>
          <div style={heroTopRowStyle}>
            <p style={heroEyebrowStyle}>Modelo Camiones</p>
            <ModelUserMenu
              variant="dark"
              showDashboardLink={false}
              menuActions={[]}
            />
          </div>
        </header>

        <section style={tabsWrapStyle}>
          <button type="button" onClick={() => setTab("cliente")} style={tab === "cliente" ? activeTabStyle : tabStyle}>
            Cliente
          </button>
          <button type="button" onClick={() => setTab("viaje")} style={tab === "viaje" ? activeTabStyle : tabStyle}>
            Viaje
          </button>
          <button type="button" onClick={() => setTab("registro")} style={tab === "registro" ? activeTabStyle : tabStyle}>
            Registro
          </button>
        </section>

        {tab === "cliente" ? (
          <section style={panelStyle}>
            <div style={{ display: "grid", gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 24, color: "#2f241e" }}>Buscar cliente</h2>
              <p style={{ margin: 0, color: "#68594f", lineHeight: 1.5 }}>
                Escribe el nombre, toca el cliente si ya existe o usa `+` si es nuevo.
              </p>
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              <label style={fieldWrapStyle}>
                <span style={fieldLabelStyle}>Cliente</span>
                <div style={searchWrapStyle}>
                  <input
                    ref={clientInputRef}
                    type="text"
                    value={clientSearch}
                    onChange={(event) => {
                      setClientSearch(event.target.value);
                      setClientListExpanded(true);
                      setVisibleClientCount(CLIENTS_PAGE_SIZE);
                      setSelectedClient(null);
                    }}
                    placeholder="Escribe el cliente"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setClientListExpanded((current) => !current)}
                    style={routeToggleButtonStyle}
                    aria-label={clientListExpanded ? "Ocultar lista de clientes" : "Mostrar lista de clientes"}
                    aria-expanded={clientListExpanded}
                  >
                    {clientListExpanded ? "▲" : "▼"}
                  </button>
                  <button type="button" onClick={openClientCreateModal} style={plusButtonStyle} aria-label="Agregar cliente">
                    +
                  </button>
                </div>
              </label>

              {clientListExpanded || clientSearch ? (
              <div style={clientListWrapStyle}>
                {clientsLoading ? <div style={emptyBoxStyle}>Cargando clientes...</div> : null}
                {visibleClients.map((client) => (
                  <div key={client.id} style={entityWrapStyle}>
                    <button
                      type="button"
                      onClick={() => selectClient(client)}
                      style={
                        selectedClient?.id === client.id
                          ? selectedButtonStyle
                          : recentClientId === client.id
                            ? recentClientButtonStyle
                            : pickerButtonStyle
                      }
                    >
                      <span style={clientCellContentStyle}>
                        <span style={clientCellTextStyle}>
                          <span>{client.name}</span>
                          <span style={clientPhoneStyle}>{client.phone || "Sin telefono"}</span>
                        </span>
                      </span>
                    </button>
                  </div>
                ))}
                {!clientsLoading && filteredClients.length === 0 ? (
                  <div style={emptyBoxStyle}>No hay clientes para esa busqueda.</div>
                ) : null}
                {!clientsLoading && filteredClients.length > visibleClients.length ? (
                  <button
                    type="button"
                    onClick={() => setVisibleClientCount((current) => current + CLIENTS_PAGE_SIZE)}
                    style={secondaryActionButtonStyle}
                  >
                    Ver mas
                  </button>
                ) : null}
              </div>
              ) : null}

              <button type="button" onClick={() => void goToTripStep()} style={saveButtonStyle} disabled={savingClient}>
                Seguir con este cliente
              </button>
            </div>
          </section>
        ) : null}

        {tab === "viaje" ? (
          <section style={panelStyle}>
            <div style={{ display: "grid", gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 24, color: "#2f241e" }}>Cargar viaje</h2>
              <div style={tripClientMetaStyle}>
                <span style={tripClientMetaLabelStyle}>Cliente</span>
                <span style={tripClientMetaValueStyle}>{selectedClient?.name || clientSearch || "Sin cliente"}</span>
                <button type="button" onClick={() => setTab("cliente")} style={changeClientButtonStyle}>
                  Cambiar
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              <div style={routeInputsWrapStyle}>
                <label style={fieldWrapStyle}>
                  <span style={fieldLabelStyle}>Desde</span>
                  <input
                    ref={placeInputRef}
                    type="text"
                    value={fromPlaceSearch}
                    onChange={(event) => setFromPlaceSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        destinationInputRef.current?.focus();
                      }
                    }}
                    placeholder="Escribe el origen"
                    style={inputStyle}
                  />
                </label>

                <label style={fieldWrapStyle}>
                  <span style={fieldLabelStyle}>Hasta</span>
                  <input
                    ref={destinationInputRef}
                    type="text"
                    value={toPlaceSearch}
                    onChange={(event) => setToPlaceSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        kilometersInputRef.current?.focus();
                      }
                    }}
                    placeholder="Escribe el destino"
                    style={inputStyle}
                  />
                </label>
              </div>

              {showLegacyRouteInputs ? (
              <div style={routeInputsWrapStyle}>
                <label style={fieldWrapStyle}>
                  <span style={fieldLabelStyle}>Desde</span>
                  <div style={routeFieldWrapStyle}>
                    <div style={routeFieldRowStyle}>
                      <input
                        ref={placeInputRef}
                        type="text"
                        value={fromPlaceSearch}
                        readOnly
                        onClick={() => toggleRoutePicker("from")}
                        placeholder="Elegir origen"
                        style={readOnlyRouteInputStyle}
                      />
                      <button
                        type="button"
                        onClick={() => toggleRoutePicker("from")}
                        style={routeToggleButtonStyle}
                        aria-label="Mostrar localidades para origen"
                      >
                        {routePickerOpenField === "from" ? "▴" : "▾"}
                      </button>
                    </div>

                    {routePickerOpenField === "from" ? (
                      <div style={routeDropdownStyle}>
                        <div style={routeDropdownListStyle}>
                          {placesLoading ? <div style={dropdownEmptyStyle}>Cargando lugares...</div> : null}
                          {filteredPlaces.map((place) => (
                            <button
                              key={place.id}
                              type="button"
                              onClick={() => selectPlace(place)}
                              style={
                                selectedFromPlace?.id === place.id || normalizeText(fromPlaceSearch) === normalizeText(place.name)
                                  ? selectedDropdownOptionStyle
                                  : dropdownOptionStyle
                              }
                            >
                              {place.name}
                            </button>
                          ))}
                          {!placesLoading && filteredPlaces.length === 0 ? (
                            <div style={dropdownEmptyStyle}>No hay localidades para esa busqueda.</div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </label>

                <label style={fieldWrapStyle}>
                  <span style={fieldLabelStyle}>Hasta</span>
                  <div style={routeFieldWrapStyle}>
                    <div style={routeFieldRowStyle}>
                      <input
                        ref={destinationInputRef}
                        type="text"
                        value={toPlaceSearch}
                        readOnly
                        onClick={() => toggleRoutePicker("to")}
                        placeholder="Elegir destino"
                        style={readOnlyRouteInputStyle}
                      />
                      <button
                        type="button"
                        onClick={() => toggleRoutePicker("to")}
                        style={routeToggleButtonStyle}
                        aria-label="Mostrar localidades para destino"
                      >
                        {routePickerOpenField === "to" ? "▴" : "▾"}
                      </button>
                    </div>

                    {routePickerOpenField === "to" ? (
                      <div style={routeDropdownStyle}>
                        <div style={routeDropdownListStyle}>
                          {placesLoading ? <div style={dropdownEmptyStyle}>Cargando lugares...</div> : null}
                          {filteredPlaces.map((place) => (
                            <button
                              key={place.id}
                              type="button"
                              onClick={() => selectPlace(place)}
                              style={
                                selectedToPlace?.id === place.id || normalizeText(toPlaceSearch) === normalizeText(place.name)
                                  ? selectedDropdownOptionStyle
                                  : dropdownOptionStyle
                              }
                            >
                              {place.name}
                            </button>
                          ))}
                          {!placesLoading && filteredPlaces.length === 0 ? (
                            <div style={dropdownEmptyStyle}>No hay localidades para esa busqueda.</div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </label>
              </div>
              ) : null}

              <label style={fieldWrapStyle}>
                <span style={fieldLabelStyle}>Kilometros</span>
                <input
                  ref={kilometersInputRef}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={kilometers}
                  onChange={(event) => setKilometers(event.target.value)}
                  placeholder="Ej: 500"
                  style={inputStyle}
                />
              </label>

              <label style={fieldWrapStyle}>
                <span style={fieldLabelStyle}>Valor x km</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={ratePerKilometer}
                  onChange={(event) => setRatePerKilometer(event.target.value)}
                  placeholder="Ej: 105"
                  style={inputStyle}
                />
              </label>

              {Number.isFinite(Number(kilometers)) && Number(kilometers) > 0 && Number.isFinite(Number(ratePerKilometer)) && Number(ratePerKilometer) > 0 ? (
                <div style={tripSummaryCardStyle}>
                  <span style={tripSummaryLabelStyle}>
                    {Number(kilometers).toFixed(2)} km x {formatMoneyLabel(Number(ratePerKilometer))} / km
                  </span>
                  <strong style={tripSummaryValueStyle}>
                    Total: {formatMoneyLabel(Number(kilometers) * Number(ratePerKilometer))}
                  </strong>
                </div>
              ) : null}

              <label style={fieldWrapStyle}>
                <span style={fieldLabelStyle}>Fecha</span>
                <input type="date" value={tripDate} onChange={(event) => setTripDate(event.target.value)} style={inputStyle} />
              </label>

              <button type="button" onClick={() => void handleSaveTrip()} style={saveButtonStyle} disabled={savingTrip}>
                {savingTrip ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </section>
        ) : null}

        {tab === "localidad" ? (
          <section style={panelStyle}>
            <div style={{ display: "grid", gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 24, color: "#2f241e" }}>Agregar nueva localidad</h2>
              <p style={{ margin: 0, color: "#68594f", lineHeight: 1.5 }}>
                Guarda una localidad nueva para dejarla disponible en origen y destino.
              </p>
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              <div style={inlineCreatePanelStyle}>
                <label style={fieldWrapStyle}>
                  <span style={fieldLabelStyle}>Nombre</span>
                  <input
                    type="text"
                    value={placeDraftName}
                    onChange={(event) => setPlaceDraftName(event.target.value)}
                    placeholder="Ej: Piedra Sola"
                    style={inputStyle}
                  />
                </label>

                <div style={tripActionRowStyle}>
                  <button type="button" onClick={() => setTab("viaje")} style={secondaryActionButtonStyle}>
                    Volver a viaje
                  </button>
                  <button type="button" onClick={() => void handleCreatePlaceInline()} style={saveButtonStyle} disabled={savingPlace}>
                    {savingPlace ? "Guardando..." : "Guardar localidad"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {tab === "registro" ? (
          <section style={panelStyle}>
            <div style={{ display: "grid", gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 24, color: "#2f241e" }}>Registro</h2>
              <p style={{ margin: 0, color: "#68594f" }}>Registro de viajes.</p>
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              <div style={filterWrapStyle}>
                <button type="button" onClick={() => setTripFilter("all")} style={tripFilter === "all" ? activeChipStyle : chipStyle}>
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setTripFilter("pending")}
                  style={tripFilter === "pending" ? activeChipStyle : chipStyle}
                >
                  Pendientes
                </button>
                <button type="button" onClick={() => setTripFilter("paid")} style={tripFilter === "paid" ? activeChipStyle : chipStyle}>
                  Pagados
                </button>
              </div>

              {tripsLoading ? <div style={emptyBoxStyle}>Cargando registro...</div> : null}
              {!tripsLoading && visibleGroupedTrips.length === 0 ? <div style={emptyBoxStyle}>Todavia no hay viajes registrados.</div> : null}
              {visibleGroupedTrips.map((group) => {
                const isGroupFullyPaid = group.items.every((trip) => trip.status === "paid");
                const visibleTripsCount = visibleTripsByGroup[group.groupKey] ?? GROUP_TRIPS_PAGE_SIZE;
                const isExpanded = expandedTripGroups[group.groupKey] ?? false;
                const visibleTrips = [...group.items]
                  .map((trip, index) => ({ trip, sequence: index + 1 }))
                  .slice(0, visibleTripsCount);

                return (
                  <article key={group.groupKey} style={isGroupFullyPaid ? historyCardStyle : tripCardStyle}>
                    <div style={tripCardTopRowStyle}>
                      <div style={{ display: "grid", gap: 6 }}>
                        <strong style={{ fontSize: 19, color: "#2f241e" }}>{group.clientName}</strong>
                        <span style={tripMetaStyle}>
                          {group.latestTripDate
                            ? group.latestTripDate === group.oldestTripDate
                              ? `Fecha: ${formatDateLabel(group.latestTripDate)}`
                              : `Ultimo: ${formatDateLabel(group.latestTripDate)}`
                            : "Sin fecha"}
                        </span>
                      </div>
                      <span style={tripCountBadgeStyle}>
                        {group.items.length} viaje{group.items.length > 1 ? "s" : ""}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedTripGroups((current) => ({
                          ...current,
                          [group.groupKey]: !isExpanded
                        }))
                      }
                      style={groupToggleButtonStyle}
                    >
                      {isExpanded ? "Ocultar viajes" : "Mostrar viajes"}
                    </button>

                    {isExpanded ? <div style={tripStackStyle}>
                      {visibleTrips.map(({ trip }) => {
                        const route = getTripRouteParts(trip);
                        const financials = getTripFinancials(trip);

                        return (
                          <div key={trip.id} style={tripRouteItemStyle}>
                            <div style={tripRouteCellStyle}>
                              <div style={tripInlineRowStyle}>
                                <span style={tripInlineIndexStyle}>{formatDateLabel(trip.tripDate)}</span>
                                <div style={tripInlineRouteStyle}>
                                  <span style={tripInlinePlaceStyle}>{route.from}</span>
                                  <span style={tripRouteArrowStyle}>→</span>
                                  <span style={tripInlinePlaceStyle}>{route.to}</span>
                                </div>
                                <span style={tripMiniKmStyle}>{trip.kilometers} km</span>
                              </div>

                            {financials.ratePerKilometer !== null || financials.totalAmount !== null ? (
                              <div style={tripPricingRowStyle}>
                                {financials.ratePerKilometer !== null ? (
                                  <span style={tripPricingLabelStyle}>Tarifa: {formatMoneyLabel(financials.ratePerKilometer)} / km</span>
                                ) : (
                                  <span />
                                )}
                                {financials.totalAmount !== null ? (
                                  <strong style={tripPricingValueStyle}>Total: {formatMoneyLabel(financials.totalAmount)}</strong>
                                ) : null}
                              </div>
                            ) : null}

                            {trip.status === "pending" && financials.totalAmount !== null ? (
                              <div style={tripStatusBreakdownStyle}>
                                <span style={tripBreakdownTextStyle}>Cobrado: {formatMoneyLabel(financials.collectedAmount)}</span>
                                <span style={tripBreakdownTextStyle}>Pendiente: {formatMoneyLabel(financials.pendingAmount ?? 0)}</span>
                              </div>
                            ) : null}

                            <div style={tripRouteItemFooterStyle}>
                              <button type="button" onClick={() => openTripEditModal(trip)} style={miniActionButtonStyle}>
                                Editar
                              </button>
                              {tripFilter === "paid" && trip.status === "paid" ? (
                                <button
                                  type="button"
                                  onClick={() => openTripDeleteConfirm(trip)}
                                  style={dangerMiniActionButtonStyle}
                                  disabled={deletingTripId === trip.id}
                                >
                                  {deletingTripId === trip.id ? "Eliminando..." : "Eliminar"}
                                </button>
                              ) : null}
                              {trip.status === "paid" ? <span style={paidPillStyle}>Pago</span> : null}
                              {trip.status === "pending" ? <span style={pendingPillButtonStyle}>Pendiente</span> : null}
                              {trip.status === "confirmed" ? <span style={confirmedPillStyle}>Confirmado</span> : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {group.items.length > visibleTrips.length ? (
                        <button
                          type="button"
                          onClick={() =>
                            setVisibleTripsByGroup((current) => ({
                              ...current,
                              [group.groupKey]: visibleTripsCount + GROUP_TRIPS_PAGE_SIZE
                            }))
                          }
                          style={secondaryActionButtonStyle}
                        >
                          Ver mas
                        </button>
                      ) : null}
                    </div> : null}

                    <div style={tripCardFooterStyle}>
                      <div style={{ display: "grid", gap: 4 }}>
                        <span style={tripTotalLabelStyle}>Total pendiente</span>
                        {group.hasPricing ? (
                          <span style={tripMoneyStyle}>{formatMoneyLabel(group.pendingAmount)}</span>
                        ) : null}
                      </div>
                      <span style={tripKmStyle}>{group.pendingKilometers.toFixed(0)} km</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>

      {clientModalState ? (
        <div style={modalOverlayStyle} onClick={closeClientModal}>
          <section style={modalCardStyle} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: "grid", gap: 6 }}>
              <h3 style={{ margin: 0, fontSize: 24, color: "#2f241e" }}>
                {clientModalState.mode === "edit" ? "Editar cliente" : "Nuevo cliente"}
              </h3>
              <p style={{ margin: 0, color: "#68594f", lineHeight: 1.5 }}>
                {clientModalState.mode === "edit"
                  ? "Aca ya queda lista la vista para corregir nombre, telefono o eliminar el cliente."
                  : "Carga los datos base del cliente para empezar a usarlo en viajes."}
              </p>
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              <label style={fieldWrapStyle}>
                <span style={fieldLabelStyle}>Nombre</span>
                <input
                  type="text"
                  value={clientDraftName}
                  onChange={(event) => setClientDraftName(event.target.value)}
                  placeholder="Nombre del cliente"
                  style={inputStyle}
                />
              </label>

              <label style={fieldWrapStyle}>
                <span style={fieldLabelStyle}>Telefono</span>
                <input
                  type="text"
                  value={clientDraftPhone}
                  onChange={(event) => setClientDraftPhone(event.target.value)}
                  placeholder="099123456"
                  style={inputStyle}
                />
              </label>
            </div>

            <div style={modalActionsSplitStyle}>
              {clientModalState.mode === "edit" ? (
                <button type="button" onClick={handleDeleteClient} style={modalDangerButtonStyle} disabled={deletingClient}>
                  Eliminar
                </button>
              ) : (
                <span />
              )}
              <div style={modalActionsStyle}>
                <button type="button" onClick={closeClientModal} style={modalCancelButtonStyle}>
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveClient()}
                  style={saveButtonStyle}
                  disabled={savingClient || deletingClient}
                >
                  {savingClient ? "Guardando..." : clientModalState.mode === "edit" ? "Guardar cambios" : "Guardar cliente"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {clientDeleteConfirmOpen ? (
        <div style={modalOverlayStyle} onClick={closeClientDeleteConfirm}>
          <section style={confirmModalCardStyle} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: "grid", gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 24, color: "#2f241e" }}>Estas seguro?</h3>
              <p style={{ margin: 0, color: "#68594f", lineHeight: 1.5 }}>
                Vas a eliminar el cliente <strong>{clientDraftName.trim() || "sin nombre"}</strong>. Esta accion se podra conectar
                de forma real en el siguiente paso.
              </p>
            </div>

            <div style={confirmActionsStyle}>
              <button type="button" onClick={closeClientDeleteConfirm} style={modalCancelButtonStyle}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteClient()}
                style={modalDangerButtonStyle}
                disabled={deletingClient}
              >
                {deletingClient ? "Eliminando..." : "Eliminar cliente"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {placeModalState ? (
        <div style={modalOverlayStyle} onClick={closePlaceModal}>
          <section style={modalCardStyle} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: "grid", gap: 6 }}>
              <h3 style={{ margin: 0, fontSize: 24, color: "#2f241e" }}>
                {placeModalState.mode === "edit" ? "Editar lugar" : "Nuevo lugar"}
              </h3>
              <p style={{ margin: 0, color: "#68594f", lineHeight: 1.5 }}>
                Guarda el lugar para reutilizarlo en viajes siguientes.
              </p>
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              <label style={fieldWrapStyle}>
                <span style={fieldLabelStyle}>Nombre</span>
                <input
                  type="text"
                  value={placeDraftName}
                  onChange={(event) => setPlaceDraftName(event.target.value)}
                  placeholder="Ej: Piedra Sola"
                  style={inputStyle}
                />
              </label>
            </div>

            <div style={modalActionsSplitStyle}>
              {placeModalState.mode === "edit" ? (
                <button
                  type="button"
                  onClick={() => void handleDeletePlaceFromModal()}
                  style={modalDangerButtonStyle}
                  disabled={archivingPlaceId === placeModalState.placeId}
                >
                  {archivingPlaceId === placeModalState.placeId ? "Eliminando..." : "Eliminar"}
                </button>
              ) : (
                <span />
              )}
              <div style={modalActionsStyle}>
                <button type="button" onClick={closePlaceModal} style={modalCancelButtonStyle}>
                  Cancelar
                </button>
                <button type="button" onClick={() => void handleSavePlace()} style={saveButtonStyle} disabled={savingPlace}>
                  {savingPlace ? "Guardando..." : placeModalState.mode === "edit" ? "Guardar cambios" : "Guardar lugar"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {tripModalState ? (
        <div style={modalOverlayStyle} onClick={closeTripModal}>
          <section style={modalCardStyle} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: "grid", gap: 6 }}>
              <h3 style={{ margin: 0, fontSize: 24, color: "#2f241e" }}>Editar registro</h3>
              <p style={{ margin: 0, color: "#68594f", lineHeight: 1.5 }}>
                Ya queda pronta la vista para corregir un viaje cuando se cargó algo mal.
              </p>
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              <label style={fieldWrapStyle}>
                <span style={fieldLabelStyle}>Fecha</span>
                <input type="date" value={tripDraftDate} onChange={(event) => setTripDraftDate(event.target.value)} style={inputStyle} />
              </label>

              <label style={fieldWrapStyle}>
                <span style={fieldLabelStyle}>Origen</span>
                <input
                  type="text"
                  value={tripDraftFromPlace}
                  onChange={(event) => setTripDraftFromPlace(event.target.value)}
                  placeholder="Origen del viaje"
                  style={inputStyle}
                />
              </label>

              <label style={fieldWrapStyle}>
                <span style={fieldLabelStyle}>Destino</span>
                <input
                  type="text"
                  value={tripDraftPlace}
                  onChange={(event) => setTripDraftPlace(event.target.value)}
                  placeholder="Destino del viaje"
                  style={inputStyle}
                />
              </label>

              <label style={fieldWrapStyle}>
                <span style={fieldLabelStyle}>Kilometros</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={tripDraftKilometers}
                  onChange={(event) => setTripDraftKilometers(event.target.value)}
                  placeholder="Ej: 500"
                  style={inputStyle}
                />
              </label>

              <label style={fieldWrapStyle}>
                <span style={fieldLabelStyle}>Valor x km</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={tripDraftRatePerKilometer}
                  onChange={(event) => setTripDraftRatePerKilometer(event.target.value)}
                  placeholder="Ej: 105"
                  style={inputStyle}
                />
              </label>

              <label style={fieldWrapStyle}>
                <span style={fieldLabelStyle}>Estado</span>
                <select value={tripDraftStatus} onChange={(event) => setTripDraftStatus(event.target.value as "confirmed" | "pending" | "paid")} style={inputStyle}>
                  <option value="confirmed">Confirmado</option>
                  <option value="pending">Pendiente</option>
                  <option value="paid">Pago</option>
                </select>
              </label>

              {tripDraftStatus === "pending" ? (
                <label style={fieldWrapStyle}>
                  <span style={fieldLabelStyle}>Monto cobrado</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={tripDraftCollectedAmount}
                    onChange={(event) => setTripDraftCollectedAmount(event.target.value)}
                    placeholder="Ej: 2500"
                    style={inputStyle}
                  />
                </label>
              ) : null}

              {Number.isFinite(Number(tripDraftKilometers)) && Number(tripDraftKilometers) > 0 && Number.isFinite(Number(tripDraftRatePerKilometer)) && Number(tripDraftRatePerKilometer) > 0 ? (
                <div style={tripSummaryCardStyle}>
                  <span style={tripSummaryLabelStyle}>
                    {Number(tripDraftKilometers).toFixed(2)} km x {formatMoneyLabel(Number(tripDraftRatePerKilometer))} / km
                  </span>
                  <strong style={tripSummaryValueStyle}>
                    Total: {formatMoneyLabel(Number(tripDraftKilometers) * Number(tripDraftRatePerKilometer))}
                  </strong>
                  {tripDraftStatus === "pending" && Number.isFinite(Number(tripDraftCollectedAmount)) && Number(tripDraftCollectedAmount) > 0 ? (
                    <span style={tripPendingMetaStyle}>
                      Cobrado: {formatMoneyLabel(Number(tripDraftCollectedAmount))} | Pendiente: {formatMoneyLabel(Math.max((Number(tripDraftKilometers) * Number(tripDraftRatePerKilometer)) - Number(tripDraftCollectedAmount), 0))}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div style={tripModalActionsStyle}>
              <button type="button" onClick={closeTripModal} style={tripModalActionButtonStyle}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleSaveTripVisualEdit()}
                style={tripModalPrimaryActionButtonStyle}
                disabled={savingTripEdit}
              >
                {savingTripEdit ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {tripDeleteConfirmState ? (
        <div style={modalOverlayStyle} onClick={closeTripDeleteConfirm}>
          <section style={confirmModalCardStyle} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: "grid", gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 24, color: "#2f241e" }}>Eliminar viaje pago?</h3>
              <p style={{ margin: 0, color: "#68594f", lineHeight: 1.5 }}>
                Vas a eliminar el viaje pago de <strong>{tripDeleteConfirmState.clientName}</strong> hacia{" "}
                <strong>{tripDeleteConfirmState.placeName || "sin destino"}</strong>. Esta accion no se podra deshacer.
              </p>
            </div>

            <div style={confirmActionsStyle}>
              <button type="button" onClick={closeTripDeleteConfirm} style={modalCancelButtonStyle}>
                Cancelar
              </button>
              <button type="button" onClick={() => void confirmDeleteTrip()} style={modalDangerButtonStyle} disabled={deletingTripId !== null}>
                {deletingTripId !== null ? "Eliminando..." : "Eliminar viaje"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

const heroStyle: React.CSSProperties = {
  position: "relative",
  padding: "18px 16px",
  borderRadius: 26,
  background: "linear-gradient(160deg, #39291f 0%, #241913 100%)",
  color: "#fbf5ec",
  boxShadow: "0 24px 60px rgba(36, 25, 19, 0.22)"
};

const heroEyebrowStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 28,
  lineHeight: 1.05,
  fontWeight: 800,
  color: "#fbf5ec"
};

const heroTopRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12
};

const tabsWrapStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10,
  marginTop: 16
};

const tabStyle: React.CSSProperties = {
  minHeight: 52,
  borderRadius: 18,
  border: "1px solid #d8ccbf",
  background: "#fff8f0",
  color: "#5d4a3e",
  fontWeight: 800,
  boxShadow: "0 8px 16px rgba(73, 48, 34, 0.08)",
  cursor: "pointer"
};

const activeTabStyle: React.CSSProperties = {
  ...tabStyle,
  border: "1px solid #38281f",
  background: "#38281f",
  color: "#fbf5ec",
  boxShadow: "0 14px 26px rgba(36, 25, 19, 0.22)"
};

const panelStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 16,
  borderRadius: 24,
  background: "#fffdf9",
  border: "1px solid #ded3c6",
  boxShadow: "0 16px 34px rgba(73, 48, 34, 0.08)"
};

const fieldWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: 8
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "#4c3d34"
};

const searchWrapStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto auto",
  gap: 8,
  alignItems: "center"
};

const routeInputsWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: 12
};

const routeFieldWrapStyle: React.CSSProperties = {
  position: "relative",
  display: "grid",
  gap: 8
};

const routeFieldRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 8,
  alignItems: "center"
};

const routeToggleButtonStyle: React.CSSProperties = {
  width: 54,
  height: 54,
  borderRadius: 18,
  border: "1px solid #d8ccbf",
  background: "#fff6e9",
  color: "#5f4a3d",
  fontSize: 24,
  fontWeight: 800,
  boxShadow: "0 10px 18px rgba(73, 48, 34, 0.08)",
  cursor: "pointer"
};

const routeDropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  right: 0,
  zIndex: 20,
  display: "grid",
  gap: 10,
  padding: 10,
  borderRadius: 18,
  border: "1px solid #e5d7c6",
  background: "#fffdf9",
  boxShadow: "0 18px 34px rgba(73, 48, 34, 0.14)"
};

const routeDropdownListStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  maxHeight: 220,
  overflowY: "auto"
};

const dropdownOptionStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 44,
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid #eadfce",
  background: "#fcf8f2",
  color: "#2f241e",
  textAlign: "left",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer"
};

const selectedDropdownOptionStyle: React.CSSProperties = {
  ...dropdownOptionStyle,
  border: "1px solid #c98532",
  background: "#fff0dc"
};

const dropdownEmptyStyle: React.CSSProperties = {
  minHeight: 44,
  padding: "10px 12px",
  borderRadius: 14,
  background: "#f8f1e7",
  color: "#6c5848",
  display: "flex",
  alignItems: "center",
  fontSize: 14
};

const tripActionRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)",
  gap: 10,
  alignItems: "center"
};

const tripClientMetaStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  padding: "2px 0 4px"
};

const tripClientMetaLabelStyle: React.CSSProperties = {
  color: "#8a745d",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase"
};

const tripClientMetaValueStyle: React.CSSProperties = {
  color: "#4f3828",
  fontSize: 14,
  fontWeight: 700
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 54,
  padding: "14px 16px",
  borderRadius: 18,
  border: "1px solid #d8ccbf",
  background: "#fffaf4",
  fontSize: 17,
  boxSizing: "border-box"
};

const readOnlyRouteInputStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
  background: "#fff8f0",
  color: "#3f3128",
  fontWeight: 600
};

const plusButtonStyle: React.CSSProperties = {
  width: 54,
  height: 54,
  borderRadius: 18,
  border: "1px solid rgba(95, 63, 8, 0.2)",
  background: "#c98532",
  color: "#fffaf4",
  fontSize: 28,
  lineHeight: 1,
  fontWeight: 800,
  boxShadow: "0 12px 22px rgba(201, 133, 50, 0.22)",
  cursor: "pointer"
};

const pickerButtonStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 52,
  padding: "14px 16px",
  borderRadius: 18,
  border: "1px solid #e1d8cf",
  background: "#fcf8f2",
  color: "#2f241e",
  textAlign: "left",
  fontSize: 17,
  fontWeight: 700,
  position: "relative",
  boxShadow: "0 8px 16px rgba(73, 48, 34, 0.06)",
  cursor: "pointer"
};

const selectedButtonStyle: React.CSSProperties = {
  ...pickerButtonStyle,
  border: "1px solid #c98532",
  background: "#fff0dc",
  boxShadow: "0 12px 24px rgba(201, 133, 50, 0.14)"
};

const recentClientButtonStyle: React.CSSProperties = {
  ...pickerButtonStyle,
  border: "1px dashed #caa06a",
  background: "#fff7ea",
  boxShadow: "0 10px 20px rgba(201, 133, 50, 0.1)"
};

const entityWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: 6
};

const clientListWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  minHeight: 320,
  alignContent: "start"
};

const clientCellContentStyle: React.CSSProperties = {
  position: "relative",
  display: "block",
  width: "100%"
};

const clientCellTextStyle: React.CSSProperties = {
  display: "grid",
  gap: 4
};

const clientPhoneStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#7a6a5d",
  fontWeight: 500
};

const miniActionButtonStyle: React.CSSProperties = {
  minHeight: 36,
  padding: "8px 12px",
  borderRadius: 14,
  border: "1px solid #d8ccbf",
  background: "#fff8f0",
  color: "#5d4a3e",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer"
};

const dangerMiniActionButtonStyle: React.CSSProperties = {
  ...miniActionButtonStyle,
  border: "1px solid #e3b7b0",
  background: "#fff1ee",
  color: "#9f3124"
};

const saveButtonStyle: React.CSSProperties = {
  minHeight: 56,
  padding: "15px 16px",
  borderRadius: 18,
  border: "1px solid #caa06a",
  background: "#f8ead8",
  color: "#4f3828",
  fontWeight: 800,
  fontSize: 17,
  boxShadow: "0 12px 22px rgba(201, 133, 50, 0.12)",
  cursor: "pointer"
};

const secondaryActionButtonStyle: React.CSSProperties = {
  minHeight: 52,
  padding: "14px 16px",
  borderRadius: 18,
  border: "1px solid #d8ccbf",
  background: "#fff8f0",
  color: "#5d4a3e",
  fontWeight: 800,
  fontSize: 16,
  boxShadow: "0 8px 16px rgba(73, 48, 34, 0.08)",
  cursor: "pointer"
};

const changeClientButtonStyle: React.CSSProperties = {
  minHeight: 28,
  padding: "4px 8px",
  borderRadius: 999,
  border: "1px solid #d8ccbf",
  background: "#fff8f0",
  color: "#6b5647",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer"
};

const inlineCreatePanelStyle: React.CSSProperties = {
  display: "grid",
  gap: 14,
  padding: "16px",
  borderRadius: 24,
  border: "1px solid rgba(95, 63, 8, 0.14)",
  background: "#fff8ef",
  boxShadow: "0 14px 28px rgba(95, 63, 8, 0.08)"
};

const tripSummaryCardStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  padding: "14px 16px",
  borderRadius: 18,
  border: "1px solid rgba(201, 133, 50, 0.26)",
  background: "#fff4e3"
};

const tripSummaryLabelStyle: React.CSSProperties = {
  color: "#7b5a31",
  fontSize: 14,
  fontWeight: 700
};

const tripSummaryValueStyle: React.CSSProperties = {
  color: "#4f3828",
  fontSize: 22,
  fontWeight: 800
};

const filterWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap"
};

const chipStyle: React.CSSProperties = {
  minHeight: 40,
  padding: "8px 14px",
  borderRadius: 999,
  border: "1px solid #d8ccbf",
  background: "#fff8f0",
  color: "#5d4a3e",
  fontWeight: 700,
  cursor: "pointer"
};

const activeChipStyle: React.CSSProperties = {
  ...chipStyle,
  border: "1px solid #38281f",
  background: "#38281f",
  color: "#fbf5ec"
};

const tripCardStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 16,
  borderRadius: 22,
  border: "1px solid #e0d3c4",
  background: "linear-gradient(180deg, #fffaf2 0%, #f7efe3 100%)"
};

const tripCardTopRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12
};

const historyCardStyle: React.CSSProperties = {
  ...tripCardStyle,
  background: "linear-gradient(180deg, #f6faf6 0%, #edf6ee 100%)",
  border: "1px solid #cfe1d1"
};

const tripCountBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 12px",
  borderRadius: 999,
  background: "#efe2d0",
  color: "#6a5443",
  fontSize: 13,
  fontWeight: 800
};

const tripMetaStyle: React.CSSProperties = {
  color: "#6d5b4f",
  fontSize: 14
};

const groupToggleButtonStyle: React.CSSProperties = {
  minHeight: 44,
  padding: "12px 14px",
  borderRadius: 16,
  border: "1px solid #d8ccbf",
  background: "#fff8f0",
  color: "#5d4a3e",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer"
};

const tripStackStyle: React.CSSProperties = {
  display: "grid",
  gap: 8
};

const tripRouteItemStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  padding: 0
};

const tripRouteCellStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  padding: 12,
  borderRadius: 18,
  background: "rgba(255, 255, 255, 0.52)",
  border: "1px solid rgba(224, 211, 196, 0.92)"
};

const tripInlineRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr) auto",
  gap: 10,
  alignItems: "center",
  minWidth: 0
};

const tripInlineIndexStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#8a745d",
  whiteSpace: "nowrap"
};

const tripInlineRouteStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
  overflow: "hidden"
};

const tripInlinePlaceStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: "#2f241e",
  lineHeight: 1.2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};

const tripRouteArrowStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  color: "#b67828",
  flex: "0 0 auto"
};

const tripRouteItemFooterStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap"
};

const tripPricingRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap"
};

const tripPricingLabelStyle: React.CSSProperties = {
  color: "#7b5a31",
  fontSize: 13,
  fontWeight: 700
};

const tripPricingValueStyle: React.CSSProperties = {
  color: "#4f3828",
  fontSize: 15,
  fontWeight: 800
};

const tripStatusBreakdownStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap"
};

const tripBreakdownTextStyle: React.CSSProperties = {
  color: "#6e573f",
  fontSize: 13,
  fontWeight: 700
};

const tripMiniKmStyle: React.CSSProperties = {
  color: "#2f241e",
  fontSize: 16,
  fontWeight: 800
};

const tripKmStyle: React.CSSProperties = {
  color: "#2f241e",
  fontSize: 26,
  fontWeight: 800
};

const tripCardFooterStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap"
};

const tripTotalLabelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#8a745d"
};

const tripMoneyStyle: React.CSSProperties = {
  color: "#4f3828",
  fontSize: 16,
  fontWeight: 800
};

const paidPillStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: "10px 14px",
  borderRadius: 999,
  background: "#c7decf",
  color: "#173d2a",
  fontWeight: 800,
  border: "1px solid rgba(23, 61, 42, 0.12)"
};

const pendingPillButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 14px",
  borderRadius: 999,
  border: "1px solid rgba(145, 102, 0, 0.18)",
  background: "#f5e2a8",
  color: "#6a4a00",
  fontWeight: 800,
  boxShadow: "0 8px 16px rgba(188, 146, 43, 0.18)",
  cursor: "pointer"
};

const confirmedPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 14px",
  borderRadius: 999,
  border: "1px solid rgba(104, 89, 79, 0.18)",
  background: "#efe2d0",
  color: "#5c493d",
  fontWeight: 800
};

const tripPendingMetaStyle: React.CSSProperties = {
  color: "#7b5a31",
  fontSize: 13,
  fontWeight: 700
};

const emptyBoxStyle: React.CSSProperties = {
  padding: 16,
  minHeight: 72,
  borderRadius: 18,
  border: "1px dashed #d8ccbf",
  background: "#fffaf4",
  color: "#726255",
  boxSizing: "border-box"
};

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(26, 18, 14, 0.42)",
  display: "grid",
  placeItems: "center",
  padding: 16,
  zIndex: 60,
  overflowY: "auto"
};

const modalCardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  maxHeight: "calc(100vh - 32px)",
  padding: 20,
  borderRadius: 24,
  background: "#fffdf9",
  border: "1px solid #ded3c6",
  boxShadow: "0 24px 50px rgba(26, 18, 14, 0.22)",
  boxSizing: "border-box",
  overflowY: "auto"
};

const confirmModalCardStyle: React.CSSProperties = {
  ...modalCardStyle,
  maxWidth: 400
};

const modalActionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap"
};

const tripModalActionsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10
};

const modalActionsSplitStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginTop: 18,
  flexWrap: "wrap"
};

const confirmActionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 20,
  flexWrap: "wrap"
};

const modalCancelButtonStyle: React.CSSProperties = {
  minHeight: 52,
  padding: "14px 16px",
  borderRadius: 18,
  border: "1px solid #d8ccbf",
  background: "#fff8f0",
  color: "#5d4a3e",
  fontWeight: 800,
  fontSize: 16,
  cursor: "pointer"
};

const tripModalActionButtonStyle: React.CSSProperties = {
  ...modalCancelButtonStyle,
  width: "100%",
  minWidth: 0
};

const tripModalPrimaryActionButtonStyle: React.CSSProperties = {
  ...saveButtonStyle,
  width: "100%",
  minWidth: 0
};

const modalDangerButtonStyle: React.CSSProperties = {
  minHeight: 52,
  padding: "14px 16px",
  borderRadius: 18,
  border: "1px solid #e3b7b0",
  background: "#c74d3d",
  color: "#fff9f7",
  fontWeight: 800,
  fontSize: 16,
  boxShadow: "0 12px 24px rgba(199, 77, 61, 0.18)",
  cursor: "pointer"
};

