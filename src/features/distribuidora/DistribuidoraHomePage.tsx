import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import urretaCompanyLogo from "../../assets/urreta-company.webp";
import {
  ensureDistribuidoraSeedData,
  getDistribuidoraClients,
  getDistribuidoraProducts,
  saveDistribuidoraOrder
} from "./distribuidora.storage";
import { DistribuidoraClient, DistribuidoraOrderItem, DistribuidoraProduct } from "./distribuidora.types";

type DistribuidoraStep = "client" | "order";

type DraftItem = DistribuidoraOrderItem & {
  id: string;
};

export function DistribuidoraHomePage() {
  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window === "undefined" ? 1280 : window.innerWidth
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [step, setStep] = useState<DistribuidoraStep>("client");
  const [clients, setClients] = useState<DistribuidoraClient[]>([]);
  const [products, setProducts] = useState<DistribuidoraProduct[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<DistribuidoraClient | null>(null);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const clientInputRef = useRef<HTMLInputElement | null>(null);
  const productInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    ensureDistribuidoraSeedData();
    setClients(getDistribuidoraClients());
    setProducts(getDistribuidoraProducts());
  }, []);

  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (step === "client") {
      clientInputRef.current?.focus();
    } else {
      productInputRef.current?.focus();
    }
  }, [step]);

  useEffect(() => {
    if (windowWidth > 720) {
      setMobileMenuOpen(false);
    }
  }, [windowWidth]);

  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();
    if (!query) {
      return clients;
    }

    return clients.filter((client) =>
      `${client.name} ${client.address} ${client.zone}`.toLowerCase().includes(query)
    );
  }, [clientSearch, clients]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) {
      return products;
    }

    return products.filter((product) => product.name.toLowerCase().includes(query));
  }, [productSearch, products]);

  const totalAmount = draftItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const isMobile = windowWidth <= 720;

  const selectedProductIds = useMemo(() => new Set(draftItems.map((item) => item.productId)), [draftItems]);

  function goToOrder(client: DistribuidoraClient) {
    setSelectedClient(client);
    setStep("order");
    setStatus(null);
    setMobileMenuOpen(false);
  }

  function addProduct(product: DistribuidoraProduct) {
    setDraftItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.productId === product.id);
      if (existingItem) {
        return currentItems.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [
        ...currentItems,
        {
          id: `${product.id}-${crypto.randomUUID()}`,
          productId: product.id,
          productName: product.name,
          unitPrice: product.price,
          quantity: 1
        }
      ];
    });

    setProductSearch("");
    setStatus(`Producto agregado: ${product.name}`);
    productInputRef.current?.focus();
  }

  function changeQuantity(itemId: string, delta: number) {
    setDraftItems((currentItems) =>
      currentItems
        .map((item) => (item.id === itemId ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  }

  function removeDraftItem(itemId: string) {
    const item = draftItems.find((draftItem) => draftItem.id === itemId);
    changeQuantity(itemId, -1);
    if (item) {
      toast.info(`Descontaste una unidad de ${item.productName}`);
    }
  }

  function clearDraft(options?: { silent?: boolean }) {
    setDraftItems([]);
    setNotes("");
    setProductSearch("");
    setStatus(null);
    if (!options?.silent) {
      toast.info("Pedido limpiado");
    }
  }

  function goBackToClients() {
    setStep("client");
    setSelectedClient(null);
    clearDraft({ silent: true });
  }

  function saveOrder() {
    if (!selectedClient) {
      setStatus("Primero selecciona un cliente");
      toast.error("Primero selecciona un cliente");
      return;
    }

    if (draftItems.length === 0) {
      setStatus("Agrega al menos un producto al pedido");
      toast.error("Agrega al menos un producto al pedido");
      return;
    }

    saveDistribuidoraOrder({
      id: `dist-order-${Date.now()}`,
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      createdAt: new Date().toISOString(),
      notes: notes.trim() || null,
      items: draftItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity
      })),
      totalAmount: Number(totalAmount.toFixed(2))
    });

    setStatus(`Pedido guardado para ${selectedClient.name}`);
    toast.success(`Pedido guardado para ${selectedClient.name}`);
    setStep("client");
    setSelectedClient(null);
    setClientSearch("");
    clearDraft({ silent: true });
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: isMobile ? "14px 10px 30px" : "22px 12px 40px",
        fontFamily: "system-ui, sans-serif",
        background:
          "radial-gradient(circle at top right, rgba(209, 229, 247, 0.82), transparent 24%), linear-gradient(180deg, #f4f8fc 0%, #f7fbff 100%)"
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <header
          style={{
            padding: isMobile ? "16px 14px 16px" : "18px 18px 20px",
            borderRadius: 24,
            background: "#153047",
            color: "#f5f9fc",
            boxShadow: "0 20px 50px rgba(21, 48, 71, 0.18)"
          }}
        >
          <p style={{ margin: 0, opacity: 0.72, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.14em" }}>
            Modelo Distribuidora
          </p>
          <div
            style={{
              marginTop: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: isMobile ? "flex-start" : "flex-end",
              gap: 14,
              flexWrap: "wrap"
            }}
          >
              <div style={brandWrapStyle}>
                <div style={brandLogoFrameStyle}>
                  <img src={urretaCompanyLogo} alt="Urreta Company" style={brandLogoStyle} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h1 style={{ margin: 0, fontSize: isMobile ? 24 : 30, lineHeight: 1.1 }}>Urreta Company</h1>
                  <p style={{ margin: "6px 0 0", opacity: 0.78, fontSize: isMobile ? 13 : 15 }}>
                    Pensada para acompanar tu dia
                  </p>
                </div>
              </div>
            {isMobile ? (
              <div style={{ width: "100%" }}>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((current) => !current)}
                  style={mobileMenuButtonStyle}
                >
                  Menu
                </button>
                {mobileMenuOpen ? (
                  <div style={mobileMenuPanelStyle}>
                    <Link to="/distribuidora/admin" style={mobileHeaderLinkStyle} onClick={() => setMobileMenuOpen(false)}>
                      Ver admin
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link to="/distribuidora/admin" style={headerLinkStyle}>
                  Ver admin
                </Link>
              </div>
            )}
          </div>
        </header>

        {!isMobile ? (
          <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <StepBadge active={step === "client"} label="1. Buscar cliente" />
            <StepBadge active={step === "order"} label="2. Cargar pedido" />
            <StepBadge active={false} label="3. Admin simulado" />
          </div>
        ) : null}

        {step === "client" ? (
          <section style={{ ...bigPanelStyle, padding: isMobile ? 14 : 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: isMobile ? 24 : 28 }}>Buscar cliente</h2>
                <p style={{ margin: "8px 0 0", color: "#5b6a78" }}>
                  Toca el botón grande, escribe el nombre y elegí el cliente para seguir.
                </p>
              </div>
              <button
                type="button"
                onClick={() => clientInputRef.current?.focus()}
                style={{ ...focusButtonStyle, width: isMobile ? "100%" : "auto" }}
              >
                Buscar cliente
              </button>
            </div>

            <div style={{ marginTop: 18 }}>
              <input
                ref={clientInputRef}
                type="text"
                value={clientSearch}
                onChange={(event) => setClientSearch(event.target.value)}
                placeholder="Escribe el nombre del cliente..."
                style={largeInputStyle}
              />
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
              {filteredClients.length === 0 ? (
                <div style={emptyStyle}>No encontramos clientes para esa búsqueda.</div>
              ) : null}
              {filteredClients.map((client) => (
                <button key={client.id} type="button" onClick={() => goToOrder(client)} style={clientResultStyle}>
                  <strong style={{ fontSize: 18 }}>{client.name}</strong>
                  <span>{client.address}</span>
                  <span>{client.zone}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {step === "order" && selectedClient ? (
          <section
            style={{
              marginTop: 18,
              display: "grid",
              gap: 16
            }}
          >
            <div style={{ ...bigPanelStyle, padding: isMobile ? 14 : 18 }}>
              <div style={clientSummaryStyle}>
                <div>
                  <h2 style={{ margin: 0, fontSize: isMobile ? 22 : 26 }}>{selectedClient.name}</h2>
                  <p style={{ margin: 0, color: "#556573" }}>
                    {selectedClient.address} - {selectedClient.zone}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={goBackToClients}
                  style={{ ...outlineButtonStyle, width: isMobile ? "100%" : "auto" }}
                >
                  Cambiar cliente
                </button>
              </div>

              <div style={{ marginTop: 16 }}>
                <input
                  ref={productInputRef}
                  type="text"
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="buscar producto"
                  style={largeInputStyle}
                />
              </div>

              <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                {filteredProducts.length === 0 ? (
                  <div style={emptyStyle}>No encontramos productos para esa busqueda.</div>
                ) : null}
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product)}
                    style={selectedProductIds.has(product.id) ? selectedProductResultStyle : productResultStyle}
                  >
                    <div>
                      <strong style={{ fontSize: 17 }}>{product.name}</strong>
                      <p style={{ margin: "6px 0 0", color: "#62717f" }}>
                        {product.unitLabel} - {product.price.toFixed(2)}
                      </p>
                    </div>
                    <span style={selectedProductIds.has(product.id) ? selectedPillStyle : pillStyle}>
                      {selectedProductIds.has(product.id) ? "Agregado" : "Seleccionar"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ ...pedidoPanelStyle, padding: isMobile ? 14 : 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <h3 style={{ margin: 0, fontSize: 24, color: "#153047" }}>Pedido actual</h3>
                <span style={pedidoBadgeStyle}>{draftItems.length} items</span>
              </div>

              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {draftItems.length === 0 ? <div style={emptyStyle}>Todavia no cargaste productos.</div> : null}
                {draftItems.map((item) => (
                  <article key={item.id} style={orderItemStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.id, 1)}
                        style={orderItemNameButtonStyle}
                      >
                        <strong style={{ fontSize: 17 }}>{item.productName}</strong>
                        <span style={{ color: "#5c6c79", fontSize: 14 }}>
                          {item.quantity} x ${item.unitPrice.toFixed(2)}
                        </span>
                      </button>
                      <div style={orderItemActionsStyle}>
                        <strong style={orderItemDeltaStyle}>+${(item.quantity * item.unitPrice).toFixed(2)}</strong>
                        <button
                          type="button"
                          onClick={() => removeDraftItem(item.id)}
                          aria-label={`Descontar ${item.productName}`}
                          style={removeItemButtonStyle}
                        >
                          X
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <label style={{ display: "grid", gap: 6, marginTop: 12 }}>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="Notas del pedido"
                  style={{ ...inputBaseStyle, resize: "vertical" }}
                />
              </label>

              <div style={totalBoxStyle}>
                <p style={{ margin: 0, opacity: 0.72 }}>Total pedido</p>
                <strong style={{ fontSize: 30 }}>{totalAmount.toFixed(2)}</strong>
              </div>

              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                <button type="button" onClick={saveOrder} style={saveButtonStyle}>
                  Enviar pedido
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function StepBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      style={{
        padding: "10px 14px",
        borderRadius: 999,
        border: active ? "1px solid #0f7fc7" : "1px solid #d7dfe7",
        background: active ? "#eaf4ff" : "#ffffff",
        color: active ? "#134a74" : "#64707b",
        fontWeight: 700
      }}
    >
      {label}
    </span>
  );
}

const headerLinkStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.18)",
  color: "#f4f7fb",
  textDecoration: "none",
  fontWeight: 700
};

const mobileMenuButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.08)",
  color: "#f4f7fb",
  fontWeight: 800,
  textAlign: "left",
  cursor: "pointer"
};

const mobileMenuPanelStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  marginTop: 10
};

const mobileHeaderLinkStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "12px 14px",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.08)",
  color: "#f4f7fb",
  textDecoration: "none",
  fontWeight: 700,
  boxSizing: "border-box"
};

const brandWrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  minWidth: 0
};

const brandLogoFrameStyle: React.CSSProperties = {
  width: 66,
  height: 66,
  flexShrink: 0,
  borderRadius: 20,
  padding: 6,
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)"
};

const brandLogoStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  borderRadius: 14,
  display: "block"
};

const bigPanelStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 24,
  background: "#ffffff",
  border: "1px solid #dbe4ec",
  boxShadow: "0 18px 40px rgba(39, 76, 119, 0.08)"
};

const inputBaseStyle: React.CSSProperties = {
  width: "100%",
  padding: 13,
  borderRadius: 16,
  border: "1px solid #d2dae3",
  background: "#fbfdff",
  fontSize: 16,
  boxSizing: "border-box"
};

const largeInputStyle: React.CSSProperties = {
  ...inputBaseStyle,
  minHeight: 56,
  fontSize: 18
};

const focusButtonStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderRadius: 16,
  border: "none",
  background: "#153047",
  color: "#f6fbff",
  fontWeight: 800,
  boxSizing: "border-box",
  cursor: "pointer"
};

const clientResultStyle: React.CSSProperties = {
  display: "grid",
  gap: 5,
  width: "100%",
  textAlign: "left",
  padding: 16,
  borderRadius: 18,
  border: "1px solid #d8e2ec",
  background: "#fafdff",
  boxSizing: "border-box",
  cursor: "pointer"
};

const productResultStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  width: "100%",
  textAlign: "left",
  padding: 16,
  borderRadius: 18,
  border: "1px solid #d8e2ec",
  background: "#fcfdff",
  boxSizing: "border-box",
  cursor: "pointer"
};

