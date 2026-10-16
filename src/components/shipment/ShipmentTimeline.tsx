import type { ShipmentEvent, ShipmentActor, ShipmentEventType } from "../../types/domain";
import { formatDisplayDate } from "../../lib/mock/clock";

interface ShipmentTimelineProps {
  events: ShipmentEvent[];
  /** Показывать ли только основные события. */
  compact?: boolean;
}

const actorLabels: Record<ShipmentActor, string> = {
  user: "Пользователь",
  system: "Система",
  recipient: "Получатель",
  post: "Почта",
};

const typeIcons: Record<ShipmentEventType, string> = {
  document_added: "📄",
  sender_filled: "✏️",
  recipient_filled: "✏️",
  shipment_verified: "✓",
  shipment_sent: "📤",
  accepted_by_system: "✓",
  in_transit: "🚚",
  delivered: "📦",
  attention_required: "⚠",
};

/**
 * Вертикальная временная шкала событий отправления (docs/prototype2.md §12).
 * Каждое событие содержит дату, описание, инициатора и пометку "демонстрационное".
 */
export function ShipmentTimeline({ events }: ShipmentTimelineProps) {
  if (!events || events.length === 0) {
    return <p className="muted small">История событий пуста.</p>;
  }

  return (
    <ul className="timeline">
      {events.map((event) => (
        <li key={event.id} className="timeline__item">
          <span className="timeline__marker">{typeIcons[event.type] ?? "•"}</span>
          <div className="timeline__content">
            <div className="timeline__head">
              <span className="timeline__date">{formatDisplayDate(event.date)}</span>
              <span className="timeline__title">{event.title}</span>
              {event.isDemo ? <span className="badge badge--demo small">демо</span> : null}
            </div>
            {event.description ? (
              <p className="small muted" style={{ margin: "2px 0 0" }}>
                {event.description}
              </p>
            ) : null}
            <div className="timeline__actor small muted">
              Инициатор: {actorLabels[event.initiator]}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
