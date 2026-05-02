import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getStoredUser } from "../auth/auth.client";
import { BuildMetaCard } from "../../shared/components/BuildMetaCard";
import { getSaasAdminTenants, updateSaasAdminTenantBilling } from "./saas-admin.client";
import { SaasAdminTenantBilling, SaasAdminTenantItem } from "./saas-admin.types";

type BillingDrafts = Record<
  number,
  {
    billingStatus: SaasAdminTenantBilling["status"];
    paidUntil: string;
    graceUntil: string;
    blockedReason: string;
  }
>;

const STATUS_OPTIONS: SaasAdminTenantBilling["status"][] = [
  "active",
  "grace_period",
  "pending_manual_block",
  "blocked"
];

export function SaasAdminHomePage() {
  const user = useMemo(() => getStoredUser(), []);
  const [tenants, setTenants] = useState<SaasAdminTenantItem[]>([]);
  const [drafts, setDrafts] = useState<BillingDrafts>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingTenantId, setSavingTenantId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | SaasAdminTenantBilling["status"]>("all");

  useEffect(() => {
    void loadTenants();
  }, []);

  const filteredTenants =
    statusFilter === "all" ? tenants : tenants.filter((tenant) => tenant.billing.status === statusFilter);

  async function loadTenants() {
    setLoading(true);
    setError(null);

    try {
      const payload = await getSaasAdminTenants();
      setTenants(payload.items);
      setDrafts(
        Object.fromEntries(
          payload.items.map((tenant) => [
            tenant.id,
            {
              billingStatus: tenant.billing.status,
              paidUntil: toDateInputValue(tenant.billing.paidUntil),
              graceUntil: toDateInputValue(tenant.billing.graceUntil),
              blockedReason: tenant.billing.blockedReason || ""
            }
          ])
        )
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo cargar el panel interno");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(tenantId: number) {
    const draft = drafts[tenantId];
    if (!draft) {
      return;
    }

    setSavingTenantId(tenantId);
    setError(null);

    try {
      const updated = await updateSaasAdminTenantBilling(tenantId, {
        billingStatus: draft.billingStatus,
        paidUntil: emptyAsNull(draft.paidUntil),
        graceUntil: emptyAsNull(draft.graceUntil),
        blockedReason: emptyAsNull(draft.blockedReason)
      });

      setTenants((current) =>
        current.map((tenant) =>
          tenant.id === tenantId
            ? {
                ...tenant,
                billing: {
                  status: updated.billing.status as SaasAdminTenantBilling["status"],
                  paidUntil: updated.billing.paidUntil,
                  graceUntil: updated.billing.graceUntil,
                  blockedReason: updated.billing.blockedReason
                }
              }
            : tenant
        )
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo guardar el tenant");
    } finally {
      setSavingTenantId(null);
    }
  }

  function updateDraft(tenantId: number, patch: Partial<BillingDrafts[number]>) {
    setDrafts((current) => ({
      ...current,
      [tenantId]: {
        ...current[tenantId],
        ...patch
      }
    }));
  }

  return (
    <main style={pageStyle}>
      <section style={heroStyle}>
        <p style={eyebrowStyle}>SaaS Admin Lite</p>
        <h1 style={titleStyle}>Control interno de tenants</h1>
        <p style={bodyStyle}>
          Vista interna para revisar clientes, modulos habilitados y estado de cobro sin salir del SaaS.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          <Link to="/dashboard" style={linkButtonStyle(false)}>
            Volver al dashboard
          </Link>
          <span style={chipStyle}>Operador: {user?.email || "N/A"}</span>
        </div>
      </section>

      <section style={panelStyle}>
        <div style={toolbarStyle}>
          <div>
            <strong style={{ color: "#172433" }}>Tenants</strong>
            <p style={{ margin: "6px 0 0", color: "#66717c" }}>
              {loading ? "Cargando..." : `${filteredTenants.length} visibles de ${tenants.length}`}
            </p>
          </div>

          <label style={filterWrapStyle}>
            <span style={filterLabelStyle}>Filtrar por cobro</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              style={selectStyle}
            >
              <option value="all">Todos</option>
              <option value="active">Active</option>
              <option value="grace_period">Grace period</option>
              <option value="pending_manual_block">Pending manual block</option>
              <option value="blocked">Blocked</option>
            </select>
          </label>
        </div>

        {error ? <div style={errorBoxStyle}>{error}</div> : null}
        {loading ? <p style={mutedTextStyle}>Cargando tenants...</p> : null}

        <div style={gridStyle}>
          {filteredTenants.map((tenant) => {
            const draft = drafts[tenant.id];
            return (
              <article key={tenant.id} style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <strong style={{ fontSize: 18, color: "#172433" }}>{tenant.name}</strong>
                    <span style={mutedInlineStyle}>{tenant.slug}</span>
                  </div>
                  <span style={statusBadgeStyle(tenant.billing.status)}>{tenant.billing.status}</span>
                </div>

                <div style={metaGridStyle}>
                  <MetaLine label="Tenant status" value={tenant.status} />
                  <MetaLine label="Usuario base" value={tenant.primaryUser?.email || "Sin usuario"} />
                  <MetaLine label="Rol base" value={tenant.primaryUser?.membershipRole || "Sin membership"} />
                  <MetaLine label="Modulos" value={tenant.modules.join(", ") || "Ninguno"} />
                </div>

                <div style={formGridStyle}>
                  <label style={fieldWrapStyle}>
                    <span style={fieldLabelStyle}>Billing status</span>
                    <select
                      value={draft?.billingStatus || tenant.billing.status}
                      onChange={(event) =>
                        updateDraft(tenant.id, {
                          billingStatus: event.target.value as SaasAdminTenantBilling["status"]
                        })
                      }
                      style={inputStyle}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={fieldWrapStyle}>
                    <span style={fieldLabelStyle}>Paid until</span>
                    <input
                      type="date"
                      value={draft?.paidUntil || ""}
                      onChange={(event) => updateDraft(tenant.id, { paidUntil: event.target.value })}
                      style={inputStyle}
                    />
                  </label>

                  <label style={fieldWrapStyle}>
                    <span style={fieldLabelStyle}>Grace until</span>
                    <input
                      type="date"
                      value={draft?.graceUntil || ""}
                      onChange={(event) => updateDraft(tenant.id, { graceUntil: event.target.value })}
                      style={inputStyle}
                    />
                  </label>

                  <label style={fieldWrapStyle}>
                    <span style={fieldLabelStyle}>Blocked reason</span>
                    <input
                      type="text"
                      value={draft?.blockedReason || ""}
                      onChange={(event) => updateDraft(tenant.id, { blockedReason: event.target.value })}
                      placeholder="Motivo interno"
                      style={inputStyle}
                    />
                  </label>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                  <button
                    type="button"
                    disabled={savingTenantId === tenant.id}
                    onClick={() => void handleSave(tenant.id)}
                    style={saveButtonStyle}
                  >
                    {savingTenantId === tenant.id ? "Guardando..." : "Guardar"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateDraft(tenant.id, {
                        billingStatus: "grace_period",
                        graceUntil: addDaysInputValue(5)
                      })
                    }
                    style={secondaryButtonStyle}
                  >
                    Dar 5 dias
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateDraft(tenant.id, {
                        billingStatus: "active",
                        blockedReason: ""
                      })
                    }
                    style={secondaryButtonStyle}
                  >
                    Marcar activo
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <BuildMetaCard />
    </main>
  );
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={metaLineStyle}>
      <span style={metaLabelStyle}>{label}</span>
      <span style={metaValueStyle}>{value}</span>
    </div>
  );
}

function toDateInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function emptyAsNull(value: string) {
  return value.trim() ? value : null;
}

function addDaysInputValue(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const pageStyle: React.CSSProperties = {
  maxWidth: 1180,
  margin: "32px auto 56px",
  padding: "0 16px",
  display: "grid",
  gap: 18,
  fontFamily: "system-ui, sans-serif"
};

const heroStyle: React.CSSProperties = {
  padding: "24px 24px 26px",
  borderRadius: 28,
  background: "#172433",
  color: "#f7fafc",
  boxShadow: "0 24px 60px rgba(23, 36, 51, 0.22)"
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.16em",
  color: "rgba(247, 250, 252, 0.72)"
};

const titleStyle: React.CSSProperties = {
  margin: "10px 0 8px",
  fontSize: 36,
  lineHeight: 1.05
};

const bodyStyle: React.CSSProperties = {
  margin: 0,
  color: "rgba(247, 250, 252, 0.82)",
  lineHeight: 1.6
};

const linkButtonStyle = (primary: boolean): React.CSSProperties => ({
  padding: "12px 16px",
  borderRadius: 999,
  textDecoration: "none",
  fontWeight: 700,
  border: primary ? "1px solid #f4d7a2" : "1px solid rgba(255,255,255,0.18)",
  background: primary ? "#f1d8a8" : "transparent",
  color: primary ? "#2d2110" : "#f7fafc"
});

const chipStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "12px 16px",
  background: "rgba(255,255,255,0.08)",
  color: "#f7fafc",
  fontWeight: 700
};

const panelStyle: React.CSSProperties = {
  borderRadius: 24,
  background: "#ffffff",
  border: "1px solid #dce4ec",
  boxShadow: "0 16px 38px rgba(27, 54, 85, 0.07)",
  padding: 20,
  display: "grid",
  gap: 18
};

const toolbarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "end"
};

const filterWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: 6
};

const filterLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#66717c",
  textTransform: "uppercase",
  letterSpacing: "0.08em"
};

const selectStyle: React.CSSProperties = {
  minHeight: 42,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #d5dde6",
  background: "#fbfdff"
};

const errorBoxStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 16,
  background: "#fff1f1",
  border: "1px solid #f0c8c8",
  color: "#a12626"
};

const mutedTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#66717c"
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16
};

