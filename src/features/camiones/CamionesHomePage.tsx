import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { ModelUserMenu } from "../../shared/components/ModelUserMenu";
import {
  archiveCamionesClient,
  archiveCamionesPlace,
  createCamionesClient as createCamionesClientRequest,
  createCamionesPlace as createCamionesPlaceRequest,
  createCamionesTrip,
  listCamionesClients,
  listCamionesPlaces,
  listCamionesTrips,
  markCamionesTripPaid as markCamionesTripPaidRequest,
  updateCamionesClient,
  updateCamionesPlace,
  updateCamionesTrip
} from "./camiones.client";
import { CamionesClient, CamionesPlace, CamionesTrip } from "./camiones.types";

type CamionesTab = "cliente" | "viaje" | "registro";
type ClientModalState = { mode: "create" | "edit"; clientId: number | null } | null;
type PlaceModalState = { mode: "create" | "edit"; placeId: number | null } | null;
type TripModalState = { tripId: number } | null;
type TripFilter = "all" | "pending" | "paid";

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

export function CamionesHomePage() {
  const CLIENTS_PAGE_SIZE = 3;
  const clientInputRef = useRef<HTMLInputElement | null>(null);
  const placeInputRef = useRef<HTMLInputElement | null>(null);
  const kilometersInputRef = useRef<HTMLInputElement | null>(null);
  const [tab, setTab] = useState<CamionesTab>("cliente");
  const [clients, setClients] = useState<CamionesClient[]>([]);
  const [places, setPlaces] = useState<CamionesPlace[]>([]);
  const [trips, setTrips] = useState<CamionesTrip[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [visibleClientCount, setVisibleClientCount] = useState(CLIENTS_PAGE_SIZE);
  const [selectedClient, setSelectedClient] = useState<CamionesClient | null>(null);
  const [tripDate, setTripDate] = useState(getTodayDate());
  const [placeSearch, setPlaceSearch] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<CamionesPlace | null>(null);
  const [kilometers, setKilometers] = useState("");
  const [tripSearch, setTripSearch] = useState("");
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
  const [deletingClient, setDeletingClient] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState<number | null>(null);
  const [archivingPlaceId, setArchivingPlaceId] = useState<number | null>(null);
  const [clientModalState, setClientModalState] = useState<ClientModalState>(null);
  const [clientDraftName, setClientDraftName] = useState("");
  const [clientDraftPhone, setClientDraftPhone] = useState("");
  const [clientDeleteConfirmOpen, setClientDeleteConfirmOpen] = useState(false);
  const [placeModalState, setPlaceModalState] = useState<PlaceModalState>(null);
  const [placeDraftName, setPlaceDraftName] = useState("");
  const [tripModalState, setTripModalState] = useState<TripModalState>(null);
  const [tripDraftDate, setTripDraftDate] = useState("");
  const [tripDraftPlace, setTripDraftPlace] = useState("");
  const [tripDraftKilometers, setTripDraftKilometers] = useState("");

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
      void ensurePlacesLoaded();
      placeInputRef.current?.focus();
    }

    if (tab === "registro") {
      void ensureTripsLoaded();
    }
  }, [ensurePlacesLoaded, ensureTripsLoaded, tab]);

  const clientPendingTripMap = useMemo(() => {
    const pendingByClientId = new Map<number, boolean>();

    for (const trip of trips) {
      if (trip.status === "pending") {
        pendingByClientId.set(trip.clientId, true);
      }
    }

    return pendingByClientId;
  }, [trips]);

  const filteredClients = useMemo(() => {
    const query = normalizeText(clientSearch);
    if (!query) {
      return clients;
    }

    return clients.filter((client) => {
      const phone = client.phone?.toLowerCase() || "";
      return client.name.toLowerCase().includes(query) || phone.includes(query);
    });
  }, [clientSearch, clients]);

  const visibleClients = useMemo(
    () => filteredClients.slice(0, visibleClientCount),
    [filteredClients, visibleClientCount]
  );

  useEffect(() => {
    setVisibleClientCount(CLIENTS_PAGE_SIZE);
  }, [clientSearch, clients]);

  const filteredPlaces = useMemo(() => {
    const query = normalizeText(placeSearch);
    if (!query) {
      return places.slice(0, 8);
    }

    return places.filter((place) => place.name.toLowerCase().includes(query));
  }, [placeSearch, places]);

  const filteredTrips = useMemo(() => {
    const query = normalizeText(tripSearch);
    return trips.filter((trip) => {
      if (tripFilter !== "all" && trip.status !== tripFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return trip.clientName.toLowerCase().includes(query) || trip.place.toLowerCase().includes(query);
    });
  }, [tripFilter, tripSearch, trips]);

  function clearTripForm() {
    setTripDate(getTodayDate());
    setPlaceSearch("");
    setSelectedPlace(null);
    setKilometers("");
  }

  function selectClient(client: CamionesClient) {
    setSelectedClient(client);
    setClientSearch(client.name);
    clearTripForm();
    setTab("viaje");
  }

  function selectPlace(place: CamionesPlace) {
    setSelectedPlace(place);
    setPlaceSearch(place.name);
    kilometersInputRef.current?.focus();
  }

  function openClientCreateModal() {
    setClientDraftName(clientSearch.trim());
    setClientDraftPhone("");
    setClientModalState({ mode: "create", clientId: null });
  }

  function openClientEditModal(client: CamionesClient) {
    setClientDraftName(client.name);
    setClientDraftPhone(client.phone || "");
    setClientModalState({ mode: "edit", clientId: client.id });
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

  function openPlaceCreateModal() {
    setPlaceDraftName(placeSearch.trim());
    setPlaceModalState({ mode: "create", placeId: null });
  }

  function openPlaceEditModal(place: CamionesPlace) {
    setPlaceDraftName(place.name);
    setPlaceModalState({ mode: "edit", placeId: place.id });
  }

  function closePlaceModal() {
    if (savingPlace) {
      return;
    }

    setPlaceModalState(null);
    setPlaceDraftName("");
  }

  function openTripEditModal(trip: CamionesTrip) {
    setTripDraftDate(trip.tripDate.includes("T") ? trip.tripDate.slice(0, 10) : trip.tripDate);
    setTripDraftPlace(trip.place);
    setTripDraftKilometers(String(trip.kilometers));
    setTripModalState({ tripId: trip.id });
  }

  function closeTripModal() {
    if (savingTripEdit) {
      return;
    }

    setTripModalState(null);
    setTripDraftDate("");
    setTripDraftPlace("");
    setTripDraftKilometers("");
  }

  async function handleSaveClient() {
    const name = clientDraftName.trim();
    if (!name) {
      toast.error("Escribe el nombre del cliente");
      return;
    }

    setSavingClient(true);

    try {
      const payload =
        clientModalState?.mode === "edit" && clientModalState.clientId
          ? await updateCamionesClient(clientModalState.clientId, {
              name,
              phone: clientDraftPhone.trim() || undefined
            })
          : await createCamionesClientRequest({
              name,
              phone: clientDraftPhone.trim() || undefined
            });

      await refreshClients();
      await refreshTrips();
      setSelectedClient(payload.item);
      setClientSearch(payload.item.name);
      closeClientModal();
      toast.success(clientModalState?.mode === "edit" ? "Cliente actualizado" : `Cliente agregado: ${payload.item.name}`);

      if (tab === "cliente" && clientModalState?.mode !== "edit") {
        clearTripForm();
        setTab("viaje");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el cliente");
    } finally {
      setSavingClient(false);
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

    setDeletingClient(true);

    try {
      await archiveCamionesClient(clientModalState.clientId);
      await refreshClients();
      await refreshTrips();

      if (selectedClient?.id === clientModalState.clientId) {
        setSelectedClient(null);
        setClientSearch("");
      }

      setClientDeleteConfirmOpen(false);
      closeClientModal();
      toast.success("Cliente eliminado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el cliente");
    } finally {
      setDeletingClient(false);
    }
  }

  async function handleSavePlace() {
    const name = placeDraftName.trim();
    if (!name) {
      toast.error("Escribe el lugar");
      return;
    }

    setSavingPlace(true);

    try {
      const payload =
        placeModalState?.mode === "edit" && placeModalState.placeId
          ? await updateCamionesPlace(placeModalState.placeId, { name })
          : await createCamionesPlaceRequest({ name });

      await refreshPlaces();
      setSelectedPlace(payload.item);
      setPlaceSearch(payload.item.name);
      closePlaceModal();
      toast.success(placeModalState?.mode === "edit" ? "Lugar actualizado" : `Lugar agregado: ${payload.item.name}`);
      kilometersInputRef.current?.focus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el lugar");
    } finally {
      setSavingPlace(false);
    }
  }

  async function handleArchivePlace(place: CamionesPlace) {
    setArchivingPlaceId(place.id);

    try {
      await archiveCamionesPlace(place.id);
      await refreshPlaces();

      if (selectedPlace?.id === place.id) {
        setSelectedPlace(null);
        setPlaceSearch("");
      }

      toast.success(`Lugar archivado: ${place.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo archivar el lugar");
    } finally {
      setArchivingPlaceId(null);
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

    if (!selectedClient) {
      toast.error("Falta el cliente");
      return;
    }

    if (!tripDate) {
      toast.error("Falta la fecha");
      return;
    }

    if (!selectedPlace) {
      toast.error("Falta el lugar");
      return;
    }

    if (!Number.isFinite(kmValue) || kmValue <= 0) {
      toast.error("Escribe kilometros validos");
      return;
    }

    setSavingTrip(true);

    try {
      await createCamionesTrip({
        clientId: selectedClient.id,
        placeId: selectedPlace.id,
        tripDate,
        kilometers: Number(kmValue.toFixed(2))
      });
      await refreshTrips();
      toast.success(`Viaje guardado para ${selectedClient.name}`);
      setClientSearch("");
      setSelectedClient(null);
      clearTripForm();
      setTripFilter("pending");
      setTripSearch("");
      setTab("registro");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el viaje");
    } finally {
      setSavingTrip(false);
    }
  }

  async function handleMarkPaid(tripId: number, clientName: string) {
    setMarkingPaidId(tripId);

    try {
      await markCamionesTripPaidRequest(tripId);
      await refreshTrips();
      toast.success(`Pago registrado: ${clientName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar el pago");
    } finally {
      setMarkingPaidId(null);
    }
  }

  async function handleSaveTripVisualEdit() {
    const tripId = tripModalState?.tripId;
    const tripDateValue = tripDraftDate.trim();
    const placeName = tripDraftPlace.trim();
    const kilometersValue = Number(tripDraftKilometers);

    if (!tripId) {
      return;
    }

    if (!tripDateValue) {
      toast.error("Falta la fecha");
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

    const matchedPlace = places.find((place) => normalizeText(place.name) === normalizeText(placeName));
    if (!matchedPlace) {
      toast.error("Elige un lugar existente");
      return;
    }

    setSavingTripEdit(true);

    try {
      await updateCamionesTrip(tripId, {
        placeId: matchedPlace.id,
        tripDate: tripDateValue,
        kilometers: Number(kilometersValue.toFixed(2))
      });
      await refreshTrips();
      closeTripModal();
      toast.success("Registro actualizado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el registro");
    } finally {
      setSavingTripEdit(false);
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
            <ModelUserMenu variant="dark" />
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
                      setVisibleClientCount(CLIENTS_PAGE_SIZE);
                      setSelectedClient(null);
                    }}
                    placeholder="Escribe el cliente"
                    style={inputStyle}
                  />
                  <button type="button" onClick={openClientCreateModal} style={plusButtonStyle} aria-label="Agregar cliente">
                    +
                  </button>
                </div>
              </label>

              <div style={clientListWrapStyle}>
                {clientsLoading ? <div style={emptyBoxStyle}>Cargando clientes...</div> : null}
                {visibleClients.map((client) => (
                  <div key={client.id} style={entityWrapStyle}>
                    <button
                      type="button"
                      onClick={() => selectClient(client)}
                      style={
                        selectedClient?.id === client.id || normalizeText(clientSearch) === normalizeText(client.name)
                          ? selectedButtonStyle
                          : pickerButtonStyle
                      }
                    >
                      <span style={clientCellContentStyle}>
                        <span style={clientCellTextStyle}>
                          <span>{client.name}</span>
                          <span style={clientPhoneStyle}>{client.phone || "Sin telefono"}</span>
                        </span>
                        <span style={clientCellMiddleStyle}>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                              event.stopPropagation();
                              openClientEditModal(client);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                event.stopPropagation();
                                openClientEditModal(client);
                              }
                            }}
                            style={centerActionButtonStyle}
                          >
                            Editar
                          </span>
                        </span>
                        <span style={clientCellStatusWrapStyle}>
                          {clientPendingTripMap.get(client.id) ? (
                            <span style={clientPendingStatusStyle} aria-label="Cliente con pendiente">
                              {"\u2715"}
                            </span>
                          ) : (
                            <span style={clientOkStatusStyle} aria-label="Cliente sin pendientes">
                              {"\u2713"}
                            </span>
                          )}
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
              <p style={{ margin: 0, color: "#68594f" }}>
                Cliente elegido: <strong>{selectedClient?.name || clientSearch || "Sin cliente"}</strong>
              </p>
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              <button type="button" onClick={() => setTab("cliente")} style={secondaryActionButtonStyle}>
                Cambiar cliente
              </button>

              <label style={fieldWrapStyle}>
                <span style={fieldLabelStyle}>Fecha</span>
                <input type="date" value={tripDate} onChange={(event) => setTripDate(event.target.value)} style={inputStyle} />
              </label>

              <label style={fieldWrapStyle}>
                <span style={fieldLabelStyle}>Lugar</span>
                <div style={searchWrapStyle}>
                  <input
                    ref={placeInputRef}
                    type="text"
                    value={placeSearch}
                    onChange={(event) => {
                      setPlaceSearch(event.target.value);
                      setSelectedPlace(null);
                    }}
                    placeholder="Ej: Piedra Sola"
                    style={inputStyle}
                  />
                  <button type="button" onClick={openPlaceCreateModal} style={plusButtonStyle} aria-label="Agregar lugar">
                    +
                  </button>
                </div>
              </label>

              <div style={{ display: "grid", gap: 8 }}>
                {placesLoading ? <div style={emptyBoxStyle}>Cargando lugares...</div> : null}
                {filteredPlaces.map((place) => (
                  <div key={place.id} style={entityWrapStyle}>
                    <button
                      type="button"
                      onClick={() => selectPlace(place)}
                      style={
                        selectedPlace?.id === place.id || normalizeText(placeSearch) === normalizeText(place.name)
                          ? selectedButtonStyle
                          : pickerButtonStyle
                      }
                    >
                      <span style={placeCellContentStyle}>
                        <span style={placeCellTextStyle}>{place.name}</span>
                        <span style={placeCellMiddleStyle}>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                              event.stopPropagation();
                              openPlaceEditModal(place);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                event.stopPropagation();
                                openPlaceEditModal(place);
                              }
                            }}
                            style={centerActionButtonStyle}
                          >
                            Editar
                          </span>
                        </span>
                      </span>
                    </button>
                  </div>
                ))}
                {!placesLoading && filteredPlaces.length === 0 ? (
                  <div style={emptyBoxStyle}>No hay lugares para esa busqueda.</div>
                ) : null}
              </div>

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

              <button type="button" onClick={() => void handleSaveTrip()} style={saveButtonStyle} disabled={savingTrip}>
                {savingTrip ? "Guardando..." : "Registrar viaje"}
              </button>
            </div>
          </section>
        ) : null}

        {tab === "registro" ? (
          <section style={panelStyle}>
            <div style={{ display: "grid", gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 24, color: "#2f241e" }}>Registro</h2>
              <p style={{ margin: 0, color: "#68594f" }}>
                Aca ves todos los viajes. Si uno sigue pendiente, lo cambias a `Pago` desde aca.
              </p>
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              <label style={fieldWrapStyle}>
                <span style={fieldLabelStyle}>Buscar</span>
                <input
                  type="text"
                  value={tripSearch}
                  onChange={(event) => setTripSearch(event.target.value)}
                  placeholder="Cliente o lugar"
                  style={inputStyle}
                />
              </label>

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
              {!tripsLoading && filteredTrips.length === 0 ? <div style={emptyBoxStyle}>Todavia no hay viajes registrados.</div> : null}
              {filteredTrips.map((trip) => (
                <article key={trip.id} style={trip.status === "paid" ? historyCardStyle : tripCardStyle}>
                  <div style={tripCardTopRowStyle}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <strong style={{ fontSize: 19, color: "#2f241e" }}>{trip.clientName}</strong>
                      <span style={tripMetaStyle}>
                        {formatDateLabel(trip.tripDate)} - {trip.place}
                      </span>
                      <span style={tripKmStyle}>{trip.kilometers} km</span>
                    </div>
                    <button type="button" onClick={() => openTripEditModal(trip)} style={miniActionButtonStyle}>
                      Editar
                    </button>
                  </div>
                  {trip.status === "paid" ? (
                    <span style={paidPillStyle}>Pago</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleMarkPaid(trip.id, trip.clientName)}
                      style={pendingPillButtonStyle}
                      disabled={markingPaidId === trip.id}
                    >
                      {markingPaidId === trip.id ? "Guardando..." : "Pendiente"}
                    </button>
                  )}
                </article>
              ))}
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
                <span style={fieldLabelStyle}>Lugar</span>
                <input
                  type="text"
                  value={tripDraftPlace}
                  onChange={(event) => setTripDraftPlace(event.target.value)}
                  placeholder="Lugar del viaje"
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
            </div>

            <div style={modalActionsStyle}>
              <button type="button" onClick={closeTripModal} style={modalCancelButtonStyle}>
                Cancelar
              </button>
              <button type="button" onClick={() => void handleSaveTripVisualEdit()} style={saveButtonStyle} disabled={savingTripEdit}>
                {savingTripEdit ? "Guardando..." : "Guardar cambios"}
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
  gridTemplateColumns: "1fr auto",
  gap: 8,
  alignItems: "center"
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

const clientCellMiddleStyle: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1
};

const clientCellTextStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  paddingRight: 64,
  maxWidth: "calc(100% - 136px)"
};

const clientCellStatusWrapStyle: React.CSSProperties = {
  position: "absolute",
  right: 0,
  top: "50%",
  transform: "translateY(-50%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const placeCellContentStyle: React.CSSProperties = {
  position: "relative",
  display: "block",
  width: "100%"
};

const placeCellTextStyle: React.CSSProperties = {
  display: "block",
  paddingRight: 24,
  maxWidth: "calc(100% - 120px)"
};

const placeCellMiddleStyle: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1
};

const clientPhoneStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#7a6a5d",
  fontWeight: 500
};

const clientPendingStatusStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 28,
  minHeight: 28,
  borderRadius: 999,
  background: "#f5e2a8",
  color: "#8a6300",
  fontSize: 18,
  fontWeight: 900,
  boxShadow: "0 8px 16px rgba(188, 146, 43, 0.18)"
};

const clientOkStatusStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 28,
  minHeight: 28,
  borderRadius: 999,
  background: "#dcefe2",
  color: "#24513a",
  fontSize: 18,
  fontWeight: 900,
  boxShadow: "0 8px 16px rgba(36, 81, 58, 0.12)"
};

const centerActionButtonStyle: React.CSSProperties = {
  minWidth: 98,
  minHeight: 44,
  padding: "9px 16px",
  borderRadius: 14,
  border: "1px solid #cfbeac",
  background: "#fff2df",
  color: "#4f3b2f",
  fontWeight: 800,
  fontSize: 14,
  lineHeight: 1.1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  justifySelf: "center",
  boxSizing: "border-box",
  boxShadow: "0 6px 14px rgba(73, 48, 34, 0.08)",
  cursor: "pointer"
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

const saveButtonStyle: React.CSSProperties = {
  minHeight: 56,
  padding: "15px 16px",
  borderRadius: 18,
  border: "1px solid rgba(16, 74, 53, 0.2)",
  background: "#2b7a57",
  color: "#f7fffb",
  fontWeight: 800,
  fontSize: 17,
  boxShadow: "0 16px 28px rgba(43, 122, 87, 0.22)",
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

const tripMetaStyle: React.CSSProperties = {
  color: "#6d5b4f",
  fontSize: 14
};

const tripKmStyle: React.CSSProperties = {
  color: "#2f241e",
  fontSize: 26,
  fontWeight: 800
};

const paidPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignSelf: "flex-start",
  padding: "10px 14px",
  borderRadius: 999,
  background: "#dcefe2",
  color: "#24513a",
  fontWeight: 800
};

const pendingPillButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  alignSelf: "flex-start",
  padding: "10px 14px",
  borderRadius: 999,
  border: "1px solid rgba(145, 102, 0, 0.18)",
  background: "#f5e2a8",
  color: "#6a4a00",
  fontWeight: 800,
  boxShadow: "0 8px 16px rgba(188, 146, 43, 0.18)",
  cursor: "pointer"
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
  zIndex: 60
};

const modalCardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  padding: 20,
  borderRadius: 24,
  background: "#fffdf9",
  border: "1px solid #ded3c6",
  boxShadow: "0 24px 50px rgba(26, 18, 14, 0.22)"
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
