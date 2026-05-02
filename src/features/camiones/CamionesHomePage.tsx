import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { getStoredUser } from "../auth/auth.client";
import {
  createCamionesClient as createCamionesClientRequest,
  createCamionesTrip,
  listCamionesClients,
  listCamionesTrips,
  markCamionesTripPaid as markCamionesTripPaidRequest
} from "./camiones.client";
import { createCamionesPlace, getCamionesPlaces } from "./camiones.storage";
import { CamionesClient, CamionesTrip } from "./camiones.types";

type CamionesTab = "cliente" | "viaje" | "registro";

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

export function CamionesHomePage() {
  const user = getStoredUser();
  const userDisplayName =
    user?.fullName?.trim() || user?.tenantContext?.tenant.name || user?.email || "Usuario";
  const clientInputRef = useRef<HTMLInputElement | null>(null);
  const placeInputRef = useRef<HTMLInputElement | null>(null);
  const kilometersInputRef = useRef<HTMLInputElement | null>(null);
  const [tab, setTab] = useState<CamionesTab>("cliente");
  const [clients, setClients] = useState<CamionesClient[]>([]);
  const [places, setPlaces] = useState<string[]>([]);
  const [trips, setTrips] = useState<CamionesTrip[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<CamionesClient | null>(null);
  const [tripDate, setTripDate] = useState(getTodayDate());
  const [placeSearch, setPlaceSearch] = useState("");
  const [selectedPlace, setSelectedPlace] = useState("");
  const [kilometers, setKilometers] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingTrip, setSavingTrip] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState<number | null>(null);

  useEffect(() => {
    void loadInitialData();
  }, []);

  useEffect(() => {
    if (tab === "cliente") {
      clientInputRef.current?.focus();
    }

    if (tab === "viaje") {
      placeInputRef.current?.focus();
    }
  }, [tab]);

  async function loadInitialData() {
    setLoading(true);

    try {
      const [clientsPayload, tripsPayload] = await Promise.all([
        listCamionesClients({ limit: 100 }),
        listCamionesTrips({ limit: 100 })
      ]);

      setClients(clientsPayload.items);
      setTrips(tripsPayload.items);
      setPlaces(getCamionesPlaces());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar camiones");
    } finally {
      setLoading(false);
    }
  }

  async function refreshClients() {
    const payload = await listCamionesClients({ limit: 100 });
    setClients(payload.items);
  }

  async function refreshTrips() {
    const payload = await listCamionesTrips({ limit: 100 });
    setTrips(payload.items);
  }

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
    const query = clientSearch.trim().toLowerCase();
    if (!query) {
      return clients.slice(0, 6);
    }

    return clients.filter((client) => client.name.toLowerCase().includes(query));
  }, [clientSearch, clients]);

  const filteredPlaces = useMemo(() => {
    const query = placeSearch.trim().toLowerCase();
    if (!query) {
      return places.slice(0, 8);
    }

    return places.filter((place) => place.toLowerCase().includes(query));
  }, [placeSearch, places]);

  function clearTripForm() {
    setTripDate(getTodayDate());
    setPlaceSearch("");
    setSelectedPlace("");
    setKilometers("");
  }

  function selectClient(client: CamionesClient) {
    setSelectedClient(client);
    setClientSearch(client.name);
    clearTripForm();
    setTab("viaje");
  }

  async function handleCreateClient() {
    const name = clientSearch.trim();
    if (!name) {
      toast.error("Escribe el nombre del cliente");
      return;
    }

    setSavingClient(true);

    try {
      const payload = await createCamionesClientRequest({ name });
      await refreshClients();
      setSelectedClient(payload.item);
      setClientSearch(payload.item.name);
      clearTripForm();
      toast.success(`Cliente agregado: ${payload.item.name}`);
      setTab("viaje");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el cliente");
    } finally {
      setSavingClient(false);
    }
  }

  function handleCreatePlace() {
    const name = placeSearch.trim();
    if (!name) {
      toast.error("Escribe el lugar");
      return;
    }

    const place = createCamionesPlace(name);
    setPlaces(getCamionesPlaces());
    setSelectedPlace(place);
    setPlaceSearch(place);
    toast.success(`Lugar agregado: ${place}`);
    kilometersInputRef.current?.focus();
  }

  async function goToTripStep() {
    const clientName = clientSearch.trim();
    if (!clientName) {
      toast.error("Falta el cliente");
      return;
    }

    const existingClient = clients.find((client) => client.name.toLowerCase() === clientName.toLowerCase());
    if (existingClient) {
      selectClient(existingClient);
      return;
    }

    setSavingClient(true);

    try {
      const payload = await createCamionesClientRequest({ name: clientName });
      await refreshClients();
      setSelectedClient(payload.item);
      setClientSearch(payload.item.name);
      clearTripForm();
      toast.success(`Cliente agregado: ${payload.item.name}`);
      setTab("viaje");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el cliente");
    } finally {
      setSavingClient(false);
    }
  }

  function selectPlace(place: string) {
    setSelectedPlace(place);
    setPlaceSearch(place);
    kilometersInputRef.current?.focus();
  }

  async function handleSaveTrip() {
    const kmValue = Number(kilometers);
    const rawPlace = selectedPlace || placeSearch.trim();

    if (!selectedClient) {
      toast.error("Falta el cliente");
      return;
    }

    if (!tripDate) {
      toast.error("Falta la fecha");
      return;
    }

    if (!rawPlace) {
      toast.error("Falta el lugar");
      return;
    }

    if (!Number.isFinite(kmValue) || kmValue <= 0) {
      toast.error("Escribe kilometros validos");
      return;
    }

    setSavingTrip(true);

    try {
      const effectivePlace = createCamionesPlace(rawPlace);
      setPlaces(getCamionesPlaces());

      await createCamionesTrip({
        clientId: selectedClient.id,
        tripDate,
        place: effectivePlace,
        kilometers: Number(kmValue.toFixed(2))
      });

      await refreshTrips();
      toast.success(`Viaje guardado para ${selectedClient.name}`);
      setClientSearch("");
      setSelectedClient(null);
      clearTripForm();
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
          <p style={heroEyebrowStyle}>Modelo Camiones</p>
          <h1 style={{ margin: "10px 0 8px", fontSize: 30, lineHeight: 1.05 }}>Viajes simples y claros</h1>
          <p style={heroBodyStyle}>
            Primero buscas el cliente, despues cargas el viaje y al cobrarlo lo mandas al registro. Todo pensado para
            usar comodo desde el celular.
          </p>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <div style={heroUserWrapStyle}>
              <div style={heroUserBadgeStyle}>
                <span style={heroUserIconWrapStyle} aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21a8 8 0 0 0-16 0" />
                    <circle cx="12" cy="8" r="4" />
                  </svg>
                </span>
                <span style={heroUserNameStyle}>{userDisplayName}</span>
              </div>
              <Link to="/" style={heroExitLinkStyle}>
                Salir
              </Link>
            </div>
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

        {loading ? (
          <section style={panelStyle}>
            <div style={emptyBoxStyle}>Cargando datos de camiones...</div>
          </section>
        ) : null}

        {!loading && tab === "cliente" ? (
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
                      setSelectedClient(null);
                    }}
                    placeholder="Escribe el cliente"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => void handleCreateClient()}
                    style={plusButtonStyle}
                    aria-label="Agregar cliente"
                    disabled={savingClient}
                  >
                    +
                  </button>
                </div>
              </label>

              <div style={{ display: "grid", gap: 8 }}>
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => selectClient(client)}
                    style={
                      selectedClient?.id === client.id || clientSearch.trim().toLowerCase() === client.name.toLowerCase()
                        ? selectedButtonStyle
                        : pickerButtonStyle
                    }
                  >
                    <span style={clientRowStyle}>
                      <span>{client.name}</span>
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
                  </button>
                ))}
                {filteredClients.length === 0 ? <div style={emptyBoxStyle}>No hay clientes para esa busqueda.</div> : null}
              </div>

              <button type="button" onClick={() => void goToTripStep()} style={saveButtonStyle} disabled={savingClient}>
                Seguir con este cliente
              </button>
            </div>
          </section>
        ) : null}

        {!loading && tab === "viaje" ? (
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
                      setSelectedPlace("");
                    }}
                    placeholder="Ej: Piedra Sola"
                    style={inputStyle}
                  />
                  <button type="button" onClick={handleCreatePlace} style={plusButtonStyle} aria-label="Agregar lugar">
                    +
                  </button>
                </div>
              </label>

              <div style={{ display: "grid", gap: 8 }}>
                {filteredPlaces.map((place) => (
                  <button
                    key={place}
                    type="button"
                    onClick={() => selectPlace(place)}
                    style={
                      selectedPlace === place || placeSearch.trim().toLowerCase() === place.toLowerCase()
                        ? selectedButtonStyle
                        : pickerButtonStyle
                    }
                  >
                    {place}
                  </button>
                ))}
                {filteredPlaces.length === 0 ? <div style={emptyBoxStyle}>No hay lugares para esa busqueda.</div> : null}
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

        {!loading && tab === "registro" ? (
          <section style={panelStyle}>
            <div style={{ display: "grid", gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 24, color: "#2f241e" }}>Registro</h2>
              <p style={{ margin: 0, color: "#68594f" }}>
                Aca ves todos los viajes. Si uno sigue pendiente, lo cambias a `Pago` desde aca.
              </p>
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              {trips.length === 0 ? <div style={emptyBoxStyle}>Todavia no hay viajes registrados.</div> : null}
              {trips.map((trip) => (
                <article key={trip.id} style={trip.status === "paid" ? historyCardStyle : tripCardStyle}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <strong style={{ fontSize: 19, color: "#2f241e" }}>{trip.clientName}</strong>
                    <span style={tripMetaStyle}>
                      {formatDateLabel(trip.tripDate)} - {trip.place}
                    </span>
                    <span style={tripKmStyle}>{trip.kilometers} km</span>
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
    </main>
  );
}

const heroStyle: React.CSSProperties = {
  padding: "18px 16px 20px",
  borderRadius: 26,
  background: "linear-gradient(160deg, #39291f 0%, #241913 100%)",
  color: "#fbf5ec",
  boxShadow: "0 24px 60px rgba(36, 25, 19, 0.22)"
};

const heroEyebrowStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.16em",
  color: "rgba(251, 245, 236, 0.72)"
};

const heroBodyStyle: React.CSSProperties = {
  margin: 0,
  color: "rgba(251, 245, 236, 0.82)",
  lineHeight: 1.6
};

const heroPrimaryLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "11px 15px",
  borderRadius: 999,
  textDecoration: "none",
  fontWeight: 800,
  background: "#f3c57d",
  color: "#2f2117",
  border: "1px solid rgba(95, 63, 8, 0.2)",
  boxShadow: "0 10px 20px rgba(243, 197, 125, 0.24)"
};

const heroUserWrapStyle: React.CSSProperties = {
  display: "grid",
  justifyItems: "end",
  gap: 8
};

const heroUserBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  maxWidth: "100%",
  padding: "10px 14px",
  borderRadius: 999,
  background: "rgba(255, 248, 240, 0.12)",
  border: "1px solid rgba(255, 248, 240, 0.16)",
  boxShadow: "0 10px 20px rgba(15, 9, 7, 0.12)"
};

const heroUserIconWrapStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  borderRadius: 999,
  background: "#f3c57d",
  color: "#2f2117",
  flexShrink: 0
};

const heroUserNameStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#fbf5ec",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: 220
};

const heroExitLinkStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "rgba(251, 245, 236, 0.82)",
  textDecoration: "none"
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
  boxShadow: "0 8px 16px rgba(73, 48, 34, 0.06)",
  cursor: "pointer"
};

const selectedButtonStyle: React.CSSProperties = {
  ...pickerButtonStyle,
  border: "1px solid #c98532",
  background: "#fff0dc",
  boxShadow: "0 12px 24px rgba(201, 133, 50, 0.14)"
};

const clientRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12
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

const tripCardStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 16,
  borderRadius: 22,
  border: "1px solid #e0d3c4",
  background: "linear-gradient(180deg, #fffaf2 0%, #f7efe3 100%)"
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
  borderRadius: 18,
  border: "1px dashed #d8ccbf",
  background: "#fffaf4",
  color: "#726255"
};
