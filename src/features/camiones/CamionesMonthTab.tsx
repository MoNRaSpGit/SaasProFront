import { useMemo, useState } from "react";

// Pestaña "Mes" (30/10/2026, pedido explicito): cuanto se facturo en el mes,
// con un grafico por semana y cada semana desplegable de lunes a domingo.
// Las semanas son de calendario (lunes a domingo) recortadas al mes: la
// semana 1 va del dia 1 hasta el primer domingo.

export type CamionesMonthItem = {
  date: string; // YYYY-MM-DD
  amount: number;
  collected: number;
  kilometers: number;
};

type Props = {
  items: CamionesMonthItem[];
  loading: boolean;
  formatMoney: (value: number) => string;
};

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

type DayTotals = { day: number; weekday: number; trips: number; amount: number; collected: number; kilometers: number };
type WeekTotals = { index: number; days: DayTotals[]; trips: number; amount: number; collected: number; kilometers: number };

function buildMonth(items: CamionesMonthItem[], year: number, month: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: DayTotals[] = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({ day, weekday: new Date(year, month, day).getDay(), trips: 0, amount: 0, collected: 0, kilometers: 0 });
  }

  const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
  for (const item of items) {
    if (!item.date.startsWith(prefix)) {
      continue;
    }
    const target = days[Number(item.date.slice(8, 10)) - 1];
    if (!target) {
      continue;
    }
    target.trips += 1;
    target.amount += item.amount;
    target.collected += item.collected;
    target.kilometers += item.kilometers;
  }

  const weeks: WeekTotals[] = [];
  let current: WeekTotals | null = null;
  for (const day of days) {
    if (!current || day.weekday === 1) {
      current = { index: weeks.length + 1, days: [], trips: 0, amount: 0, collected: 0, kilometers: 0 };
      weeks.push(current);
    }
    current.days.push(day);
    current.trips += day.trips;
    current.amount += day.amount;
    current.collected += day.collected;
    current.kilometers += day.kilometers;
  }

  const totals = weeks.reduce(
    (acc, week) => ({
      trips: acc.trips + week.trips,
      amount: acc.amount + week.amount,
      collected: acc.collected + week.collected,
      kilometers: acc.kilometers + week.kilometers
    }),
    { trips: 0, amount: 0, collected: 0, kilometers: 0 }
  );

  return { weeks, totals };
}

function shortMonth(month: number) {
  return MONTH_NAMES[month].slice(0, 3).toLowerCase();
}

