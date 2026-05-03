import { useEffect, useState } from "react";
import { BackendBuildMeta, fetchBackendBuildMeta, FRONTEND_BUILD_INFO } from "../config/build";

type BuildMetaCardProps = {
  compact?: boolean;
};

export function BuildMetaCard({ compact = false }: BuildMetaCardProps) {
  const [backendMeta, setBackendMeta] = useState<BackendBuildMeta | null>(null);
  const [backendStatus, setBackendStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    fetchBackendBuildMeta()
      .then((meta) => {
        if (cancelled) {
          return;
        }

        setBackendMeta(meta);
        setBackendStatus("ready");
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setBackendStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section style={compact ? compactCardStyle : cardStyle}>
      <div style={headerStyle}>
        <strong style={titleStyle}>Build actual</strong>
        <span style={badgeStyle}>{FRONTEND_BUILD_INFO.environment}</span>
      </div>

      <div style={gridStyle}>
        <div style={rowStyle}>
          <span style={labelStyle}>Frontend</span>
          <span style={valueStyle}>
            v{FRONTEND_BUILD_INFO.version} · {FRONTEND_BUILD_INFO.releaseSha}
          </span>
        </div>

        <div style={rowStyle}>
          <span style={labelStyle}>Backend</span>
          <span style={valueStyle}>
            {backendMeta ? `v${backendMeta.version} · ${backendMeta.releaseSha}` : resolveBackendStatus(backendStatus)}
          </span>
        </div>

        {backendMeta?.releaseCreatedAt ? (
          <div style={rowStyle}>
            <span style={labelStyle}>Release</span>
            <span style={valueStyle}>{formatIsoDate(backendMeta.releaseCreatedAt)}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function resolveBackendStatus(status: "loading" | "ready" | "error") {
  if (status === "loading") {
    return "cargando...";
  }

  if (status === "error") {
    return "sin respuesta";
  }

  return "ok";
}

function formatIsoDate(value: string) {
  return new Date(value).toLocaleString("es-UY", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

const cardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid #dbe4ec",
  background: "#f8fbfd",
  padding: "14px 16px",
  display: "grid",
  gap: 10
};

const compactCardStyle: React.CSSProperties = {
  ...cardStyle,
  padding: "12px 14px"
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10
};

const titleStyle: React.CSSProperties = {
  color: "#213244",
  fontSize: 14
};

const badgeStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#47627d",
  background: "#e8f0f7",
  borderRadius: 999,
  padding: "4px 10px"
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gap: 8
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap"
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#71808f"
};

const valueStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#213244",
  fontWeight: 600
};
