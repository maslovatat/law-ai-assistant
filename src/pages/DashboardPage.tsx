import { Link } from "react-router-dom";
import { useStore } from "../app/ShipmentStore";
import { StatusBadge } from "../components/shipment/StatusBadge";
import { EmptyState } from "../components/shipment/EmptyState";
import { PrototypeNotice } from "../components/shipment/PrototypeNotice";
import { shipmentStatusLabels } from "../types/labels";
import { mockDisclaimer } from "../types/labels";
import { formatDisplayDate } from "../lib/mock/clock";

const statusOrder: (keyof typeof shipmentStatusLabels)[] = [
  "IN_TRANSIT",
  "DELIVERED",
  "PREPARED",
  "REQUIRES_ATTENTION",
  "ACCEPTED",
  "SENDING",
  "DRAFT",
];

/** Страница дашборда (docs/prototype2.md §6). */
export function DashboardPage() {
  const { state, statusCounts } = useStore();

  const latestShipments = state.shipments.slice(0, 5);
  const totalShipments = state.shipments.length;
  const totalDrafts = state.drafts.length;

  const statCards = [
    {
      label: "Всего отправлений",
      value: totalShipments,
    },
    ...statusOrder
      .filter((s) => (statusCounts[s] ?? 0) > 0)
      .map((s) => ({
        label: shipmentStatusLabels[s],
        value: statusCounts[s],
        status: s,
      })),
    {
      label: "Черновиков",
      value: totalDrafts,
    },
  ];

  return (
    <div className="stack">
      <section className="hero">
        <h1>Досудебные претензии через Почту России</h1>
        <p className="hero__subtitle">
          Загрузите PDF с претензией, укажите получателя и проверьте данные перед демонстрационной отправкой
          через ИС ЭПС Почты России.
        </p>
        <div className="btn-row">
          <Link to="/create" className="btn btn--primary">
            Отправить претензию
          </Link>
          <Link to="/drafts" className="btn">
            Мои черновики
          </Link>
        </div>
        <PrototypeNotice variant="inline" />
      </section>

      <section className="section">
        <h2 className="section__title">Сводка по отправлениям</h2>
        <div className="stat-grid">
          {statCards.map((card) => (
            <div key={card.label} className="stat-card">
              <div className="stat-card__value">{card.value}</div>
              <div className="stat-card__label">{card.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section__header">
          <h2 className="section__title">Последние отправления</h2>
          <Link to="/shipments" className="btn btn--sm">
            Все отправления
          </Link>
        </div>

        {latestShipments.length === 0 ? (
          <EmptyState
            title="Пока нет отправлений"
            actionLabel="Создать первое отправление"
            actionHref="/create"
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {latestShipments.map((s) => (
              <div key={s.id} className="card">
                <div className="card__header">
                  <div>
                    <div className="card__title">{s.document?.name ?? "Документ"}</div>
                    <div className="card__meta">
                      {s.recipient.person
                        ? `${s.recipient.person.lastName ?? ""} ${s.recipient.person.firstName ?? ""}`.trim()
                        : s.recipient.organization?.name ?? ""}
                      {" · "}
                      {formatDisplayDate(s.createdAt)}
                    </div>
                  </div>
                  <div className="row">
                    <StatusBadge status={s.status} />
                    <Link to={`/shipments/${s.id}`} className="btn btn--sm">
                      Открыть
                    </Link>
                  </div>
                </div>
                {s.isDemo ? <div className="subtle small">{mockDisclaimer}</div> : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
