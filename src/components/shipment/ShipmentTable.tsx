import { useStore } from "../../app/ShipmentStore";
import { StatusBadge } from "./StatusBadge";
import { shipmentStatusLabels } from "../../types/labels";
import type { Shipment, ShipmentStatus } from "../../types/domain";

const statusOrder: ShipmentStatus[] = [
  "IN_TRANSIT",
  "DELIVERED",
  "PREPARED",
  "REQUIRES_ATTENTION",
  "ACCEPTED",
  "SENDING",
  "DRAFT",
];

const statusFilterOptions: Array<{ value: ShipmentStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "Все статусы" },
  ...statusOrder.map((s) => ({ value: s, label: shipmentStatusLabels[s] })),
];

interface ShipmentTableProps {
  /** Поисковый запрос. */
  query?: string;
  /** Активный фильтр статуса. */
  statusFilter?: ShipmentStatus | "ALL";
  /** Коллбек при смене поискового запроса. */
  onQueryChange?: (query: string) => void;
  /** Коллбек при смене фильтра статуса. */
  onStatusFilterChange?: (status: ShipmentStatus | "ALL") => void;
  /** Показывать ли элементы управления поиска/фильтра. */
  showControls?: boolean;
}

/**
 * Таблица списка отправлений с поиском и фильтрацией по статусу
 * (docs/prototype2.md §8).
 */
export function ShipmentTable({
  query = "",
  statusFilter = "ALL",
  onQueryChange,
  onStatusFilterChange,
  showControls = true,
}: ShipmentTableProps) {
  const { state, searchShipments, filterShipmentsByStatus } = useStore();

  const result = query.trim()
    ? searchShipments(query)
    : statusFilter === "ALL"
      ? state.shipments
      : filterShipmentsByStatus(statusFilter);

  const sorted = [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const recipientName = (s: Shipment) => {
    if (s.recipient.organization?.name) return s.recipient.organization.name;
    const p = s.recipient.person;
    if (!p) return "—";
    return [p.lastName, p.firstName, p.patronymic].filter(Boolean).join(" ") || "—";
  };

  return (
    <div className="stack stack--tight">
      {showControls ? (
        <div className="row">
          <input
            type="search"
            className="input"
            placeholder="Поиск по получателю или документу..."
            value={query}
            onChange={(e) => onQueryChange?.(e.target.value)}
            style={{ maxWidth: "400px" }}
            aria-label="Поиск отправлений"
          />
          <select
            className="select"
            style={{ width: "auto" }}
            value={statusFilter}
            onChange={(e) => onStatusFilterChange?.(e.target.value as ShipmentStatus | "ALL")}
            aria-label="Фильтр по статусу"
          >
            {statusFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <p className="muted">Отправления не найдены.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "30%" }}>Документ</th>
                <th style={{ width: "25%" }}>Получатель</th>
                <th style={{ width: "12%" }}>Дата</th>
                <th style={{ width: "13%" }}>Статус</th>
                <th style={{ width: "20%" }}>Идентификатор</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="small muted">{s.document?.name ?? "—"}</div>
                    {s.isDemo ? <div className="badge badge--demo small">демо</div> : null}
                  </td>
                  <td>
                    <div className="small">{recipientName(s)}</div>
                    <div className="small muted">{s.recipient.addressString}</div>
                  </td>
                  <td className="small muted">{s.createdAt}</td>
                  <td>
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="small muted mono-num">
                    {s.mailId || s.requestCode}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
