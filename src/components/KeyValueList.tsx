import type { ReactNode } from "react";

interface KeyValueListProps {
  rows: Array<{ label: ReactNode; value: ReactNode }>;
}

export function KeyValueList({ rows }: KeyValueListProps) {
  return (
    <div className="kv-list">
      {rows.map((row, index) => (
        <div key={index} style={{ display: "contents" }}>
          <div className="kv-list__key">{row.label}</div>
          <div className="kv-list__value">{row.value}</div>
        </div>
      ))}
    </div>
  );
}