import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { ActionId, Case } from "../types/domain";
import { useStore } from "../app/CaseStore";
import { Button } from "../components/Button";
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
import { ChatThread } from "../features/messaging/ChatThread";
import { ActionPanel } from "../features/workflow/ActionPanel";
import { TaskList } from "../features/workflow/TaskList";
import { ProblemsList } from "../features/lawyer/ProblemsList";
import { AiProposalBlock, LawyerDecisionList } from "../features/lawyer/LawyerReviewBlocks";
import { LawyerMessageComposer } from "../features/lawyer/LawyerMessageComposer";

type LawyerTab = "overview" | "facts" | "documents" | "review" | "communication" | "history";

const tabs: TabItem<LawyerTab>[] = [
  { id: "overview", label: "Обзор" },
  { id: "facts", label: "Факты" },
  { id: "documents", label: "Документы" },
  { id: "review", label: "Проверка" },
  { id: "communication", label: "Общение" },
  { id: "history", label: "История" },
];

/** Карточка дела в кабинете юриста (docs/prototype.md §21). */
export function LawyerCasePage() {
  const { caseId } = useParams();
  const { state, dispatch, getCase, actionsFor } = useStore();
  const [tab, setTab] = useState<LawyerTab>("overview");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | undefined>(undefined);

  const caseItem = caseId ? getCase(caseId) : undefined;

  const openDocument = (documentId: string) => {
    setSelectedDocumentId(documentId);
    setTab("documents");
  };

  const run = (actionId: ActionId, payload: Record<string, string>) => {
    if (!caseItem) return;
    if (actionId === "VIEW_FACTS") {
      setTab("facts");
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
        <Link to="/lawyer/queue" className="btn btn--primary">
          Вернуться к очереди
        </Link>
      </div>
    );
  }

  const actions = actionsFor(caseItem);
  const counterpartyReply = caseItem.documents.find((d) => d.kind === "counterparty_reply");

  return (
    <div className="stack">
      <header className="page-header">
        <div className="page-header__row">
          <div>
            <h1>{caseItem.title}</h1>
            <p className="page-header__subtitle">
              {caseItem.number} · {caseItem.category} · пользователь: Ирина Соколова (демо)
            </p>
          </div>
          <div className="btn-row">
            <Link to="/lawyer/queue" className="btn">
              К очереди дел
            </Link>
            <Button onClick={() => dispatch({ type: "setRole", role: "user" })}>Режим пользователя</Button>
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
          <Tabs items={tabs} active={tab} onChange={setTab} />

          {tab === "overview" ? (
            <div className="stack">
              <Card title="Краткое описание">
                <p className="small">{caseItem.summary}</p>
                <p className="subtle">Ситуация пользователя: {caseItem.situation}</p>
              </Card>

              <Card title="Что было сделано по делу">
                <ol className="small">
                  <li>Обращение к продавцу</li>
                  <li>Попытка мирного урегулирования</li>
                  <li>Подготовка и подтверждение претензии</li>
                  <li>Демонстрационная передача документа</li>
                  <li>Получен отказ контрагента</li>
                  <li>Начата подготовка следующего этапа</li>
                </ol>
              </Card>

              <Card title="История дела">
                <Timeline caseItem={caseItem} />
              </Card>
            </div>
          ) : null}

          {tab === "facts" ? (
            <div className="stack">
              <Card title="Факты дела" meta="Все собранные факты с источниками и состоянием подтверждения">
                <FactsTable caseItem={caseItem} onOpenDocument={openDocument} highlightConflict />
              </Card>
            </div>
          ) : null}

          {tab === "documents" ? (
            <LawyerDocumentsTab
              caseItem={caseItem}
              selectedDocumentId={selectedDocumentId}
              onSelect={(id) => setSelectedDocumentId(id)}
            />
          ) : null}

          {tab === "review" ? (
            <div className="stack">
              <AiProposalBlock caseItem={caseItem} />
              <ProblemsList caseItem={caseItem} />
              <LawyerDecisionList caseItem={caseItem} />
            </div>
          ) : null}

          {tab === "communication" ? (
            <div className="stack">
              <Card
                title="Общение с пользователем"
                meta="Юрист может уточнить сведения, если данных не хватает или они противоречат друг другу"
              >
                <ChatThread caseItem={caseItem} onOpenDocument={openDocument} />
              </Card>
              <LawyerMessageComposer
                caseItem={caseItem}
                onSend={(text) => run("SEND_LAWYER_MESSAGE", { text })}
              />
            </div>
          ) : null}

          {tab === "history" ? (
            <div className="stack">
              <Card title="Полная история дела">
                <Timeline caseItem={caseItem} />
              </Card>
              <Card title="Задачи">
                <TaskList caseItem={caseItem} />
              </Card>
            </div>
          ) : null}

          {counterpartyReply && tab === "overview" ? (
            <Card title="Ответ на претензию" meta="Полный mock-ответ контрагента">
              <Button small onClick={() => openDocument(counterpartyReply.id)}>
                Открыть «{counterpartyReply.name}»
              </Button>
            </Card>
          ) : null}

          <ActionPanel
            caseItem={caseItem}
            actions={actions}
            hidden={["VIEW_FACTS"]}
            onRun={run}
            title="Действия юриста"
          />
        </div>

        <aside className="stack">
          <ExpectedEventCard caseItem={caseItem} today={state.today} />

          <Card title="Почему дело передано">
            <p className="small">{caseItem.transferReason ?? "Дело передано на профессиональную проверку."}</p>
            <p className="subtle">Передано: {caseItem.transferredAt ?? "—"}</p>
          </Card>

          <Card title="Предложение AI и решение юриста">
            <p className="small muted">
              Предложение AI — возможный вариант действий. Решение юриста — профессиональная оценка. Они отображаются
              раздельно и не подменяют друг друга.
            </p>
          </Card>

          <PrototypeNotice />
        </aside>
      </div>
    </div>
  );
}

function LawyerDocumentsTab({
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
