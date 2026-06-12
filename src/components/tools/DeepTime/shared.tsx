import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { useSuiteStore } from "@difference-suite/shared/stores/suiteStore";

import { COLORS } from "./data";
import type { ButtonProps, SuiteSourceSelectorProps } from "./types";

function Label({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontFamily: COLORS.mono,
        color: COLORS.amber,
        textTransform: "uppercase",
        letterSpacing: "0.09em",
        marginBottom: 7,
      }}
    >
      {children}
    </div>
  );
}

function Btn({ children, onClick, active, small, disabled, style }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: small ? "3px 9px" : "7px 14px",
        background: active ? COLORS.ink : "transparent",
        color: active ? COLORS.surface : COLORS.ink3,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 3,
        fontFamily: COLORS.mono,
        fontSize: small ? 10 : 11,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.1s, color 0.1s",
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function SuiteSourceSelector({ typeFilter, onLoad, label = "Load from Suite" }: SuiteSourceSelectorProps) {
  const { dataset } = useSuiteStore();
  const [selectedId, setSelectedId] = useState("");

  const filteredItems = useMemo(() => {
    const acceptedTypes = Array.isArray(typeFilter) ? typeFilter : [typeFilter];
    return dataset.filter((item) => acceptedTypes.includes(item.type));
  }, [dataset, typeFilter]);

  if (filteredItems.length === 0) {
    return null;
  }

  const activeItem = filteredItems.find((item) => item.id === selectedId);

  return (
    <div
      style={{
        padding: "12px",
        background: "rgba(131,33,97,0.04)",
        border: `1px solid ${COLORS.border}`,
        borderRadius: 4,
        marginBottom: 16,
      }}
    >
      <Label>{label}</Label>
      <div style={{ display: "flex", gap: 8 }}>
        <select
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          style={{
            flex: 1,
            padding: "6px",
            fontFamily: COLORS.mono,
            fontSize: 11,
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 3,
            color: COLORS.ink,
            outline: "none",
          }}
        >
          <option value="">Select a record...</option>
          {filteredItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.type})
            </option>
          ))}
        </select>
        <Btn
          small
          disabled={!selectedId}
          onClick={() => {
            if (activeItem) {
              void onLoad(activeItem);
            }
          }}
        >
          Load
        </Btn>
      </div>
    </div>
  );
}
