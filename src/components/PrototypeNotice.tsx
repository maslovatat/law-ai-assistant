import type { ReactNode } from "react";
import { mockNotice } from "../types/labels";

export function PrototypeNotice({ children }: { children?: ReactNode }) {
  return <p className="subtle">{children ?? mockNotice}</p>;
}

export function MockSimulationNotice({ children }: { children?: ReactNode }) {
  return (
    <p className="callout callout--warning">
      {children ??
        "Это демонстрационная отправка. В реальной системе документ будет передан через согласованный юридически значимый канал связи. Реального документа отправлено не было."}
    </p>
  );
}