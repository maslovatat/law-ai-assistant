import { useState } from "react";
import { ShipmentTable } from "../components/shipment/ShipmentTable";
import { EmptyState } from "../components/shipment/EmptyState";
import { PrototypeNotice } from "../components/shipment/PrototypeNotice";
import { useStore } from "../app/ShipmentStore";
import { type ShipmentStatus } from "../types/domain";

/** Страница со списком отправлений с поиском и фильтрацией (docs/prototype2.md §8). */
export function ShipmentsPage() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | "ALL">("ALL");
  const { state } = useStore();

  const hasShipments = state.shipments.length > 0;

  return (
    <div className="stack">
      <h1>Отправления</h1>
      <ShipmentTable
        query={query}
        statusFilter={statusFilter}
        onQueryChange={setQuery}
        onStatusFilterChange={setStatusFilter}
      />
      {!hasShipments && (
        <EmptyState
          title="Пока нет отправлений"
          actionLabel="Создать отправление"
          actionHref="/create"
        />
      )}
      <PrototypeNotice variant="inline" />
    </div>
  );
}