const selectedProductResultStyle: React.CSSProperties = {
  ...productResultStyle,
  border: "1px solid #9dc9b0",
  background: "linear-gradient(180deg, #f5fbf7 0%, #edf7f0 100%)",
  boxShadow: "0 10px 24px rgba(35, 96, 61, 0.08)"
};

const clientSummaryStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap",
  padding: 16,
  borderRadius: 20,
  background: "#eef5fb",
  border: "1px solid #d5e2ef"
};

const pedidoPanelStyle: React.CSSProperties = {
  ...bigPanelStyle,
  border: "1px solid #bcd1e3",
  background: "linear-gradient(180deg, #f8fbff 0%, #eef5fb 100%)",
  boxShadow: "0 22px 44px rgba(21, 48, 71, 0.12)"
};

const pedidoBadgeStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  background: "#153047",
  color: "#f5f9fc",
  fontSize: 13,
  fontWeight: 700
};

const outlineButtonStyle: React.CSSProperties = {
  padding: "13px 16px",
  borderRadius: 16,
  border: "1px solid #153047",
  background: "linear-gradient(180deg, #214768 0%, #153047 100%)",
  color: "#f4f8fb",
  fontWeight: 800,
  boxShadow: "0 14px 28px rgba(21, 48, 71, 0.2)",
  boxSizing: "border-box",
  cursor: "pointer"
};

