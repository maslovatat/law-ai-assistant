import type { ActionId, Case } from "../../types/domain";
import { aiDisclaimer } from "../../types/labels";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { ChatThread } from "../messaging/ChatThread";
import { InterviewView } from "../interview/InterviewView";
import { useStore } from "../../app/CaseStore";

interface AiPanelProps {
  caseItem: Case;
  onOpenDocument: (documentId: string) => void;
  onRun: (actionId: ActionId, payload: Record<string, string>) => void;
}

/**
 * AI работает в контексте дела, а не как отдельный чат (docs/prototype.md §20, §30).
 */
export function AiPanel({ caseItem, onOpenDocument, onRun }: AiPanelProps) {
  const { dispatch } = useStore();
  const isInterviewStage = caseItem.stage === "INFO_COLLECTION";

  return (
    <div className="stack">
      <Card
        title="AI-помощник по делу"
        tone="ai"
        meta="AI собирает сведения, указывает источники фактов и предлагает возможные варианты действий."
      >
        <p className="subtle" style={{ margin: 0 }}>
          {aiDisclaimer}
        </p>
      </Card>

      {caseItem.stage === "INTAKE" ? (
        <Card title="AI-интервью" tone="accent">
          <p className="small">
            AI задаст уточняющие вопросы, а ваши ответы сохранятся как факты дела с указанием источника. Настоящий LLM
            не используется: вопросы подготовлены заранее.
          </p>
          <Button variant="primary" onClick={() => dispatch({ type: "startInterview", caseId: caseItem.id })}>
            Начать AI-интервью
          </Button>
        </Card>
      ) : null}

      {isInterviewStage ? (
        <InterviewView
          caseItem={caseItem}
          onAnswer={(answer) => dispatch({ type: "answerQuestion", caseId: caseItem.id, answer })}
          onComplete={() => dispatch({ type: "completeInterview", caseId: caseItem.id })}
          onRun={onRun}
        />
      ) : null}

      {caseItem.stage !== "INTAKE" && !isInterviewStage ? (
        <Card title="Переписка по делу" meta="Сообщения AI, пользователя, юриста и контрагента">
          <ChatThread caseItem={caseItem} onOpenDocument={onOpenDocument} />
        </Card>
      ) : null}

      {isInterviewStage ? (
        <Card title="Переписка по делу" meta="Сообщения AI и пользователя">
          <ChatThread caseItem={caseItem} onOpenDocument={onOpenDocument} />
        </Card>
      ) : null}
    </div>
  );
}