import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ModelUserMenu } from "../../shared/components/ModelUserMenu";
import { listCamionesClients, listCamionesPlaces, listMyCamionesTrips, submitCamionesDriverTrip, finishMyCamionesTrip, type CamionesMyTrip } from "./camiones.client";
import type { CamionesClient, CamionesPlace, CamionesTruck } from "./camiones.types";
import { ExpandableList } from "./ExpandableList";

// Pantalla del CAMIONERO (rehecha 15/11/2026, mismo formato que la del
// administrador): pestañas Cliente -> Viaje -> Mis viajes. Elige el cliente,
// despues en el viaje carga origen, destino, camion y zorra. NO puede poner
// kilometros ni valor: eso lo hace el administrador (La Milagrosa).

type DriverTab = "cliente" | "viaje" | "mis";
type HistoryView = "pendientes" | "pagados";

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}-${`${now.getDate()}`.padStart(2, "0")}`;
}

function dateLabel(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function truckLabel(truck: CamionesTruck | null) {
  return truck === "mercedes" ? "Mercedes" : truck === "volkswagen" ? "Volkswagen" : "—";
}

export function CamionesDriverPage() {
  const [tab, setTab] = useState<DriverTab>("cliente");
  const [clients, setClients] = useState<CamionesClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [places, setPlaces] = useState<CamionesPlace[]>([]);
  const [myTrips, setMyTrips] = useState<CamionesMyTrip[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [client, setClient] = useState<CamionesClient | null>(null);
  const [truck, setTruck] = useState<CamionesTruck | "">("");
  const [withTrailer, setWithTrailer] = useState<boolean | null>(null);
  const [fromPlace, setFromPlace] = useState("");
  const [toPlace, setToPlace] = useState("");
  const [tripDate, setTripDate] = useState(today());
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);

  const loadMine = useCallback(async () => {
    try {
      setMyTrips((await listMyCamionesTrips()).items);
    } catch {
      // Sin lista por ahora; el envio igual funciona.
    }
  }, []);

  useEffect(() => {
    void listCamionesClients({ limit: 100 })
      .then((payload) => setClients(payload.items))
      .catch(() => toast.error("No se pudieron cargar los clientes"))
      .finally(() => setClientsLoading(false));
    void listCamionesPlaces({ limit: 100 })
      .then((payload) => setPlaces(payload.items))
      .catch(() => undefined);
    void loadMine();
  }, [loadMine]);

  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();
    // Sin texto no se muestra ninguna lista: el camionero tiene que buscar.
    if (!query) return [];
    return clients.filter((item) => item.name.toLowerCase().includes(query));
  }, [clientSearch, clients]);

  const [historyView, setHistoryView] = useState<HistoryView>("pendientes");
  // Pendientes: todo lo que todavia no se pago (enviado, aprobado, terminado).
  // Pagados: lo que ya se cobro.
  const pendingTrips = useMemo(() => myTrips.filter((trip) => !trip.paid), [myTrips]);
  const paidTrips = useMemo(() => myTrips.filter((trip) => trip.paid), [myTrips]);

  async function handleFinish(tripId: number) {
    try {
      await finishMyCamionesTrip(tripId);
      toast.success("Listo, avisaste que terminaste ✔");
      void loadMine();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo avisar");
    }
  }

  function selectClient(item: CamionesClient) {
    setClient(item);
    setTab("viaje");
  }

  async function handleSend() {
    if (!client) {
      toast.error("Elegí el cliente");
      return setTab("cliente");
    }
    if (!fromPlace.trim()) return toast.error("Falta de dónde sale");
    if (!toPlace.trim()) return toast.error("Falta el destino");
    if (!truck) return toast.error("Elegí el camión");
    if (withTrailer === null) return toast.error("Decí si fue con zorra o sin zorra");

    setSending(true);
    try {
      await submitCamionesDriverTrip({
        clientId: client.id,
        truck,
        withTrailer,
        tripDate,
        fromPlaceName: fromPlace.trim(),
        placeName: toPlace.trim(),
        description: description.trim() || undefined
      });
      toast.success("Viaje enviado ✔");
      // Se limpia lo del viaje; el camion queda por comodidad.
      setClient(null);
      setClientSearch("");
      setFromPlace("");
      setToPlace("");
      setDescription("");
      setWithTrailer(null);
      setTripDate(today());
      void loadMine();
      setTab("mis");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar el viaje");
    } finally {
      setSending(false);
    }
  }

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <header style={heroStyle}>
          <div style={heroTopRowStyle}>
            <p style={heroEyebrowStyle}>Modelo Camiones</p>
            <ModelUserMenu variant="dark" showDashboardLink={false} />
          </div>
        </header>

        <section style={tabsWrapStyle}>
          <button type="button" onClick={() => setTab("cliente")} style={tab === "cliente" ? activeTabStyle : tabStyle}>
            Cliente
          </button>
          <button type="button" onClick={() => setTab("viaje")} style={tab === "viaje" ? activeTabStyle : tabStyle}>
            Viaje
          </button>
          <button type="button" onClick={() => setTab("mis")} style={tab === "mis" ? activeTabStyle : tabStyle}>
            Historial
          </button>
        </section>

        {tab === "cliente" ? (
          <section style={panelStyle}>
            <h2 style={titleStyle}>Elegí el cliente</h2>
            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              <label style={fieldWrapStyle}>
                <span style={fieldLabelStyle}>Cliente</span>
                <input type="text" value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} placeholder="Escribe el cliente" style={inputStyle} />
              </label>
              <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
                {clientsLoading ? <div style={emptyBoxStyle}>Cargando clientes...</div> : null}
                <ExpandableList
                  items={filteredClients}
                  render={(item) => (
                    <button key={item.id} type="button" onClick={() => selectClient(item)} style={client?.id === item.id ? selectedButtonStyle : pickerButtonStyle}>
                      {item.name}
                    </button>
                  )}
                />
                {!clientsLoading && !clientSearch.trim() ? <div style={emptyBoxStyle}>Escribí el nombre del cliente para buscarlo.</div> : null}
                {!clientsLoading && clientSearch.trim() && filteredClients.length === 0 ? (
                  <div style={emptyBoxStyle}>No hay clientes para esa busqueda. Avisale al administrador.</div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {tab === "viaje" ? (
          <section style={panelStyle}>
            <div style={{ display: "grid", gap: 8 }}>
              <h2 style={titleStyle}>Cargar viaje</h2>
              <div style={clientMetaStyle}>
                <span style={clientMetaLabelStyle}>Cliente</span>
                <span style={clientMetaValueStyle}>{client?.name || "Sin cliente"}</span>
                <button type="button" onClick={() => setTab("cliente")} style={changeButtonStyle}>
                  {client ? "Cambiar" : "Elegir"}
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              <label style={fieldWrapStyle}>
                <span style={fieldLabelStyle}>Desde</span>
                <input style={inputStyle} list="driver-places" value={fromPlace} onChange={(event) => setFromPlace(event.target.value)} placeholder="Origen" maxLength={80} />
              </label>
              <label style={fieldWrapStyle}>
                <span style={fieldLabelStyle}>Hasta</span>
                <input style={inputStyle} list="driver-places" value={toPlace} onChange={(event) => setToPlace(event.target.value)} placeholder="Destino" maxLength={120} />
              </label>
              <datalist id="driver-places">
                {places.map((place) => (
                  <option key={place.id} value={place.name} />
                ))}
              </datalist>

              <div style={fieldWrapStyle}>
                <span style={fieldLabelStyle}>Camión</span>
                <div style={twoColsStyle}>
                  <button type="button" onClick={() => setTruck("mercedes")} style={truck === "mercedes" ? selectedButtonStyle : pickerButtonStyle}>
                    Mercedes
                  </button>
                  <button type="button" onClick={() => setTruck("volkswagen")} style={truck === "volkswagen" ? selectedButtonStyle : pickerButtonStyle}>
                    Volkswagen
                  </button>
                </div>
              </div>

              <div style={fieldWrapStyle}>
                <span style={fieldLabelStyle}>¿Con zorra?</span>
                <div style={twoColsStyle}>
                  <button type="button" onClick={() => setWithTrailer(true)} style={withTrailer === true ? selectedButtonStyle : pickerButtonStyle}>
                    Con zorra
                  </button>
                  <button type="button" onClick={() => setWithTrailer(false)} style={withTrailer === false ? selectedButtonStyle : pickerButtonStyle}>
                    Sin zorra
                  </button>
                </div>
              </div>

              <label style={fieldWrapStyle}>
                <span style={fieldLabelStyle}>Fecha</span>
                <input style={inputStyle} type="date" value={tripDate} onChange={(event) => setTripDate(event.target.value)} />
              </label>

              <label style={fieldWrapStyle}>
                <span style={fieldLabelStyle}>Nota (opcional)</span>
                <input style={inputStyle} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ej: carga de piedra" maxLength={100} />
              </label>

              <button type="button" onClick={() => void handleSend()} disabled={sending} style={saveButtonStyle}>
                {sending ? "Enviando…" : "Guardar viaje"}
              </button>
            </div>
          </section>
        ) : null}

        {tab === "mis" ? (
          <section style={panelStyle}>
            <h2 style={titleStyle}>Historial</h2>
            <div style={{ ...twoColsStyle, marginTop: 12 }}>
              <button type="button" onClick={() => setHistoryView("pendientes")} style={historyView === "pendientes" ? activeTabStyle : tabStyle}>
                Por confirmar ({pendingTrips.length})
              </button>
              <button type="button" onClick={() => setHistoryView("pagados")} style={historyView === "pagados" ? activeTabStyle : tabStyle}>
                Pagados ({paidTrips.length})
              </button>
            </div>
            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              {historyView === "pendientes" ? (
                <>
                  {pendingTrips.length === 0 ? <div style={emptyBoxStyle}>No tenés viajes pendientes.</div> : null}
                  <ExpandableList items={pendingTrips} render={(trip) => <TripCard key={trip.id} trip={trip} onFinish={() => void handleFinish(trip.id)} />} />
                </>
              ) : (
                <>
                  {paidTrips.length === 0 ? <div style={emptyBoxStyle}>Todavía no tenés viajes pagados.</div> : null}
                  <ExpandableList items={paidTrips} render={(trip) => <TripCard key={trip.id} trip={trip} />} />
                </>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function TripCard({ trip, onFinish }: { trip: CamionesMyTrip; onFinish?: () => void }) {
  return (
    <article style={tripCardStyle}>
      <div style={tripCardTopRowStyle}>
        <strong style={{ color: "#2f241e" }}>{trip.clientName}</strong>
        <span style={{ color: "#68594f", fontSize: 13 }}>{dateLabel(trip.tripDate)}</span>
      </div>
      <div style={{ color: "#2f241e" }}>
        {trip.from || "?"} → {trip.to}
      </div>
      <div style={{ color: "#68594f", fontSize: 14 }}>
        {truckLabel(trip.truck)}
        {trip.withTrailer ? " · con zorra" : " · sin zorra"}
      </div>
      {trip.confirmed && trip.share !== null ? <div style={{ color: "#1f6b34", fontSize: 16, fontWeight: 800 }}>Te corresponde ${trip.share.toFixed(0)}</div> : null}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={trip.paid ? paidBadgeStyle : trip.done ? doneBadgeStyle : trip.confirmed ? approvedBadgeStyle : sentBadgeStyle}>
          {trip.paid ? "Pagado" : trip.done ? "Terminado · esperando pago" : trip.confirmed ? "Aprobado · a hacer" : "Enviado"}
        </span>
        {trip.confirmed && !trip.done && !trip.paid && onFinish ? (
          <button type="button" onClick={onFinish} style={finishButtonStyle}>
            Terminé el viaje
          </button>
        ) : null}
      </div>
    </article>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: "14px 10px 28px",
  fontFamily: "system-ui, sans-serif",
  background: "radial-gradient(circle at top left, rgba(254, 207, 121, 0.26), transparent 28%), linear-gradient(180deg, #f8f4ec 0%, #eee5d9 100%)"
};
const heroStyle: React.CSSProperties = { position: "relative", padding: "18px 16px", borderRadius: 26, background: "linear-gradient(160deg, #39291f 0%, #241913 100%)", color: "#fbf5ec", boxShadow: "0 24px 60px rgba(36, 25, 19, 0.22)" };
const heroTopRowStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 };
const heroEyebrowStyle: React.CSSProperties = { margin: 0, fontSize: 28, lineHeight: 1.05, fontWeight: 800, color: "#fbf5ec" };
const tabsWrapStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 16 };
const tabStyle: React.CSSProperties = { minHeight: 52, padding: "0 4px", fontSize: 14, borderRadius: 18, border: "1px solid #d8ccbf", background: "#fff8f0", color: "#5d4a3e", fontWeight: 800, boxShadow: "0 8px 16px rgba(73, 48, 34, 0.08)", cursor: "pointer" };
const activeTabStyle: React.CSSProperties = { ...tabStyle, border: "1px solid #38281f", background: "#38281f", color: "#fbf5ec", boxShadow: "0 14px 26px rgba(36, 25, 19, 0.22)" };
const panelStyle: React.CSSProperties = { marginTop: 16, padding: 16, borderRadius: 24, background: "#fffdf9", border: "1px solid #ded3c6", boxShadow: "0 16px 34px rgba(73, 48, 34, 0.08)" };
const titleStyle: React.CSSProperties = { margin: 0, fontSize: 24, color: "#2f241e" };
const fieldWrapStyle: React.CSSProperties = { display: "grid", gap: 8 };
const fieldLabelStyle: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: "#4c3d34" };
const inputStyle: React.CSSProperties = { width: "100%", minHeight: 54, padding: "14px 16px", borderRadius: 18, border: "1px solid #d8ccbf", background: "#fffaf4", fontSize: 17, boxSizing: "border-box" };
const pickerButtonStyle: React.CSSProperties = { width: "100%", minHeight: 52, padding: "14px 16px", borderRadius: 18, border: "1px solid #e1d8cf", background: "#fcf8f2", color: "#2f241e", textAlign: "left", fontSize: 17, fontWeight: 700, boxShadow: "0 8px 16px rgba(73, 48, 34, 0.06)", cursor: "pointer" };
const selectedButtonStyle: React.CSSProperties = { ...pickerButtonStyle, border: "1px solid #c98532", background: "#fff0dc", boxShadow: "0 12px 24px rgba(201, 133, 50, 0.14)" };
const twoColsStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 };
const saveButtonStyle: React.CSSProperties = { minHeight: 56, padding: "15px 16px", borderRadius: 18, border: "1px solid #caa06a", background: "#f8ead8", color: "#4f3828", fontWeight: 800, fontSize: 17, boxShadow: "0 12px 22px rgba(201, 133, 50, 0.12)", cursor: "pointer" };
const emptyBoxStyle: React.CSSProperties = { padding: 16, minHeight: 56, borderRadius: 18, border: "1px dashed #d8ccbf", background: "#fffaf4", color: "#726255", boxSizing: "border-box" };
const clientMetaStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "2px 0 4px" };
const clientMetaLabelStyle: React.CSSProperties = { color: "#8a745d", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" };
const clientMetaValueStyle: React.CSSProperties = { color: "#4f3828", fontSize: 14, fontWeight: 700 };
const changeButtonStyle: React.CSSProperties = { minHeight: 28, padding: "4px 8px", borderRadius: 999, border: "1px solid #d8ccbf", background: "#fff8f0", color: "#6b5647", fontWeight: 700, fontSize: 12, cursor: "pointer" };
const tripCardStyle: React.CSSProperties = { display: "grid", gap: 8, padding: 16, borderRadius: 22, border: "1px solid #e0d3c4", background: "linear-gradient(180deg, #fffaf2 0%, #f7efe3 100%)" };
const tripCardTopRowStyle: React.CSSProperties = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 };
const badgeBase: React.CSSProperties = { fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999 };
const sentBadgeStyle: React.CSSProperties = { ...badgeBase, background: "#fdecc8", color: "#7a5a12" };
const doneBadgeStyle: React.CSSProperties = { ...badgeBase, background: "#d8f0dd", color: "#1f6b34" };
const approvedBadgeStyle: React.CSSProperties = { ...badgeBase, background: "#fdecc8", color: "#7a5a12" };
const finishButtonStyle: React.CSSProperties = { minHeight: 36, padding: "6px 14px", borderRadius: 999, border: "1px solid #1f6b34", background: "#e3f5e8", color: "#1f6b34", fontWeight: 800, fontSize: 14, cursor: "pointer" };
const paidBadgeStyle: React.CSSProperties = { ...badgeBase, background: "#dbe7fb", color: "#1d4ea0" };