const cardStyle: React.CSSProperties = {
  borderRadius: 22,
  border: "1px solid #dbe4ec",
  background: "#f8fbfd",
  padding: 18,
  display: "grid",
  gap: 14
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "start"
};

const mutedInlineStyle: React.CSSProperties = {
  color: "#66717c",
  fontSize: 13
};

const metaGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 8
};

const metaLineStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap"
};

const metaLabelStyle: React.CSSProperties = {
  color: "#66717c",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.06em"
};

const metaValueStyle: React.CSSProperties = {
  color: "#172433",
  fontWeight: 600
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 10
};

const fieldWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: 6
};

const fieldLabelStyle: React.CSSProperties = {
  color: "#44515e",
  fontSize: 13,
  fontWeight: 700
};

const inputStyle: React.CSSProperties = {
  minHeight: 44,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #d5dde6",
  background: "#ffffff",
  boxSizing: "border-box"
};

const saveButtonStyle: React.CSSProperties = {
  minHeight: 44,
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid rgba(20, 47, 71, 0.2)",
  background: "#172433",
  color: "#f7fafc",
  fontWeight: 800,
  cursor: "pointer"
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 44,
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #d5dde6",
  background: "#ffffff",
  color: "#1f3953",
  fontWeight: 700,
  cursor: "pointer"
};

const statusBadgeStyle = (status: SaasAdminTenantBilling["status"]): React.CSSProperties => ({
  borderRadius: 999,
  padding: "7px 12px",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  background:
    status === "active"
      ? "#e8f6ed"
      : status === "grace_period"
        ? "#fff3da"
        : status === "pending_manual_block"
          ? "#ffe3d7"
          : "#ffe0e0",
  color:
    status === "active"
      ? "#1d6b43"
      : status === "grace_period"
        ? "#7c5a12"
        : status === "pending_manual_block"
          ? "#8b3d13"
          : "#8a2222"
});
