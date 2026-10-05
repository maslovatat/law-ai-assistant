import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { ActionId, Case } from "../types/domain";
import { useStore } from "../app/CaseStore";
import { Badge, Button } from "../components/Button";
import { Card } from "../components/Card";
import { Notice } from "../components/Notice";
import { PrototypeNotice } from "../components/PrototypeNotice";
import { Tabs, type TabItem } from "../components/Tabs";
import { CaseStatusHeader } from "../features/cases/CaseStatusHeader";
import { ExpectedEventCard } from "../features/cases/ExpectedEventCard";
import { Timeline } from "../features/cases/Timeline";
import { FactsTable } from "../features/facts/FactsTable";
import { DocumentList } from "../features/documents/DocumentList";
import { DocumentViewer } from "../features/documents/DocumentViewer";
import { AiPanel } from "../features/ai/AiPanel";
import { RecommendationList } from "../features/ai/RecommendationList";
import { ActionPanel } from "../features/workflow/ActionPanel";
import { Checklist } from "../features/workflow/Checklist";
import { TaskList } from "../features/workflow/TaskList";
import { buildClaimChecklist, buildCourtPreparationChecklist, sendChecklistLabels } from "../lib/checklists";
import { getAction } from "../lib/actions";

type TabId = "overview" | "ai" | "facts" | "documents" | "history";

const baseTabs: TabItem<TabId>[] = [
  { id: "overview", label: "Обзор" },
  { id: "ai", label: "AI" },
  { id: "facts", label: "Факты" },
  { id: "documents", label: "Документы" },
  { id: "history", label: "История" },
];

