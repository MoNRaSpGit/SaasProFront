import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getStoredUser } from "../auth/auth.client";
import {
  createPosPayment,
  createPosSale,
  getPosDashboard,
  listPosPayments,
  listPosSales,
  lookupPosProductByBarcodeOrSku
} from "./pos.client";
import { PosCartItem, PosDashboard, PosPayment, PosSale } from "./pos.types";

type PosView = "scanner" | "panel";

export function PosHomePage() {
  const user = getStoredUser();
  const tenantName = user?.tenantContext?.tenant.name || "Tenant sin nombre";
  const modules = user?.tenantContext?.modules || [];
  const [activeView, setActiveView] = useState<PosView>("scanner");
  const [scanValue, setScanValue] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [panelLoading, setPanelLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [recentSales, setRecentSales] = useState<PosSale[]>([]);
  const [recentPayments, setRecentPayments] = useState<PosPayment[]>([]);
  const [dashboard, setDashboard] = useState<PosDashboard | null>(null);
  const scanInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (activeView === "scanner") {
      scanInputRef.current?.focus();
    }
  }, [activeView]);

  useEffect(() => {
    let cancelled = false;

    async function loadPanelData() {
      setPanelLoading(true);
      try {
        const [salesPayload, paymentsPayload, dashboardPayload] = await Promise.all([
          listPosSales(5),
          listPosPayments(5),
          getPosDashboard({ movementLimit: 8, rankingLimit: 5 })
        ]);

        if (!cancelled) {
          setRecentSales(salesPayload.items);
          setRecentPayments(paymentsPayload.items);
          setDashboard(dashboardPayload);
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "No se pudieron cargar los datos del panel");
        }
      } finally {
        if (!cancelled) {
          setPanelLoading(false);
        }
      }
    }

    void loadPanelData();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalAmount = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  function showStatus(nextStatus: string) {
    setStatus(nextStatus);
  }

  async function refreshPanelData() {
    const [salesPayload, paymentsPayload, dashboardPayload] = await Promise.all([
      listPosSales(5),
      listPosPayments(5),
      getPosDashboard({ movementLimit: 8, rankingLimit: 5 })
    ]);

    setRecentSales(salesPayload.items);
    setRecentPayments(paymentsPayload.items);
    setDashboard(dashboardPayload);
  }

  function upsertCartItem(nextItem: Omit<PosCartItem, "id" | "quantity"> & { quantity?: number }) {
    setCart((currentCart) => {
      const existingIndex = currentCart.findIndex((item) =>
        nextItem.productId ? item.productId === nextItem.productId : item.isManual && item.name === nextItem.name
      );

      if (existingIndex >= 0) {
        return currentCart.map((item, index) =>
          index === existingIndex
            ? {
                ...item,
                quantity: item.quantity + (nextItem.quantity ?? 1)
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          id: `${nextItem.productId ?? "manual"}-${crypto.randomUUID()}`,
          quantity: nextItem.quantity ?? 1,
          ...nextItem
        }
      ];
    });
  }

  async function handleLookupSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = scanValue.trim();
    if (!value) {
      showStatus("Ingresa un barcode o SKU para buscar");
      return;
    }

    setLookupLoading(true);
    setStatus(null);

    try {
      const payload = await lookupPosProductByBarcodeOrSku(value);

      if (!payload.found || !payload.item) {
        showStatus(`No se encontro producto para "${value}"`);
        return;
      }

      upsertCartItem({
        productId: payload.item.id,
        isManual: false,
        name: payload.item.name,
        unitPrice: payload.item.salePrice,
        barcode: payload.item.barcode,
        sku: payload.item.sku,
        imageUrl: payload.item.imageUrl
      });
      setScanValue("");
      showStatus(`Producto agregado: ${payload.item.name}`);
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "Error en lookup de producto");
    } finally {
      setLookupLoading(false);
      scanInputRef.current?.focus();
    }
  }

  function handleAddManualItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = manualName.trim();
    const price = Number(manualPrice);

    if (!name) {
      showStatus("El producto manual necesita nombre");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      showStatus("El precio manual debe ser mayor a cero");
      return;
    }

    upsertCartItem({
      productId: null,
      isManual: true,
      name,
      unitPrice: Number(price.toFixed(2)),
      barcode: null,
      sku: null,
      imageUrl: null
    });

    setManualName("");
    setManualPrice("");
    showStatus(`Producto manual agregado: ${name}`);
    scanInputRef.current?.focus();
  }

  function updateItemQuantity(itemId: string, delta: number) {
    setCart((currentCart) =>
      currentCart
        .map((item) => (item.id === itemId ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  }

  function removeItem(itemId: string) {
    setCart((currentCart) => currentCart.filter((item) => item.id !== itemId));
  }

  async function handleCheckout() {
    if (cart.length === 0) {
      showStatus("Agrega productos antes de confirmar la venta");
      return;
    }

    setCheckoutLoading(true);
    setStatus(null);

    try {
      const payload = await createPosSale({
        externalId: `sale-${Date.now()}`,
        notes: notes.trim() || undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          isManual: item.isManual,
          name: item.name,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          barcode: item.barcode,
          sku: item.sku,
          imageUrl: item.imageUrl
        }))
      });

      setCart([]);
      setNotes("");
      await refreshPanelData();
      showStatus(`Venta confirmada por ${payload.sale.totalAmount.toFixed(2)}`);
      setActiveView("panel");
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "No se pudo confirmar la venta");
    } finally {
      setCheckoutLoading(false);
      scanInputRef.current?.focus();
    }
  }

  async function handleCreatePayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showStatus("El monto del pago debe ser mayor a cero");
      return;
    }

    setPaymentLoading(true);
    setStatus(null);

    try {
      const payload = await createPosPayment({
        externalId: `payment-${Date.now()}`,
        amount: Number(amount.toFixed(2)),
        description: paymentDescription.trim() || undefined
      });

      setPaymentAmount("");
      setPaymentDescription("");
      await refreshPanelData();
      showStatus(`Pago registrado por ${payload.payment.amount.toFixed(2)}`);
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "No se pudo registrar el pago");
    } finally {
      setPaymentLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "28px 16px 48px",
        fontFamily: "system-ui, sans-serif",
        background:
          "radial-gradient(circle at top left, rgba(242,230,204,0.8), transparent 28%), linear-gradient(180deg, #f6f1e8 0%, #f3f7fb 100%)"
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header
          style={{
            padding: "18px 20px",
            borderRadius: 24,
            background: "#18222f",
            color: "#f7f3eb",
            boxShadow: "0 20px 50px rgba(24, 34, 47, 0.18)"
          }}
        >
          <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.72 }}>
            SaaS POS
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 16,
              flexWrap: "wrap",
              marginTop: 8
            }}
          >
            <div>
              <h1 style={{ margin: 0, fontSize: 34 }}>Caja Operativa</h1>
              <p style={{ margin: "6px 0 0", opacity: 0.82 }}>
                Tenant activo: <strong>{tenantName}</strong> · Modulos: {modules.join(", ") || "Ninguno"}
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setActiveView("scanner")}
                style={tabButtonStyle(activeView === "scanner")}
              >
                Scanner
              </button>
              <button
                type="button"
                onClick={() => setActiveView("panel")}
                style={tabButtonStyle(activeView === "panel")}
              >
                Panel
              </button>
              <Link to="/dashboard" style={{ ...tabButtonStyle(false), textDecoration: "none" }}>
                Volver
              </Link>
            </div>
          </div>
        </header>

        {status ? (
          <div
            style={{
              marginTop: 18,
              padding: "12px 14px",
              borderRadius: 16,
              background: "#edf7ea",
              color: "#1d4024",
              border: "1px solid #cfe5d0"
            }}
          >
            {status}
          </div>
        ) : null}

        {activeView === "scanner" ? (
          <section
            style={{
              marginTop: 20,
              display: "grid",
              gap: 20,
              gridTemplateColumns: "minmax(0, 1.2fr) minmax(340px, 0.8fr)"
            }}
          >
            <div
              style={{
                padding: 22,
                borderRadius: 24,
                background: "#fff8ef",
                border: "1px solid #ead8ba",
                boxShadow: "0 16px 40px rgba(116, 89, 39, 0.08)"
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 8 }}>Ingreso por scanner</h2>
              <p style={{ marginTop: 0, color: "#705b3c" }}>
                Busca por barcode o SKU y mantene el flujo rapido de caja.
              </p>

              <form onSubmit={handleLookupSubmit} style={{ display: "grid", gap: 12 }}>
                <input
                  ref={scanInputRef}
                  type="text"
                  value={scanValue}
                  onChange={(event) => setScanValue(event.target.value)}
                  placeholder="Escanea aqui"
                  style={inputStyle}
                />
                <button type="submit" disabled={lookupLoading} style={primaryButtonStyle}>
                  {lookupLoading ? "Buscando..." : "Agregar producto"}
                </button>
              </form>

              <div
                style={{
                  marginTop: 22,
                  paddingTop: 18,
                  borderTop: "1px dashed #ddc79f"
                }}
              >
                <h3 style={{ marginTop: 0, marginBottom: 8 }}>Producto manual</h3>
                <form onSubmit={handleAddManualItem} style={{ display: "grid", gap: 12 }}>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(event) => setManualName(event.target.value)}
                    placeholder="Nombre del producto manual"
                    style={inputStyle}
                  />
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={manualPrice}
                    onChange={(event) => setManualPrice(event.target.value)}
                    placeholder="Precio"
                    style={inputStyle}
                  />
                  <button type="submit" style={secondaryButtonStyle}>
                    Agregar manual
                  </button>
                </form>
              </div>
            </div>

            <aside
              style={{
                padding: 22,
                borderRadius: 24,
                background: "#ffffff",
                border: "1px solid #d9e0e7",
                boxShadow: "0 16px 40px rgba(24, 34, 47, 0.08)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <h2 style={{ margin: 0 }}>Ticket en vivo</h2>
                <span style={{ color: "#64707b" }}>{cart.length} lineas</span>
              </div>

              <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                {cart.length === 0 ? (
                  <div style={emptyBoxStyle}>El carrito esta vacio. Escanea o agrega una linea manual.</div>
                ) : null}
                {cart.map((item) => (
                  <article key={item.id} style={cartItemStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <strong>{item.name}</strong>
                        <p style={{ margin: "6px 0 0", color: "#66717c" }}>
                          {item.barcode || item.sku || (item.isManual ? "Manual" : "Catalogo")}
                        </p>
                      </div>
                      <strong>{(item.unitPrice * item.quantity).toFixed(2)}</strong>
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12
                      }}
                    >
                      <span>
                        {item.quantity} x {item.unitPrice.toFixed(2)}
                      </span>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button type="button" onClick={() => updateItemQuantity(item.id, 1)} style={tinyButtonStyle}>
                          +1
                        </button>
                        <button type="button" onClick={() => updateItemQuantity(item.id, -1)} style={tinyButtonStyle}>
                          -1
                        </button>
                        <button type="button" onClick={() => removeItem(item.id)} style={tinyDangerButtonStyle}>
                          Quitar
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <label style={{ display: "grid", gap: 6, marginTop: 16 }}>
                Notas de la venta
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Observaciones opcionales"
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </label>

              <div
                style={{
                  marginTop: 18,
                  padding: 16,
                  borderRadius: 18,
                  background: "#18222f",
                  color: "#f8f6f1"
                }}
              >
                <p style={{ margin: 0, opacity: 0.7 }}>Total actual</p>
                <strong style={{ fontSize: 32 }}>{totalAmount.toFixed(2)}</strong>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={checkoutLoading || cart.length === 0}
                style={{ ...primaryButtonStyle, marginTop: 16, width: "100%" }}
              >
                {checkoutLoading ? "Confirmando..." : "Confirmar venta"}
              </button>
            </aside>
          </section>
        ) : (
          <section style={{ marginTop: 20, display: "grid", gap: 20 }}>
            <div
              style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))"
              }}
            >
              <MetricCard label="Ventas" value={dashboard ? dashboard.metrics.salesTotal.toFixed(2) : "--"} />
              <MetricCard label="Pagos" value={dashboard ? dashboard.metrics.paymentsTotal.toFixed(2) : "--"} />
              <MetricCard label="Saldo" value={dashboard ? dashboard.metrics.balance.toFixed(2) : "--"} />
              <MetricCard label="Tickets" value={dashboard ? String(dashboard.metrics.ticketsCount) : "--"} />
              <MetricCard label="Items vendidos" value={dashboard ? String(dashboard.metrics.itemsSold) : "--"} />
            </div>

            <div
              style={{
                display: "grid",
                gap: 20,
                gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 0.9fr)"
              }}
            >
              <div
                style={{
                  padding: 22,
                  borderRadius: 24,
                  background: "#ffffff",
                  border: "1px solid #d9e0e7"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h2 style={{ margin: 0 }}>Movimientos recientes</h2>
                  {panelLoading ? <span style={{ color: "#6f7c88" }}>Cargando...</span> : null}
                </div>
                <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                  {dashboard?.movements.length ? null : <div style={emptyBoxStyle}>No hay movimientos todavia.</div>}
                  {dashboard?.movements.map((movement) => (
                    <article key={movement.id} style={movementCardStyle(movement.type === "payment")}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <strong>{movement.type === "sale" ? "Venta" : "Pago"}</strong>
                        <strong>{movement.amount.toFixed(2)}</strong>
                      </div>
                      <p style={{ margin: "8px 0 0", color: "#63717d" }}>
                        {movement.type === "sale"
                          ? `${movement.detail.itemsCount || 0} items · ${movement.detail.notes || "Sin notas"}`
                          : movement.detail.description || "Sin descripcion"}
                      </p>
                    </article>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gap: 20 }}>
                <div
                  style={{
                    padding: 22,
                    borderRadius: 24,
                    background: "#fff8ef",
                    border: "1px solid #ead8ba"
                  }}
                >
                  <h2 style={{ marginTop: 0 }}>Registrar pago</h2>
                  <form onSubmit={handleCreatePayment} style={{ display: "grid", gap: 12 }}>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(event) => setPaymentAmount(event.target.value)}
                      placeholder="Monto"
                      style={inputStyle}
                    />
                    <input
                      type="text"
                      value={paymentDescription}
                      onChange={(event) => setPaymentDescription(event.target.value)}
                      placeholder="Descripcion"
                      style={inputStyle}
                    />
                    <button type="submit" disabled={paymentLoading} style={secondaryButtonStyle}>
                      {paymentLoading ? "Registrando..." : "Guardar pago"}
                    </button>
                  </form>
                </div>

                <div
                  style={{
                    padding: 22,
                    borderRadius: 24,
                    background: "#ffffff",
                    border: "1px solid #d9e0e7"
                  }}
                >
                  <h2 style={{ marginTop: 0 }}>Ranking</h2>
                  <div style={{ display: "grid", gap: 10 }}>
                    {dashboard?.ranking.length ? null : <div style={emptyBoxStyle}>Sin ranking todavia.</div>}
                    {dashboard?.ranking.map((item, index) => (
                      <div key={`${item.name}-${index}`} style={rankingRowStyle}>
                        <span>{item.name}</span>
                        <strong>{item.qty}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gap: 20,
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))"
              }}
            >
              <section style={panelBoxStyle}>
                <h2 style={{ marginTop: 0 }}>Ventas recientes</h2>
                <div style={{ display: "grid", gap: 10 }}>
                  {recentSales.length === 0 ? <div style={emptyBoxStyle}>No hay ventas recientes.</div> : null}
                  {recentSales.map((sale) => (
                    <article key={sale.id} style={smallItemCardStyle}>
                      <strong>
                        Venta #{sale.id} · {sale.totalAmount.toFixed(2)}
                      </strong>
                      <p style={{ margin: "6px 0 0", color: "#66717c" }}>
                        {sale.itemsCount} items · {sale.notes || "Sin notas"}
                      </p>
                    </article>
                  ))}
                </div>
              </section>

              <section style={panelBoxStyle}>
                <h2 style={{ marginTop: 0 }}>Pagos recientes</h2>
                <div style={{ display: "grid", gap: 10 }}>
                  {recentPayments.length === 0 ? <div style={emptyBoxStyle}>No hay pagos recientes.</div> : null}
                  {recentPayments.map((payment) => (
                    <article key={payment.id} style={smallItemCardStyle}>
                      <strong>
                        Pago #{payment.id} · {payment.amount.toFixed(2)}
                      </strong>
                      <p style={{ margin: "6px 0 0", color: "#66717c" }}>
                        {payment.description || "Sin descripcion"}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article
      style={{
        padding: 18,
        borderRadius: 20,
        background: "#ffffff",
        border: "1px solid #d9e0e7",
        boxShadow: "0 14px 36px rgba(24, 34, 47, 0.05)"
      }}
    >
      <p style={{ margin: 0, color: "#66717c", textTransform: "uppercase", fontSize: 12, letterSpacing: "0.08em" }}>
        {label}
      </p>
      <strong style={{ display: "block", marginTop: 8, fontSize: 30 }}>{value}</strong>
    </article>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 13,
  borderRadius: 14,
  border: "1px solid #cfced1",
  background: "#ffffff",
  fontSize: 15
};

const primaryButtonStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 14,
  border: "none",
  background: "#18222f",
  color: "#f8f6f1",
  fontWeight: 700,
  cursor: "pointer"
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 14,
  border: "1px solid #b58d48",
  background: "#cda560",
  color: "#24190a",
  fontWeight: 700,
  cursor: "pointer"
};

const tinyButtonStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid #cfd6dd",
  background: "#f6f8fa",
  cursor: "pointer"
};

const tinyDangerButtonStyle: React.CSSProperties = {
  ...tinyButtonStyle,
  border: "1px solid #e4c4c4",
  background: "#fff1f1"
};

const emptyBoxStyle: React.CSSProperties = {
  padding: 16,
  borderRadius: 16,
  background: "#f6f7f8",
  color: "#66717c",
  border: "1px dashed #cfd6dd"
};

const cartItemStyle: React.CSSProperties = {
  border: "1px solid #e4e7ea",
  borderRadius: 16,
  padding: 14,
  background: "#ffffff"
};

const panelBoxStyle: React.CSSProperties = {
  padding: 22,
  borderRadius: 24,
  background: "#ffffff",
  border: "1px solid #d9e0e7"
};

const smallItemCardStyle: React.CSSProperties = {
  border: "1px solid #e4e7ea",
  borderRadius: 16,
  padding: 14,
  background: "#ffffff"
};

function movementCardStyle(isPayment: boolean): React.CSSProperties {
  return {
    border: `1px solid ${isPayment ? "#f1d1d1" : "#d3e1f2"}`,
    borderRadius: 16,
    padding: 14,
    background: isPayment ? "#fff7f7" : "#f7fbff"
  };
}

const rankingRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "12px 14px",
  borderRadius: 14,
  background: "#f6f7f8"
};

function tabButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 999,
    border: active ? "1px solid #f3d49b" : "1px solid rgba(255,255,255,0.22)",
    background: active ? "#f1d39a" : "transparent",
    color: active ? "#2d2110" : "#f7f3eb",
    fontWeight: 700,
    cursor: "pointer"
  };
}
