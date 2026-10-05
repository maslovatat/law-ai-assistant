import { useState } from "react";
import type { Case } from "../../types/domain";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";

interface LawyerMessageComposerProps {
  caseItem: Case;
  onSend: (text: string) => void;
}

const suggestions = [
  "Необходимо уточнить дату, когда вы впервые сообщили продавцу о неисправности.",
  "Просим подтвердить сумму дополнительных расходов и приложить документ, если он есть.",
];

/** Форма сообщения юриста пользователю (docs/prototype.md §22). */
export function LawyerMessageComposer({ caseItem, onSend }: LawyerMessageComposerProps) {
  const [text, setText] = useState("");
  const lastDecision = caseItem.lawyerDecisions[caseItem.lawyerDecisions.length - 1];

  return (
    <Card title="Новое сообщение пользователю">
      <div className="field">
        <label className="field__label" htmlFor="lawyer-message">
          Текст сообщения
        </label>
        <textarea
          id="lawyer-message"
          className="textarea"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Например: уточните, пожалуйста, дату обращения к продавцу"
        />
        {lastDecision?.requestedItems?.length ? (
          <span className="field__hint">
            По последнему решению запрошено: {lastDecision.requestedItems.map((item) => item.label).join("; ")}
          </span>
        ) : null}
      </div>
      <div className="btn-row">
        <Button variant="primary" disabled={text.trim().length < 3} onClick={() => onSend(text.trim())}>
          Отправить сообщение пользователю
        </Button>
      </div>
      <details className="disclosure" style={{ marginTop: 16 }}>
        <summary>Примеры сообщений</summary>
        <div className="disclosure__body">
          <ul>
            {suggestions.map((suggestion) => (
              <li key={suggestion}>
                <button type="button" className="btn btn--sm" onClick={() => setText(suggestion)}>
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </Card>
  );
}