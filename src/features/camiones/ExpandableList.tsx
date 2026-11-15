import { useState, type ReactNode } from "react";

// Lista corta con "Ver mas" (15/11/2026, pedido explicito): muestra los
// primeros 5; el primer "Ver mas" muestra 5 mas (10) y el siguiente muestra
// todo. Si la lista tiene 5 o menos, no hay boton.
const FIRST = 5;

export function ExpandableList<T>({ items, render }: { items: T[]; render: (item: T) => ReactNode }) {
  const [step, setStep] = useState(0);
  const limit = step === 0 ? FIRST : step === 1 ? FIRST * 2 : items.length;
  const visible = items.slice(0, limit);
  const hidden = items.length - visible.length;

  return (
    <>
      {visible.map((item) => render(item))}
      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setStep((current) => current + 1)}
          style={{
            minHeight: 44,
            padding: "8px 16px",
            borderRadius: 18,
            border: "1px solid #d8ccbf",
            background: "#fff8f0",
            color: "#5d4a3e",
            fontWeight: 800,
            fontSize: 15,
            cursor: "pointer"
          }}
        >
          Ver más ({hidden})
        </button>
      ) : null}
    </>
  );
}