export function UserCasePage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { state, dispatch, getCase, actionsFor } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as TabId | null;
  const [tab, setTabState] = useState<TabId>(tabParam ?? "overview");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | undefined>(undefined);

  const setTab = (next: TabId) => {
    setTabState(next);
    setSearchParams(next === "overview" ? {} : { tab: next }, { replace: true });
  };

  const caseItem = caseId ? getCase(caseId) : undefined;

  const openDocument = (documentId: string) => {
    setSelectedDocumentId(documentId);
    setTab("documents");
  };

  const openTab = (target: TabId) => setTab(target);

  const run = (actionId: ActionId, payload: Record<string, string>) => {
    if (!caseItem) return;
    if (actionId === "VIEW_FACTS") {
      openTab("facts");
      return;
    }
    if (actionId === "START_INTERVIEW") {
      dispatch({ type: "startInterview", caseId: caseItem.id });
      openTab("ai");
      return;
    }
    if (actionId === "REVIEW_COUNTERPARTY_REPLY") {
      const reply = caseItem.documents.find((d) => d.kind === "counterparty_reply");
      if (reply) openDocument(reply.id);
      return;
    }
    dispatch({ type: "runAction", caseId: caseItem.id, actionId, payload });
  };

  if (!caseItem) {
    return (
      <div className="stack">
        <h1>Дело не найдено</h1>
        <p className="muted">Возможно, дело было закрыто или сброшено демо-состояние.</p>
        <Link to="/cases" className="btn btn--primary">
          Вернуться к списку дел
        </Link>
      </div>
    );
  }

  const actions = actionsFor(caseItem);
  const tabs: TabItem<TabId>[] = baseTabs.map((item) =>
    item.id === "facts"
      ? { ...item, badge: String(caseItem.facts.length) }
      : item.id === "documents"
        ? { ...item, badge: String(caseItem.documents.length) }
        : item,
  );

  return (
    <div className="stack">
      <header className="page-header">
        <div className="page-header__row">
          <div>
            <h1>{caseItem.title}</h1>
            <p className="page-header__subtitle">
              {caseItem.number} · {caseItem.category} · создано {caseItem.createdAt} · контрагент:{" "}
              {caseItem.counterparty}
            </p>
          </div>
          <div className="row">
            <span className="subtle">Демонстрационная дата: {formatToday(state.today)}</span>
          </div>
        </div>
      </header>

      {state.notice ? (
        <Notice tone={state.notice.tone} title={state.notice.title} onClose={() => dispatch({ type: "dismissNotice" })}>
          {state.notice.message}
        </Notice>
      ) : null}

      <CaseStatusHeader caseItem={caseItem} />

      <div className="grid grid--sidebar">
        <div className="stack">
          <div>
            <Tabs items={tabs} active={tab} onChange={setTab} />
            {tab === "overview" ? (
              <OverviewTab caseItem={caseItem} onOpenDocument={openDocument} onOpenTab={openTab} />
            ) : null}
            {tab === "ai" ? (
              <AiPanel caseItem={caseItem} onOpenDocument={openDocument} onRun={run} />
            ) : null}
            {tab === "facts" ? (
              <div className="stack">
                <FactsTable caseItem={caseItem} onOpenDocument={openDocument} highlightConflict />
              </div>
            ) : null}
            {tab === "documents" ? (
              <DocumentsTab
                caseItem={caseItem}
                selectedDocumentId={selectedDocumentId}
                onSelect={(id) => setSelectedDocumentId(id)}
              />
            ) : null}
            {tab === "history" ? (
              <div className="stack">
                <Card title="История дела" meta="События в хронологическом порядке">
                  <Timeline caseItem={caseItem} />
                </Card>
                <Card title="Задачи">
                  <TaskList caseItem={caseItem} />
                </Card>
              </div>
            ) : null}
          </div>

          <ActionPanel
            caseItem={caseItem}
            actions={actions}
            hidden={tab === "facts" ? ["VIEW_FACTS"] : []}
            onRun={run}
          />
        </div>

        <aside className="stack">
          <ExpectedEventCard
            caseItem={caseItem}
            today={state.today}
            nextAction={
              caseItem.expectedEvent?.actionId ? (
                <Button variant="primary" onClick={() => run(caseItem.expectedEvent!.actionId as ActionId, {})}>
                  {getAction(caseItem.expectedEvent.actionId).label}
                </Button>
              ) : null
            }
          />

          {caseItem.stage === "LAWYER_REVIEW" ? (
            <Card title="Почему подключён юрист" tone="ai">
              <p className="small">{caseItem.transferReason ?? "Дело передано на профессиональную проверку."}</p>
              <p className="subtle">Юрист работает с фактами, источниками и документами дела.</p>
            </Card>
          ) : null}

          <Card title="Кратко о деле">
            <p className="small">{caseItem.summary}</p>
            <details className="disclosure">
              <summary>Ситуация пользователя</summary>
              <div className="disclosure__body small">{caseItem.situation}</div>
            </details>
          </Card>

          <PrototypeNotice />
        </aside>
      </div>

      <div className="btn-row">
        <Button onClick={() => navigate("/cases")}>К списку дел</Button>
        <Button onClick={() => dispatch({ type: "resetDemo" })}>Сбросить демо-состояние</Button>
      </div>
    </div>
  );
}

