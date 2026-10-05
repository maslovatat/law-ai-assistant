import { Link } from "react-router-dom";
import type { Case } from "../types/domain";
import { useStore } from "../app/CaseStore";
import { Badge } from "../components/Button";
import { Card } from "../components/Card";
import { flagLabels, flagMarkers, flagTone, stageLabels, stageTone } from "../types/labels";

export function UserCasesPage() {
  const { state } = useStore();
  const cases = state.cases;

  return (
    <div className="stack">
      <header className="page-header">
        <div className="page-header__row">
          <h1>Мои дела</h1>
          <Link to="/cases/new" className="btn btn--primary">
            Создать новое дело
          </Link>
        </div>
        <p className="page-header__subtitle">
          По каждому делу видно текущий этап, кто должен действовать и какое событие ожидается.
        </p>
      </header>

      {cases.length === 0 ? (
        <p className="empty">Дел пока нет.</p>
      ) : (
        <div className="grid grid--two">
          {cases.map((caseItem) => (
            <CaseCard key={caseItem.id} caseItem={caseItem} />
          ))}
        </div>
      )}
    </div>
  );
}

function CaseCard({ caseItem }: { caseItem: Case }) {
  const openTasks = caseItem.tasks.filter((task) => task.status === "open");
  const expected = caseItem.expectedEvent;

  return (
    <Card
      title={caseItem.title}
      meta={`${caseItem.number} · ${caseItem.category} · создано ${caseItem.createdAt}`}
      tone={caseItem.stage === "CLOSED" ? "default" : "accent"}
      footer={
        <>
          <Link to={`/cases/${caseItem.id}`} className="btn btn--primary">
            Открыть карточку дела
          </Link>
          {caseItem.stage === "LAWYER_REVIEW" ? (
            <span className="subtle">Дело передано юристу</span>
          ) : null}
        </>
      }
    >
      <div className="row" style={{ marginBottom: 12 }}>
        <Badge tone={stageTone[caseItem.stage]} marker="●">
          {stageLabels[caseItem.stage]}
        </Badge>
        {caseItem.flags.map((flag) => (
          <Badge key={flag} tone={flagTone[flag]} marker={flagMarkers[flag]}>
            {flagLabels[flag]}
          </Badge>
        ))}
      </div>

      <p className="small">{caseItem.summary}</p>

      <div className="case-card__next">
        <span className="case-card__next-label">
          {caseItem.outcome ? "Итог" : expected ? "Ожидается" : "Следующий шаг"}
        </span>
        <strong>{caseItem.outcome ? caseItem.outcome.title : (expected?.title ?? "Выберите действие в карточке дела")}</strong>
      </div>

      {openTasks.length > 0 ? (
        <p className="subtle">
          Открытых задач: {openTasks.length}. Ответственный:{" "}
          {openTasks.map((task) => task.assignee).join(", ")}.
        </p>
      ) : null}
    </Card>
  );
}