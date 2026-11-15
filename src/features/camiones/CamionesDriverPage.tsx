import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ModelUserMenu } from "../../shared/components/ModelUserMenu";
import { listCamionesClients, listCamionesPlaces, listMyCamionesTrips, submitCamionesDriverTrip } from "./camiones.client";
import type { CamionesClient, CamionesPlace, CamionesTrip, CamionesTruck } from "./camiones.types";

// Pantalla del CAMIONERO (14/11/2026): carga el viaje (camion, zorra, cliente,
// origen y destino) y nada mas. No ve valores ni el resto de la app: el
// administrador (La Milagrosa) recibe el viaje y le pone km y valor.

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}-${`${now.getDate()}`.padStart(2, "0")}`;
}

function dateLabel(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function readNote(notes: string | null, prefix: string) {
  const token = (notes ?? "").split("||").find((item) => item.trim().startsWith(prefix));
  return token ? token.trim().slice(prefix.length).trim() : "";
}

export function CamionesDriverPage() {
  const [clients, setClients] = useState<CamionesClient[]>([]);
  const [places, setPlaces] = useState<CamionesPlace[]>([]);
  const [myTrips, setMyTrips] = useState<CamionesTrip[]>([]);
  const [truck, setTruck] = useState<CamionesTruck | "">("");
  const [withTrailer, setWithTrailer] = useState<boolean | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [client, setClient] = useState<CamionesClient | null>(null);
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
      .catch(() => toast.error("No se pudieron cargar los clientes"));
    void listCamionesPlaces({ limit: 100 })
      .then((payload) => setPlaces(payload.items))
      .catch(() => undefined);
    void loadMine();
  }, [loadMine]);

  const matches = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();
    if (!query) return clients.slice(0, 6);
    return clients.filter((item) => item.name.toLowerCase().includes(query)).slice(0, 8);
  }, [clientSearch, clients]);

  async function handleSend() {
    if (!truck) return toast.error("Elegí el camión");
    if (withTrailer === null) return toast.error("Decí si fue con zorra o sin zorra");
    if (!client) return toast.error("Elegí el cliente");
    if (!fromPlace.trim()) return toast.error("Falta de dónde sale");
    if (!toPlace.trim()) return toast.error("Falta el destino");

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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar el viaje");
    } finally {
      setSending(false);
    }
  }

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 14 }}>
        <header style={heroStyle}>
          <p style={{ margin: 0, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", opacity: 0.8 }}>Camioneros</p>
          <ModelUserMenu variant="dark" showDashboardLink={false} />
        </header>

        <section style={cardStyle}>
          <h2 style={titleStyle}>Cargar viaje</h2>

          <label style={labelStyle}>Camión</label>
          <div style={rowStyle}>
            <button type="button" onClick={() => setTruck("mercedes")} style={truck === "mercedes" ? choiceOnStyle : choiceStyle}>
              Mercedes
            </button>
            <button type="button" onClick={() => setTruck("volkswagen")} style={truck === "volkswagen" ? choiceOnStyle : choiceStyle}>
              Volkswagen
            </button>
          </div>

          <label style={labelStyle}>¿Con zorra?</label>
          <div style={rowStyle}>
            <button type="button" onClick={() => setWithTrailer(true)} style={withTrailer === true ? choiceOnStyle : choiceStyle}>
              Con zorra
            </button>
            <button type="button" onClick={() => setWithTrailer(false)} style={withTrailer === false ? choiceOnStyle : choiceStyle}>
              Sin zorra
            </button>
          </div>

          <label style={labelStyle}>Cliente</label>
          {client ? (
            <div style={selectedStyle}>
              <strong>{client.name}</strong>
              <button type="button" onClick={() => setClient(null)} style={linkButtonStyle}>
                Cambiar
              </button>
            </div>
          ) : (
            <>
              <input style={inputStyle} value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} placeholder="Buscar cliente…" />
              <div style={{ display: "grid", gap: 6 }}>
                {matches.map((item) => (
                  <button key={item.id} type="button" onClick={() => setClient(item)} style={clientButtonStyle}>
                    {item.name}
                  </button>
                ))}
                {matches.length === 0 ? (
                  <span style={{ color: "#68594f", fontSize: 14 }}>No hay clientes con ese nombre. Avisale al administrador.</span>
                ) : null}
              </div>
            </>
          )}

          <label style={labelStyle}>De dónde sale</label>
          <input style={inputStyle} list="driver-places" value={fromPlace} onChange={(event) => setFromPlace(event.target.value)} placeholder="Origen" maxLength={80} />
          <label style={labelStyle}>Destino</label>
          <input style={inputStyle} list="driver-places" value={toPlace} onChange={(event) => setToPlace(event.target.value)} placeholder="Destino" maxLength={120} />
          <datalist id="driver-places">
            {places.map((place) => (
              <option key={place.id} value={place.name} />
            ))}
          </datalist>

          <label style={labelStyle}>Fecha</label>
          <input style={inputStyle} type="date" value={tripDate} onChange={(event) => setTripDate(event.target.value)} />

          <label style={labelStyle}>Nota (opcional)</label>
          <input style={inputStyle} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ej: carga de piedra" maxLength={100} />

          <button type="button" onClick={() => void handleSend()} disabled={sending} style={sendStyle}>
            {sending ? "Enviando…" : "Enviar viaje"}
          </button>
        </section>

        <section style={cardStyle}>
          <h2 style={titleStyle}>Mis últimos viajes</h2>
          {myTrips.length === 0 ? (
            <span style={{ color: "#68594f" }}>Todavía no cargaste viajes.</span>
          ) : (
            myTrips.slice(0, 10).map((trip) => {
              const zorra = readNote(trip.notes, "zorra::");
              return (
                <div key={trip.id} style={tripRowStyle}>
                  <div>
                    <strong>{trip.clientName}</strong>
                    <div style={{ color: "#68594f", fontSize: 14 }}>
                      {readNote(trip.notes, "route-from::") || "?"} → {trip.place}
                    </div>
                    <div style={{ color: "#68594f", fontSize: 13 }}>
                      {dateLabel(trip.tripDate)} · {trip.truck === "mercedes" ? "Mercedes" : trip.truck === "volkswagen" ? "Volkswagen" : "—"}
                      {zorra === "si" ? " · con zorra" : zorra === "no" ? " · sin zorra" : ""}
                    </div>
                  </div>
                  <span style={trip.kilometers > 0 ? doneStyle : sentStyle}>{trip.kilometers > 0 ? "Valorado" : "Enviado"}</span>
                </div>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: "16px 14px 40px",
  fontFamily: "system-ui, sans-serif",
  background: "radial-gradient(circle at top left, rgba(254, 207, 121, 0.26), transparent 28%), linear-gradient(180deg, #f8f4ec 0%, #eee5d9 100%)"
};
const heroStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "14px 16px", borderRadius: 20, background: "#38281f", color: "#fbf5ec" };
const cardStyle: React.CSSProperties = { display: "grid", gap: 10, padding: 16, borderRadius: 22, background: "#fffdf9", border: "1px solid #ded3c6", boxShadow: "0 16px 34px rgba(73, 48, 34, 0.08)" };
const titleStyle: React.CSSProperties = { margin: 0, fontSize: 22, color: "#2f241e" };
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "#68594f", marginTop: 4 };
const rowStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 };
const choiceStyle: React.CSSProperties = { padding: "14px 10px", borderRadius: 14, border: "1px solid #d5c8b8", background: "#fff", color: "#2f241e", fontSize: 16, fontWeight: 600, cursor: "pointer" };
const choiceOnStyle: React.CSSProperties = { ...choiceStyle, background: "#38281f", color: "#fbf5ec", border: "1px solid #38281f" };
const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "13px 12px", borderRadius: 12, border: "1px solid #d5c8b8", background: "#fff", fontSize: 16, color: "#2f241e" };
const clientButtonStyle: React.CSSProperties = { textAlign: "left", padding: "12px", borderRadius: 12, border: "1px solid #e0d3c4", background: "#fffaf2", fontSize: 16, color: "#2f241e", cursor: "pointer" };
const selectedStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", borderRadius: 12, background: "#f7efe3", border: "1px solid #e0d3c4", color: "#2f241e" };
const linkButtonStyle: React.CSSProperties = { background: "transparent", border: "none", color: "#8a5a2b", fontWeight: 700, cursor: "pointer", fontSize: 14 };
const sendStyle: React.CSSProperties = { marginTop: 8, padding: "16px", borderRadius: 16, border: "none", background: "#38281f", color: "#fbf5ec", fontSize: 18, fontWeight: 700, cursor: "pointer" };
const tripRowStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, padding: "10px 0", borderTop: "1px solid #eadfd1" };
const sentStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: "#fdecc8", color: "#7a5a12" };
const doneStyle: React.CSSProperties = { ...sentStyle, background: "#d8f0dd", color: "#1f6b34" };