export function CamionesMonthTab({ items, loading, formatMoney }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [openWeek, setOpenWeek] = useState<number | null>(null);

  const { weeks, totals } = useMemo(() => buildMonth(items, year, month), [items, year, month]);
  const maxWeekAmount = Math.max(...weeks.map((week) => week.amount), 1);
  const bestWeek = weeks.reduce<WeekTotals | null>((best, week) => (week.amount > (best?.amount ?? 0) ? week : best), null);

  function moveMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
    setOpenWeek(null);
  }

  return (
    <section style={panelStyle}>
      <div style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 24, color: "#2f241e" }}>Tu mes</h2>
        <p style={{ margin: 0, color: "#68594f", lineHeight: 1.5 }}>Lo facturado en el mes, semana por semana.</p>
      </div>

      <div style={monthPickerStyle}>
        <button type="button" onClick={() => moveMonth(-1)} style={arrowButtonStyle} aria-label="Mes anterior">
          ‹
        </button>
        <strong style={{ fontSize: 20, color: "#2f241e" }}>
          {MONTH_NAMES[month]} {year}
        </strong>
        <button type="button" onClick={() => moveMonth(1)} style={arrowButtonStyle} aria-label="Mes siguiente">
          ›
        </button>
      </div>

      {loading ? (
        <div style={{ ...emptyBoxStyle, marginTop: 16 }}>Cargando el mes...</div>
      ) : (
        <div style={{ display: "grid", gap: 18, marginTop: 16 }}>
          <div style={heroCardStyle}>
            <span style={{ ...labelStyle, color: "#e8d9c6" }}>Facturado en {MONTH_NAMES[month].toLowerCase()}</span>
            <strong style={{ fontSize: 34, fontWeight: 900, color: "#fbf5ec" }}>{formatMoney(totals.amount)}</strong>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#e8d9c6" }}>
              {totals.trips} viaje{totals.trips === 1 ? "" : "s"} · {totals.kilometers.toFixed(0)} km · Cobrado {formatMoney(totals.collected)}
            </span>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 18, color: "#2f241e" }}>Semana por semana</h3>
            <div style={chartStyle}>
              {weeks.map((week) => {
                const height = (week.amount / maxWeekAmount) * 100;
                const isBest = bestWeek?.index === week.index && week.amount > 0;
                return (
                  <button
                    key={week.index}
                    type="button"
                    onClick={() => setOpenWeek(openWeek === week.index ? null : week.index)}
                    style={chartColumnStyle}
                    aria-label={`Ver semana ${week.index}`}
                  >
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#6e573f", whiteSpace: "nowrap" }}>
                      {week.amount > 0 ? formatMoney(week.amount).replace(/\.00$/, "") : ""}
                    </span>
                    <div style={chartTrackStyle}>
                      <div
                        style={{
                          ...chartBarStyle,
                          height: `${Math.max(height, week.amount > 0 ? 4 : 0)}%`,
                          background: isBest ? "linear-gradient(180deg, #e0a440 0%, #b97a1f 100%)" : "linear-gradient(180deg, #6b4f3c 0%, #38281f 100%)",
                          outline: openWeek === week.index ? "3px solid #e0a440" : "none"
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#2f241e" }}>Sem {week.index}</span>
                  </button>
                );
              })}
            </div>
            {bestWeek && bestWeek.amount > 0 ? (
              <span style={{ fontSize: 13, fontWeight: 700, color: "#8a5a14" }}>★ Mejor semana: semana {bestWeek.index}</span>
            ) : null}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {weeks.map((week) => {
              const first = week.days[0].day;
              const last = week.days[week.days.length - 1].day;
              const isOpen = openWeek === week.index;
              const maxDayAmount = Math.max(...week.days.map((day) => day.amount), 1);
              return (
                <article key={week.index} style={weekCardStyle}>
                  <button type="button" onClick={() => setOpenWeek(isOpen ? null : week.index)} style={weekHeaderStyle}>
                    <div style={{ display: "grid", gap: 4, textAlign: "left" }}>
                      <strong style={{ fontSize: 17, color: "#2f241e" }}>Semana {week.index}</strong>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#8a745d" }}>
                        {first === last ? `${first}` : `${first} al ${last}`} de {shortMonth(month)} · {week.trips} viaje{week.trips === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <strong style={{ fontSize: 17, color: "#4f3828" }}>{formatMoney(week.amount)}</strong>
                      <span style={{ fontSize: 18, color: "#8a745d", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>›</span>
                    </div>
                  </button>

                  {isOpen ? (
                    <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
                      {week.days.map((day) => (
                        <div key={day.day} style={{ ...dayRowStyle, opacity: day.trips > 0 ? 1 : 0.55 }}>
                          <div style={{ width: 92, display: "grid" }}>
                            <strong style={{ fontSize: 14, color: "#2f241e" }}>{DAY_NAMES[day.weekday]}</strong>
                            <span style={{ fontSize: 12, color: "#8a745d", fontWeight: 700 }}>
                              {day.day} de {shortMonth(month)}
                            </span>
                          </div>
                          <div style={{ flex: 1, height: 10, borderRadius: 5, background: "#efe2d0", overflow: "hidden" }}>
                            <div style={{ width: `${(day.amount / maxDayAmount) * 100}%`, height: "100%", borderRadius: 5, background: "#6b4f3c" }} />
                          </div>
                          <div style={{ width: 96, textAlign: "right", display: "grid" }}>
                            <strong style={{ fontSize: 14, color: "#4f3828" }}>{day.trips > 0 ? formatMoney(day.amount) : "—"}</strong>
                            <span style={{ fontSize: 12, color: "#8a745d", fontWeight: 700 }}>
                              {day.trips > 0 ? `${day.trips} viaje${day.trips === 1 ? "" : "s"} · ${day.kilometers.toFixed(0)} km` : "Sin viajes"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

const panelStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 16,
  borderRadius: 24,
  background: "#fffdf9",
  border: "1px solid #ded3c6",
  boxShadow: "0 16px 34px rgba(73, 48, 34, 0.08)"
};

const monthPickerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginTop: 16,
  padding: "8px 10px",
  borderRadius: 18,
  border: "1px solid #e0d3c4",
  background: "#fff8f0"
};

const arrowButtonStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 14,
  border: "1px solid #d8ccbf",
  background: "#fffdf9",
  color: "#38281f",
  fontSize: 24,
  fontWeight: 800,
  cursor: "pointer"
};

const heroCardStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  padding: "18px 18px",
  borderRadius: 22,
  background: "linear-gradient(160deg, #4a3527 0%, #2b1f18 100%)",
  boxShadow: "0 14px 26px rgba(36, 25, 19, 0.22)"
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#8a745d"
};

const chartStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  gap: 8,
  height: 190,
  padding: "12px 10px 10px",
  borderRadius: 18,
  border: "1px solid #e0d3c4",
  background: "linear-gradient(180deg, #fffaf2 0%, #f7efe3 100%)"
};

const chartColumnStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  padding: 0,
  border: "none",
  background: "transparent",
  cursor: "pointer"
};

const chartTrackStyle: React.CSSProperties = {
  flex: 1,
  width: "100%",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center"
};

const chartBarStyle: React.CSSProperties = {
  width: "70%",
  maxWidth: 46,
  borderRadius: "10px 10px 4px 4px",
  transition: "height 0.3s ease"
};

const weekCardStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 20,
  border: "1px solid #e0d3c4",
  background: "linear-gradient(180deg, #fffaf2 0%, #f7efe3 100%)"
};

const weekHeaderStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: 0,
  border: "none",
  background: "transparent",
  cursor: "pointer"
};

const dayRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 10px",
  borderRadius: 14,
  background: "#fffdf9",
  border: "1px solid #eadfd1"
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