function OverviewTab({
  caseItem,
  onOpenDocument,
  onOpenTab,
}: {
  caseItem: Case;
  onOpenDocument: (documentId: string) => void;
  onOpenTab: (tab: TabId) => void;
}) {
  const { dispatch, recommendationsFor } = useStore();
  const recommendations = recommendationsFor(caseItem);
  const claimChecklist = useMemo(() => buildClaimChecklist(caseItem), [caseItem]);
  const courtChecklist = useMemo(() => buildCourtPreparationChecklist(caseItem), [caseItem]);
  const conflictFacts = caseItem.facts.filter((fact) => fact.state === "CONFLICT");

  const run = (actionId: ActionId, payload: Record<string, string>) => {
    if (actionId === "VIEW_FACTS") {
      onOpenTab("facts");
      return;
    }
    if (actionId === "START_INTERVIEW") {
      dispatch({ type: "startInterview", caseId: caseItem.id });
      onOpenTab("ai");
      return;
    }
    dispatch({ type: "runAction", caseId: caseItem.id, actionId, payload });
  };

  const claim = caseItem.documents.find((document) => document.kind === "claim");

  return (
    <div className="stack">
      <Card
        title="Что мы узнали"
        meta="Факты и их источники. Часть сведений подтверждена документами, часть — только сообщением пользователя."
        actions={<Button small onClick={() => onOpenTab("facts")}>Открыть все факты</Button>}
      >
        {conflictFacts.length > 0 ? (
          <div className="callout callout--danger" style={{ marginBottom: 16 }}>
            <strong>⚠ Обнаружено противоречие.</strong> Невозможно надёжно определить правильное значение:{" "}
            {conflictFacts.map((fact) => fact.title).join(", ")}. AI не выбирает значение самостоятельно — уточните его
            или передайте дело юристу.
          </div>
        ) : null}
        <FactsTable caseItem={caseItem} onOpenDocument={onOpenDocument} highlightConflict />
      </Card>

      {caseItem.stage === "INTAKE" || caseItem.stage === "INFO_COLLECTION" ? (
        <Card title="Что дальше" tone="accent">
          <p className="small">
            AI задаст уточняющие вопросы, чтобы собрать факты дела и указать источник каждого из них.
          </p>
          <Button
            variant="primary"
            onClick={() => {
              dispatch({ type: "startInterview", caseId: caseItem.id });
              onOpenTab("ai");
            }}
          >
            Начать AI-интервью
          </Button>
        </Card>
      ) : null}

      {caseItem.stage === "ANALYSIS" ? (
        <RecommendationList caseItem={caseItem} recommendations={recommendations} onRun={run} />
      ) : null}

      {caseItem.stage === "CLAIM_PREPARATION" ? (
        <div className="stack">
          <Card
            title={
              claimChecklist.missingCount === 0
                ? "Для подготовки претензии достаточно данных"
                : "Для подготовки претензии не хватает данных"
            }
            tone={claimChecklist.missingCount === 0 ? "success" : "warning"}
            meta="Проверка выполняется по данным дела перед формированием документа."
          >
            <ul className="checklist">
              {claimChecklist.items.map((item) => (
                <li
                  key={item.id}
                  className={`checklist__item ${item.status === "have" ? "checklist__item--have" : "checklist__item--missing"}`}
                >
                  <span className="checklist__marker" aria-hidden="true">
                    {item.status === "have" ? "✓" : "○"}
                  </span>
                  <span>
                    {item.label}
                    {item.hint ? <div className="subtle">{item.hint}</div> : null}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}

      {claim && (caseItem.stage === "CLAIM_APPROVAL" || caseItem.stage === "SENT" || caseItem.stage === "AWAITING_RESPONSE") ? (
        <Card
          title="Проект претензии"
          tone={caseItem.stage === "CLAIM_APPROVAL" ? "accent" : "default"}
          meta="Документ подготовлен на основании данных дела"
          actions={<Button small onClick={() => onOpenTab("documents")}>Открыть в просмотрщике</Button>}
        >
          <p className="small">
            {caseItem.stage === "CLAIM_APPROVAL"
              ? "Документ является проектом и ещё не отправлен."
              : "Документ подтверждён пользователем."}
          </p>
          {caseItem.stage === "SENT" ? (
            <>
              <p className="small">Перед отправкой проверьте адресата, содержание документа и приложения.</p>
              <ul className="checklist">
                {sendChecklistLabels.map((label, index) => (
                  <li key={label} className="checklist__item checklist__item--have">
                    <span className="checklist__marker" aria-hidden="true">
                      {index < 3 ? "✓" : "○"}
                    </span>
                    <span>
                      {label}
                      {index === 3 ? <div className="subtle">Подтверждается при выполнении демонстрационной отправки.</div> : null}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="callout callout--warning">
                Отправка в прототипе является симуляцией: реального документа отправлено не было.
              </p>
            </>
          ) : null}
          {caseItem.stage === "AWAITING_RESPONSE" ? (
            <p className="callout">
              Документ передан через демонстрационный канал. Это демонстрационное событие — реальной отправки не
              производилось.
            </p>
          ) : null}
        </Card>
      ) : null}

      {caseItem.stage === "RESULT_ANALYSIS" ? (
        <Card title="Ответ на претензию" tone="warning" meta="Оцените, удовлетворяет ли вас ответ контрагента">
          <p className="small">
            Продавец отказал в удовлетворении требования и предложил платную диагностику за свой счёт.
          </p>
          <div className="btn-row">
            <Button
              variant="primary"
              onClick={() => {
                const reply = caseItem.documents.find((d) => d.kind === "counterparty_reply");
                if (reply) onOpenDocument(reply.id);
              }}
            >
              Открыть ответ продавца
            </Button>
          </div>
          <p className="subtle" style={{ marginTop: 12 }}>
            Если ответ не удовлетворяет, выберите действие «Ответ не удовлетворяет, продолжить дело» в панели действий.
          </p>
        </Card>
      ) : null}

      {caseItem.stage === "COURT_PREPARATION" ? (
        <Checklist checklist={courtChecklist} onOpenDocument={onOpenDocument} />
      ) : null}

      {caseItem.stage === "LAWYER_REVIEW" ? (
        <Card title="Дело передано юристу" tone="ai">
          <p className="small">
            Материалы дела переданы юристу. Он видит факты, источники, документы, историю и рекомендацию AI.
          </p>
          {caseItem.lawyerDecisions.length > 0 ? (
            <ul>
              {caseItem.lawyerDecisions.map((decision) => (
                <li key={decision.id} className="small">
                  <strong>{decision.title}</strong> — {decision.lawyerName}, {decision.createdAt}
                  {decision.comment ? <div className="muted">{decision.comment}</div> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}

      {caseItem.stage === "CLOSED" ? (
        <Card title="Дело завершено" tone="default">
          <p className="small">
            Сопровождение прекращено: {caseItem.outcome?.title ?? "дело закрыто"}. История и материалы сохранены в
            деле.
          </p>
        </Card>
      ) : null}

      {caseItem.stage === "AWAITING_RESPONSE" ? (
        <Card title="Ожидание ответа" tone="accent">
          <p className="small">
            Дело ожидает ответа контрагента до 20.10.2026. Ответственный: продавец. Если срок истёк, сообщите об этом
            в панели действий.
          </p>
          <Badge tone="attention" marker="⧗">
            Ожидаем контрагента
          </Badge>
        </Card>
      ) : null}

      <Card title="Документы дела" meta={`Всего документов: ${caseItem.documents.length}`}>
        <DocumentList caseItem={caseItem} onSelect={onOpenDocument} />
      </Card>
    </div>
  );
}

function DocumentsTab({
  caseItem,
  selectedDocumentId,
  onSelect,
}: {
  caseItem: Case;
  selectedDocumentId?: string;
  onSelect: (documentId: string) => void;
}) {
  const selected = useMemo(() => {
    const byId = caseItem.documents.find((d) => d.id === selectedDocumentId);
    return byId ?? caseItem.documents[0];
  }, [caseItem.documents, selectedDocumentId]);

  return (
    <div className="grid grid--sidebar">
      <div>
        {selected ? (
          <DocumentViewer
            document={selected}
            basedOn={selected.basedOnFactIds
              ?.map((id) => caseItem.facts.find((fact) => fact.id === id))
              .filter((fact): fact is NonNullable<typeof fact> => Boolean(fact))
              .map((fact) => ({ id: fact.id, title: fact.title, value: fact.value }))}
          />
        ) : (
          <p className="empty">Документы по делу пока не поступали.</p>
        )}
      </div>
      <aside>
        <Card title="Все документы">
          <DocumentList caseItem={caseItem} selectedId={selected?.id} onSelect={onSelect} />
        </Card>
      </aside>
    </div>
  );
}

function formatToday(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}
