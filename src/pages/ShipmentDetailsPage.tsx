import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useStore } from "../app/ShipmentStore";
import { StatusBadge } from "../components/shipment/StatusBadge";
import { ShipmentTimeline } from "../components/shipment/ShipmentTimeline";
import { ConfirmDialog } from "../components/shipment/ConfirmDialog";
import { PrototypeNotice, DemoResultNotice } from "../components/shipment/PrototypeNotice";
import { formatAddressLine } from "../lib/utils";
import { formatDisplayDate } from "../lib/mock/clock";
import { KeyValueList } from "../components/KeyValueList";
import { Card } from "../components/Card";
import type { ShipmentActor } from "../types/domain";

const actorLabels: Record<ShipmentActor, string> = {
  user: "Пользователь",
  system: "Система",
  recipient: "Получатель",
  post: "Почта",
};

/** Страница карточки отправления (docs/prototype2.md §12). */
export function ShipmentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getShipment, dispatch } = useStore();
  const shipment = id ? getShipment(id) : undefined;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!shipment) {
    return (
      <div className="stack">
        <h1>Отправление не найдено</h1>
        <p className="muted">Отправление с идентификатором «{id}» не найдено.</p>
        <Link to="/shipments" className="btn btn--primary">
          Вернуться к списку
        </Link>
      </div>
    );
  }

  const recipientName = shipment.recipient.organization?.name ??
    [shipment.recipient.person?.lastName, shipment.recipient.person?.firstName, shipment.recipient.person?.patronymic]
      .filter(Boolean)
      .join(" ") ?? "—";

  const senderAddress = formatAddressLine({
    postalCode: shipment.sender.address?.postalCode,
    region: shipment.sender.address?.region,
    city: shipment.sender.address?.city,
    street: shipment.sender.address?.street,
    houseNumber: shipment.sender.address?.houseNumber,
    corpus: shipment.sender.address?.corpus,
    flat: shipment.sender.address?.flat,
  });

  const recipientAddress = formatAddressLine({
    postalCode: shipment.recipient.address?.postalCode,
    region: shipment.recipient.address?.region,
    city: shipment.recipient.address?.city,
    street: shipment.recipient.address?.street,
    houseNumber: shipment.recipient.address?.houseNumber,
    corpus: shipment.recipient.address?.corpus,
    flat: shipment.recipient.address?.flat,
  });

  return (
    <div className="stack">
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-3)" }}>
        <Link to="/shipments" className="btn btn--sm">
          ← К списку
        </Link>
        <DemoResultNotice>
          {shipment.isDemo ? "Демонстрационный статус" : "Реальное отправление"}
        </DemoResultNotice>
      </div>

      <div className="card">
        <div className="card__header">
          <div>
            <div className="card__title">Отправление {shipment.requestCode}</div>
            <div className="card__meta">
              ШПИ: <span className="mono-num">{shipment.mailId ?? "—"}</span>
              {" · "}
              Создано: {formatDisplayDate(shipment.createdAt)}
            </div>
          </div>
          <StatusBadge status={shipment.status} />
        </div>

        <div className="row">
          <StatusBadge status={shipment.status} />
          <span className="small muted">
            {shipment.isDemo ? "Демонстрационный статус доставки" : "Статус доставки"}
          </span>
        </div>

        {shipment.expectedEvent ? (
          <div style={{ marginTop: "var(--space-3)" }}>
            <div className="small muted">Ожидаемое событие</div>
            <div className="small">
              <strong>{shipment.expectedEvent.title}</strong>
              {shipment.expectedEvent.responsible
                ? ` · Ответственный: ${actorLabels[shipment.expectedEvent.responsible]}`
                : ""}
              {shipment.expectedEvent.deadline ? ` · Срок: ${shipment.expectedEvent.deadline}` : ""}
            </div>
            {shipment.expectedEvent.description ? (
              <p className="small muted" style={{ marginTop: "4px" }}>
                {shipment.expectedEvent.description}
              </p>
            ) : null}
          </div>
        ) : null}

        <div style={{ marginTop: "var(--space-3)" }}>
          <button
            type="button"
            className="btn btn--sm btn--danger"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Удалить отправление
          </button>
        </div>
      </div>

      <div className="grid grid--sidebar">
        <div className="stack">
          <details className="disclosure">
            <summary>Документ</summary>
            <div className="disclosure__body">
              <KeyValueList
                rows={[
                  { label: "Файл", value: shipment.document.name },
                  { label: "Размер", value: `${Math.round(shipment.document.size / 1024)} КБ` },
                  { label: "Страниц", value: shipment.document.pageCount?.toString() ?? "—" },
                  { label: "Формат", value: "PDF/A-1" },
                ]}
              />
            </div>
          </details>

          <details className="disclosure">
            <summary>Отправитель</summary>
            <div className="disclosure__body">
              <KeyValueList
                rows={[
                  { label: "Наименование", value: shipment.sender.name },
                  { label: "Email", value: shipment.sender.email ?? "—" },
                  { label: "Адрес", value: shipment.sender.addressString ?? senderAddress },
                ]}
              />
            </div>
          </details>

          <details className="disclosure">
            <summary>Получатель</summary>
            <div className="disclosure__body">
              <KeyValueList
                rows={[
                  { label: "Наименование", value: recipientName },
                  { label: "Адрес", value: shipment.recipient.addressString ?? recipientAddress },
                  { label: "Доп. инфо", value: shipment.recipient.additionalInfo ?? "—" },
                ]}
              />
            </div>
          </details>
        </div>

        <div>
          <Card title="Метаданные" tone="default">
            <KeyValueList
              rows={[
                { label: "Статус API", value: shipment.apiStatus ?? "—" },
                { label: "Код разряда", value: shipment.mailRank !== undefined ? String(shipment.mailRank) : "—" },
                { label: "Тип", value: shipment.shipmentType ?? "—" },
                { label: "Демо", value: shipment.isDemo ? "Да" : "Нет" },
              ]}
            />
          </Card>
        </div>
      </div>

      <Card title="История событий" tone="default">
        <ShipmentTimeline events={shipment.events} />
      </Card>

      <PrototypeNotice variant="inline" />

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Удалить отправление?"
        confirmLabel="Удалить"
        confirmVariant="danger"
        onConfirm={() => {
          dispatch({ type: "deleteShipment", id: shipment.id });
          navigate("/shipments");
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      >
        <p>Это действие удалит отправление из списка. История событий также будет удалена.</p>
      </ConfirmDialog>
    </div>
  );
}