const outlineButtonWideStyle: React.CSSProperties = {
  ...outlineButtonStyle,
  width: "100%"
};

const orderItemStyle: React.CSSProperties = {
  padding: 16,
  borderRadius: 20,
  border: "1px solid #c9d9e8",
  background: "linear-gradient(180deg, #ffffff 0%, #f2f8fd 100%)",
  boxShadow: "0 14px 28px rgba(21, 48, 71, 0.08)"
};

const orderItemNameButtonStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  flex: 1,
  minWidth: 0,
  padding: 0,
  border: "none",
  background: "transparent",
  textAlign: "left",
  cursor: "pointer"
};

const orderItemActionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 10,
  flexShrink: 0
};

const orderItemDeltaStyle: React.CSSProperties = {
  fontSize: 20,
  color: "#23603d",
  fontWeight: 800,
  letterSpacing: "-0.02em"
};

const removeItemButtonStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 999,
  border: "1px solid #d5dfe8",
  background: "#ffffff",
  color: "#7a2230",
  fontWeight: 800,
  lineHeight: 1,
  cursor: "pointer"
};

const totalBoxStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 16,
  borderRadius: 18,
  background: "#153047",
  color: "#f7fbff"
};

const saveButtonStyle: React.CSSProperties = {
  padding: 15,
  borderRadius: 16,
  border: "none",
  background: "#0f7e62",
  color: "#f6fffb",
  fontWeight: 800,
  cursor: "pointer"
};

const emptyStyle: React.CSSProperties = {
  padding: 16,
  borderRadius: 16,
  border: "1px dashed #d4dbe2",
  color: "#5f6f7d",
  background: "#f8fbfd"
};

const pillStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  background: "#eaf4ff",
  color: "#1b5b89",
  fontWeight: 700
};

const selectedPillStyle: React.CSSProperties = {
  ...pillStyle,
  background: "#dcefe2",
  color: "#24513a"
};
