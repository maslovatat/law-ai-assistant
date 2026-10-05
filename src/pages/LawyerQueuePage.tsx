import { Link } from "react-router-dom";
import type { Case } from "../types/domain";
import { useStore } from "../app/CaseStore";
import { Badge, Button } from "../components/Button";
import { Card } from "../components/Card";
import { Notice } from "../components/Notice";
import { PrototypeNotice } from "../components/PrototypeNotice";
import { stageLabels, stageTone } from "../types/labels";

const priorityLabels: Record<Case["priority"], string> = {
  normal: "Обычный",
  high: "Повышенный",
  urgent: "Срочный",
};

const priorityTone: Record<Case["priority"], "neutral" | "attention" | "danger"> = {
  normal: "neutral",
  high: "attention",
  urgent: "danger",
};

const queueStatusLabels: Record<NonNullable<Case["queueStatus"]>, string> = {
  new: "Новое",
  in_progress: "В работе",
  needs_attention: "Требует внимания",
  resolved: "Решено",
};

const queueStatusTone: Record<NonNullable<Case["queueStatus"]>, "neutral" | "progress" | "attention" | "success"> = {
  new: "progress",
  in_progress: "progress",
  needs_attention: "attention",
  resolved: "success",
};

/** Очередь дел юриста (docs/prototype.md §20). */
export function LawyerQueuePage() {
  const { state, dispatch } = useStore();
  const queue = state.cases
    .filter((caseItem) => caseItem.stage === "LAWYER_REVIEW" || Boolean(caseItem.queueStatus))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className="stack">
      <header className="page-header">
        <div className="page-header__row">
          <h1>Кабинет юриста — очередь дел</h1>
          <div className="row">
            <span className="subtle">Демонстрационная дата: {formatToday(state.today)}</span>
            <Button small onClick={() => dispatch({ type: "setRole", role: "user" })}>
              Вернуться в режим пользователя
            </Button>
          </div>
        </div>
        <p className="page-header__subtitle">
          Дела, переданные пользователем на профессиональную проверку. Настоящей авторизации нет.
        </p>
      </header>

      {state.notice ? (
        <Notice tone={state.notice.tone} title={state.notice.title} onClose={() => dispatch({ type: "dismissNotice" })}>
          {state.notice.message}
        </Notice>
      ) : null}

      {queue.length === 0 ? (
        <div className="empty">
          <p>В очереди пока нет дел.</p>
          <p className="small">
            Передайте дело юристу из режима пользователя: откройте дело и нажмите «Передать дело юристу».
          </p>
          <Link to="/cases" className="btn btn--primary">
            Перейти к делам пользователя
          </Link>
        </div>
      ) : (
        <Card title="Очередь" meta={`Всего дел: ${queue.length}`} flush>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Дело</th>
                  <th scope="col">Пользователь</th>
                  <th scope="col">Категория</th>
                  <th scope="col">Этап</th>
                  <th scope="col">Причина передачи</th>
                  <th scope="col">Дата</th>
                  <th scope="col">Приоритет</th>
                  <th scope="col">Статус</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {queue.map((caseItem) => (
                  <tr key={caseItem.id}>
                    <th scope="row">{caseItem.number}</th>
                    <td>{caseItem.userId === "u-001" ? "Ирина Соколова" : "Пользователь (демо)"}</td>
                    <td>{caseItem.category}</td>
                    <td>
                      <Badge tone={stageTone[caseItem.stage]} marker="●">
                        {stageLabels[caseItem.stage]}
                      </Badge>
                    </td>
                    <td className="small">{caseItem.transferReason ?? "—"}</td>
                    <td className="mono-num small">{caseItem.transferredAt ?? caseItem.updatedAt}</td>
                    <td>
                      <Badge tone={priorityTone[caseItem.priority]} marker="▲">
                        {priorityLabels[caseItem.priority]}
                      </Badge>
                    </td>
                    <td>
                      {caseItem.queueStatus ? (
                        <Badge tone={queueStatusTone[caseItem.queueStatus]} marker="■">
                          {queueStatusLabels[caseItem.queueStatus]}
                        </Badge>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <Link to={`/lawyer/cases/${caseItem.id}`} className="btn btn--primary btn--sm">
                        Открыть дело
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <PrototypeNotice />
    </div>
  );
}

function formatToday(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}