import { useEffect, useState } from "react";
import { FRONTEND_BUILD_INFO, FrontendBuildMeta, fetchPublishedFrontendBuildMeta } from "../config/build";

const DISMISSED_RELEASE_KEY = "saaspro_dismissed_frontend_release";
const CHECK_INTERVAL_MS = 60_000;

function isNewBuildAvailable(nextBuild: FrontendBuildMeta) {
  if (nextBuild.releaseSha && FRONTEND_BUILD_INFO.releaseSha) {
    return nextBuild.releaseSha !== FRONTEND_BUILD_INFO.releaseSha;
  }

  return nextBuild.version !== FRONTEND_BUILD_INFO.version;
}

export function AppUpdateNotice() {
  const [availableBuild, setAvailableBuild] = useState<FrontendBuildMeta | null>(null);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkForUpdates() {
      try {
        const nextBuild = await fetchPublishedFrontendBuildMeta();
        if (cancelled || !isNewBuildAvailable(nextBuild)) {
          return;
        }

        const dismissedRelease = window.localStorage.getItem(DISMISSED_RELEASE_KEY);
        if (dismissedRelease && dismissedRelease === nextBuild.releaseSha) {
          return;
        }

        setAvailableBuild(nextBuild);
      } catch {
        // Keep silent: update checks shouldn't interrupt the main flow.
      }
    }

    void checkForUpdates();

    const intervalId = window.setInterval(() => {
      void checkForUpdates();
    }, CHECK_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkForUpdates();
      }
    };

    window.addEventListener("focus", checkForUpdates);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", checkForUpdates);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  function handleLater() {
    if (availableBuild?.releaseSha) {
      window.localStorage.setItem(DISMISSED_RELEASE_KEY, availableBuild.releaseSha);
    }
    setIsMinimized(true);
  }

  function handleUpdateNow() {
    setIsApplyingUpdate(true);
    window.localStorage.removeItem(DISMISSED_RELEASE_KEY);
    window.setTimeout(() => {
      window.location.reload();
    }, 900);
  }

  if (!availableBuild && !isApplyingUpdate) {
    return null;
  }

  return (
    <div style={noticeWrapStyle}>
      <section style={isMinimized && !isApplyingUpdate ? minimizedNoticeCardStyle : noticeCardStyle}>
        {isApplyingUpdate ? (
          <div style={{ display: "grid", gap: 6 }}>
            <strong style={{ fontSize: 16, color: "#2f241e" }}>Actualizando...</strong>
          </div>
        ) : isMinimized ? (
          <div style={minimizedRowStyle}>
            <span style={minimizedTextStyle}>Actualizacion pendiente</span>
            <button type="button" onClick={() => setIsMinimized(false)} style={minimizedActionButtonStyle}>
              Ver
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gap: 6 }}>
              <strong style={{ fontSize: 16, color: "#2f241e" }}>Nueva actualizacion</strong>
            </div>
            <div style={noticeActionsStyle}>
              <button type="button" onClick={handleLater} style={laterButtonStyle}>
                Mas tarde
              </button>
              <button type="button" onClick={handleUpdateNow} style={updateButtonStyle}>
                Actualizar ahora
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

const noticeWrapStyle: React.CSSProperties = {
  position: "fixed",
  right: 16,
  bottom: 16,
  zIndex: 1000,
  width: "min(360px, calc(100vw - 24px))"
};

const noticeCardStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 14,
  borderRadius: 18,
  border: "1px solid #decfbf",
  background: "#fffdf8",
  boxShadow: "0 18px 34px rgba(73, 48, 34, 0.16)"
};

const minimizedNoticeCardStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  padding: "10px 12px",
  borderRadius: 999,
  border: "1px solid #decfbf",
  background: "#fffaf3",
  boxShadow: "0 12px 22px rgba(73, 48, 34, 0.12)"
};

const minimizedRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10
};

const minimizedTextStyle: React.CSSProperties = {
  color: "#5f4a3d",
  fontSize: 13,
  fontWeight: 800
};

const noticeActionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  flexWrap: "wrap"
};

const laterButtonStyle: React.CSSProperties = {
  minHeight: 40,
  padding: "10px 14px",
  borderRadius: 14,
  border: "1px solid #d8ccbf",
  background: "#fff7ed",
  color: "#5f4a3d",
  fontWeight: 700,
  cursor: "pointer"
};

const minimizedActionButtonStyle: React.CSSProperties = {
  minHeight: 32,
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid #d8ccbf",
  background: "#fffdf8",
  color: "#5f4a3d",
  fontWeight: 700,
  cursor: "pointer"
};

const updateButtonStyle: React.CSSProperties = {
  minHeight: 40,
  padding: "10px 14px",
  borderRadius: 14,
  border: "1px solid rgba(16, 74, 53, 0.22)",
  background: "#2b7a57",
  color: "#f7fffb",
  fontWeight: 800,
  cursor: "pointer"
};
