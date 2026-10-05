import { useMemo, useState } from "react";
import type { ActionId, Case, InterviewAnswer } from "../../types/domain";
import { useStore } from "../../app/CaseStore";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";

interface InterviewViewProps {
  caseItem: Case;
  onAnswer: (answer: InterviewAnswer) => void;
  onComplete: () => void;
  onRun?: (actionId: ActionId, payload: Record<string, string>) => void;
}

/**
 * Mock-интервью AI. Настоящий LLM не используется: вопросы и варианты ответов
 * подготовлены заранее (docs/prototype.md §5, §31).
 */
export function InterviewView({ caseItem, onAnswer, onComplete }: InterviewViewProps) {
  const { scripts } = useStore();
  const script = caseItem.id === "LC-2026-002" ? scripts.contradiction : scripts.interview;
  const answers = caseItem.interviewAnswers ?? [];
  const answeredIds = useMemo(() => new Set(answers.map((a) => a.questionId)), [answers]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  const currentIndex = script.questions.findIndex((question) => !answeredIds.has(question.id));
  const current = currentIndex >= 0 ? script.questions[currentIndex] : undefined;
  const progress = `${answers.length} из ${script.questions.length}`;

  return (
    <div className="stack">
      <Card
        title="AI-интервью"
        tone="ai"
        meta={`Отвечайте на вопросы — ответы сохранятся как факты дела с указанием источника. ${progress}.`}
      >
        {script.intro.map((line, index) => (
          <p key={index} className="small">
            {line}
          </p>
        ))}
      </Card>

      {current ? (
        <Card title={`Вопрос ${currentIndex + 1} из ${script.questions.length}`}>
          <p className="interview-question">{current.text}</p>
          {current.aiFollowUp ? <p className="callout callout--warning small">{current.aiFollowUp}</p> : null}

          <div className="choice-list">
            {current.options.map((option) => (
              <button
                key={option.value}
                type="button"
                className="choice"
                onClick={() =>
                  onAnswer({
                    questionId: current.id,
                    value: customValues[current.id]?.trim() || option.value,
                    answeredAt: "сейчас",
                  })
                }
              >
                <span className="choice__dot" aria-hidden="true" />
                <span>
                  {option.label}
                  {option.label.includes("опишу текстом") ? (
                    <span className="subtle"> — введите свой ответ в поле ниже</span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>

          <div className="field" style={{ marginTop: 16 }}>
            <label className="field__label" htmlFor={`custom-${current.id}`}>
              Свой ответ (необязательно)
            </label>
            <input
              id={`custom-${current.id}`}
              className="input"
              placeholder="Например: 12.08.2026 — точная дата"
              value={customValues[current.id] ?? ""}
              onChange={(event) =>
                setCustomValues((prev) => ({ ...prev, [current.id]: event.target.value }))
              }
            />
            <span className="field__hint">
              Значение из этого поля будет сохранено вместо выбранного варианта.
            </span>
          </div>
        </Card>
      ) : (
        <Card title="Все вопросы заданы" tone="success">
          <p className="small">Ответы сохранены как факты дела. Проверьте их перед продолжением.</p>
          <Button variant="primary" onClick={onComplete}>
            Завершить интервью и перейти к анализу
          </Button>
        </Card>
      )}

      {answers.length > 0 ? (
        <details className="disclosure">
          <summary>Ответы ({answers.length})</summary>
          <div className="disclosure__body">
            <ul>
              {answers.map((answer) => {
                const question = script.questions.find((q) => q.id === answer.questionId);
                return (
                  <li key={answer.questionId}>
                    <span className="muted">{question?.text ?? answer.questionId}:</span>{" "}
                    <strong>{answer.value}</strong>
                  </li>
                );
              })}
            </ul>
          </div>
        </details>
      ) : null}
    </div>
  );
}