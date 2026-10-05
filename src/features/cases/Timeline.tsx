import type { Case } from "../../types/domain";
import { actorLabels } from "../../types/labels";

const kindMarkers: Record<Case["events"][number]["kind"], string> = {
  case_created: "●",
  interview_started: "○",
  interview_completed: "○",
  facts_structured: "○",
  recommendation_given: "→",
  action_selected: "→",
  task_created: "☐",
  task_completed: "✓",
  document_generated: "▤",
  document_confirmed: "✓",
  document_sent: "↑",
  counterparty_responded: "↓",
  result_rejected: "⚠",
  court_preparation_started: "⚖",
  transferred_to_lawyer: "⚖",
  lawyer_message: "✉",
  user_message: "✉",
  fact_updated: "✎",
  lawyer_decision: "⚖",
  case_closed: "■",
  note: "i",
};

const actorMarkers: Record<Case["events"][number]["initiator"], string> = {
  user: "Пользователь",
  ai: "AI",
  lawyer: "Юрист",
  counterparty: "Контрагент",
  system: "Система",
};

/** История дела: дата, описание, инициатор и источник (§12, §28). */
export function Timeline({ caseItem }: { caseItem: Case }) {
  const events = [...caseItem.events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return (
    <ol className="timeline">
      {events.map((event) => (
        <li key={event.id} className="timeline__item">
          <div className="timeline__marker" aria-hidden="true">
            {kindMarkers[event.kind]}
          </div>
          <div className="timeline__content">
            <div className="timeline__head">
              <span className="timeline__date mono-num">{event.date}</span>
              <span className="timeline__title">{event.title}</span>
              <span className="timeline__actor">
                инициатор: {actorLabels[event.initiator]} ({actorMarkers[event.initiator]})
              </span>
            </div>
            {event.description ? <p className="small muted">{event.description}</p> : null}
            {event.sourceLabel ? <div className="timeline__source">Источник: {event.sourceLabel}</div> : null}
            {event.factRefs?.length || event.documentRefs?.length ? (
              <div className="timeline__refs subtle">
                {event.factRefs?.length ? `Факты: ${event.factRefs.length}` : ""}
                {event.factRefs?.length && event.documentRefs?.length ? " · " : ""}
                {event.documentRefs?.length ? `Документы: ${event.documentRefs.length}` : ""}
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}