import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../app/CaseStore";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { PrototypeNotice } from "../components/PrototypeNotice";

const templates = [
  {
    id: "main",
    title: "Возврат денежных средств за неисправный товар",
    category: "Защита прав потребителей",
    sample:
      "Я купил холодильник, через месяц он перестал нормально работать. Я обратился в магазин, но мне сказали, что сначала нужно провести проверку.",
    script: "interview" as const,
    hint: "Основной демонстрационный сценарий проходит весь путь: интервью → мирное урегулирование → претензия → ответ продавца → передача юристу.",
  },
  {
    id: "contradiction",
    title: "Противоречие в данных о покупке",
    category: "Защита прав потребителей",
    sample: "Я купил товар 10.08.2026, а в чеке указано 12.08.2026. Что делать?",
    script: "contradiction" as const,
    hint: "Сценарий противоречия: источники расходятся, AI показывает оба варианта и не выбирает значение самостоятельно.",
  },
];

export function NewCasePage() {
  const { state, dispatch, scripts } = useStore();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(templates[0].id);
  const [situation, setSituation] = useState(templates[0].sample);
  const [errors, setErrors] = useState<string | null>(null);

  const template = templates.find((item) => item.id === selectedId) ?? templates[0];

  const selectTemplate = (id: string) => {
    const next = templates.find((item) => item.id === id) ?? templates[0];
    setSelectedId(id);
    setSituation(next.sample);
  };

  const submit = () => {
    if (situation.trim().length < 20) {
      setErrors("Опишите ситуацию подробнее: минимум 20 символов.");
      return;
    }
    setErrors(null);
    const script = template.script === "contradiction" ? scripts.contradiction : scripts.interview;
    const newCaseId = `LC-2026-${String(state.nextCaseNumber).padStart(3, "0")}`;
    dispatch({ type: "createCase", situation: situation.trim(), title: template.title, script });
    navigate(`/cases/${newCaseId}?tab=ai`);
  };

  return (
    <div className="stack">
      <header className="page-header">
        <h1>Новое дело</h1>
        <p className="page-header__subtitle">
          Опишите, что произошло. Из сообщения будет создано дело, а AI уточнит детали в интервью.
        </p>
      </header>

      <Card title="Шаблон демонстрационного дела" meta="В прототипе используются заранее подготовленные сценарии">
        <div className="choice-list">
          {templates.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`choice ${item.id === selectedId ? "choice--selected" : ""}`}
              onClick={() => selectTemplate(item.id)}
            >
              <span className="choice__dot" aria-hidden="true" />
              <span>
                <strong>{item.title}</strong>
                <div className="subtle">{item.category}</div>
                <div className="small muted" style={{ marginTop: 4 }}>
                  {item.hint}
                </div>
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card title="Опишите, что произошло">
        <div className="field">
          <label className="field__label" htmlFor="situation">
            Ваше сообщение
          </label>
          <textarea
            id="situation"
            className="textarea"
            value={situation}
            onChange={(event) => setSituation(event.target.value)}
            aria-describedby="situation-hint"
          />
          <span className="field__hint" id="situation-hint">
            Сообщение станет началом дела и попадёт в его историю.
          </span>
        </div>
        {errors ? (
          <p className="callout callout--danger" role="alert">
            {errors}
          </p>
        ) : null}
        <div className="btn-row">
          <Button variant="primary" onClick={submit}>
            Создать дело и начать интервью
          </Button>
          <Button onClick={() => setSituation(template.sample)}>Вернуть пример текста</Button>
        </div>
      </Card>

      <PrototypeNotice />
    </div>
  );
}