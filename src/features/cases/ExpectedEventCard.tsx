import type { Case } from "../../types/domain";
import { actorLabels, flagLabels, outcomeReasonLabels, outcomeResultLabels } from "../../types/labels";
import { Card } from "../../components/Card";
import { Badge } from "../../components/Button";
import { KeyValueList } from "../../components/KeyValueList";
import { daysUntil } from "../../lib/mock/clock";

interface ExpectedEventCardProps {
  caseItem: Case;
  today: string;
  nextAction?: React.ReactNode;
}

/**
 * Ожидаемое событие объясняет, почему дело находится в текущем состоянии:
 * что ожидается, кто ответственный и есть ли срок (docs/prototype.md §11, §27).
 */
export function ExpectedEventCard({ caseItem, today, nextAction }: ExpectedEventCardProps) {
  if (caseItem.outcome) {
    return (
      <Card title="Итог дела" tone={caseItem.outcome.result === "solved" ? "success" : "default"}>
        <div className="row" style={{ marginBottom: 12 }}>
          <Badge tone={caseItem.outcome.result === "solved" ? "success" : "neutral"} marker="■">
            {outcomeResultLabels[caseItem.outcome.result]}
          </Badge>
          <span className="muted">{outcomeReasonLabels[caseItem.outcome.reason]}</span>
        </div>
        {caseItem.outcome.comment ? <p className="small">{caseItem.outcome.comment}</p> : null}
        <KeyValueList rows={[{ label: "Дата закрытия", value: formatIso(caseItem.outcome.closedAt) }]} />
      </Card>
    );
  }

  if (!caseItem.expectedEvent) {
    return (
      <Card title="Что происходит сейчас" tone="accent">
        <p className="small" style={{ margin: 0 }}>
          Дело не ожидает внешнего события. Доступные действия показаны ниже — выберите следующий шаг.
        </p>
      </Card>
    );
  }

  const expected = caseItem.expectedEvent;
  const days = expected.deadline ? daysUntil(toIso(expected.deadline), today) : undefined;

  return (
    <Card
      title="Что ожидается сейчас"
      tone="accent"
      meta={expected.description}
      footer={nextAction}
    >
      <KeyValueList
        rows={[
          { label: "Ожидаемое событие", value: <strong>{expected.title}</strong> },
          { label: "Ответственный", value: actorLabels[expected.responsible] },
          {
            label: "Срок",
            value: expected.deadline ? (
              <span className="row">
                <span className="mono-num">{expected.deadline}</span>
                {days !== undefined ? (
                  <Badge tone={days < 0 ? "danger" : days <= 3 ? "attention" : "neutral"} marker="⧗">
                    {days < 0 ? `Просрочен на ${Math.abs(days)} дн.` : `Осталось ${days} дн.`}
                  </Badge>
                ) : null}
              </span>
            ) : (
              <span className="muted">Срок не установлен</span>
            ),
          },
          ...caseItem.flags
            .filter((flag) => flag === "WAITING_USER" || flag === "WAITING_COUNTERPARTY")
            .map((flag) => ({ label: "Признак состояния", value: flagLabels[flag] })),
        ]}
      />
    </Card>
  );
}

function toIso(display: string): string {
  const [day, month, year] = display.split(".");
  return `${year}-${month}-${day}`;
}

function formatIso(value: string): string {
  return value.includes("-") && !value.includes(".") ? toIso(value) : value;
}