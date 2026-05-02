import { Link } from "react-router-dom";
import { getDistribuidoraOrders } from "./distribuidora.storage";

export function DistribuidoraAdminPage() {
  const orders = getDistribuidoraOrders();
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "28px 16px 48px",
        fontFamily: "system-ui, sans-serif",
        background: "linear-gradient(180deg, #eef2f5 0%, #e7edf1 100%)"
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <header style={headerStyle}>
          <p style={eyebrowStyle}>Admin distribuidora</p>
          <div style={headerTopRowStyle}>
            <div>
              <h1 style={{ margin: 0, fontSize: 32 }}>Pedidos recibidos</h1>
              <p style={{ margin: "8px 0 0", color: "#adbac4" }}>
                Vista simple para revisar pedidos guardados.
              </p>
            </div>
            <div style={headerActionsStyle}>
              <Link to="/distribuidora" style={adminLinkStyle}>
                Volver a pedidos
              </Link>
              <Link to="/dashboard" style={adminLinkStyle}>
                Dashboard
              </Link>
            </div>
          </div>

          <div style={summaryRowStyle}>
            <span style={summaryChipStyle}>Pedidos: {orders.length}</span>
            <span style={summaryChipStyle}>Total: ${totalRevenue.toFixed(2)}</span>
          </div>
        </header>

        <section style={panelStyle}>
          {orders.length === 0 ? (
            <div style={emptyStyle}>Todavia no hay pedidos guardados.</div>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {orders.map((order, index) => (
                <article key={order.id} style={orderCardStyle}>
                  <div style={orderHeaderStyle}>
                    <div>
                      <div style={orderMetaStyle}>
                        <span style={orderNumberStyle}>Pedido #{orders.length - index}</span>
                        <span>{new Date(order.createdAt).toLocaleString()}</span>
                      </div>
                      <h2 style={orderClientStyle}>{order.clientName}</h2>
                    </div>
                    <strong style={orderTotalStyle}>${order.totalAmount.toFixed(2)}</strong>
                  </div>

                  <div style={orderInfoStripStyle}>
                    <span style={infoPillStyle}>{order.items.length} productos</span>
                    <span style={infoPillStyle}>
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)} unidades
                    </span>
                  </div>

                  <div style={itemsBlockStyle}>
                    <div style={itemsHeaderStyle}>
                      <strong style={{ color: "#22303a" }}>Detalle</strong>
                    </div>

                    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                    {order.items.map((item, itemIndex) => (
                      <div key={`${order.id}-${item.productId}-${itemIndex}`} style={itemRowStyle}>
                        <div>
                          <strong style={{ display: "block", color: "#1e2a33" }}>{item.productName}</strong>
                          <span style={{ color: "#64727c", fontSize: 13 }}>
                            {item.quantity} x ${item.unitPrice.toFixed(2)}
                          </span>
                        </div>
                        <strong style={itemTotalStyle}>${(item.quantity * item.unitPrice).toFixed(2)}</strong>
                      </div>
                    ))}
                    </div>
                  </div>

                  <div style={notesStyle}>
                    <strong style={{ display: "block", fontSize: 13, color: "#51606b" }}>Observaciones</strong>
                    <p style={{ margin: "6px 0 0", color: "#26333d" }}>{order.notes || "Sin notas"}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const headerStyle: React.CSSProperties = {
  padding: "20px 22px",
  borderRadius: 24,
  background: "#1f2a33",
  color: "#f6f8fa"
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  opacity: 0.72,
  fontSize: 12,
  letterSpacing: "0.14em",
  textTransform: "uppercase"
};

const headerTopRowStyle: React.CSSProperties = {
  marginTop: 10,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 16,
  flexWrap: "wrap"
};

const headerActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap"
};

const adminLinkStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.14)",
  color: "#f7fafc",
  textDecoration: "none",
  fontWeight: 700
};

const summaryRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 16
};

const summaryChipStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  background: "#2b3944",
  color: "#dfe7ec",
  fontSize: 13,
  fontWeight: 700
};

const panelStyle: React.CSSProperties = {
  marginTop: 20,
  padding: 18,
  borderRadius: 22,
  background: "#f7f9fb",
  border: "1px solid #d4dde4"
};

const orderCardStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 20,
  border: "1px solid #d6dee5",
  background: "#ffffff",
  boxShadow: "0 10px 24px rgba(32, 47, 61, 0.05)"
};

const orderHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap"
};

const orderMetaStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  fontSize: 13,
  color: "#62707a"
};

const orderNumberStyle: React.CSSProperties = {
  color: "#1f2a33",
  fontWeight: 700
};

const orderClientStyle: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: 22,
  color: "#17232c"
};

const orderTotalStyle: React.CSSProperties = {
  fontSize: 28,
  color: "#244e38",
  lineHeight: 1
};

const orderInfoStripStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 14
};

const infoPillStyle: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: 999,
  background: "#edf2f5",
  color: "#4c5e6b",
  fontSize: 12,
  fontWeight: 700
};

const itemsBlockStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 14,
  borderRadius: 16,
  background: "#f8fafb",
  border: "1px solid #e0e7ec"
};

const itemsHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const itemRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "10px 12px",
  borderRadius: 12,
  background: "#ffffff",
  border: "1px solid #e4ebf0"
};

const itemTotalStyle: React.CSSProperties = {
  color: "#244e38",
  fontWeight: 800,
  flexShrink: 0
};

const notesStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 14,
  borderRadius: 14,
  background: "#f3f6f8",
  border: "1px solid #e0e7ec"
};

const emptyStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 18,
  border: "1px dashed #c8d2da",
  color: "#5e6c77",
  background: "#fbfcfd"
};
