import type { ChecklistResult } from "../../lib/checklists";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";

interface ChecklistProps {
  checklist: ChecklistResult;
  onOpenDocument?: (documentId: string) => void;
  onOpenFact?: (factId: string) => void;
}

/** Список данных дела: что уже есть и что необходимо получить (§11, §17). */
export function Checklist({ checklist, onOpenDocument, onOpenFact }: ChecklistProps) {
  const have = checklist.items.filter((item) => item.status === "have");
  const need = checklist.items.filter((item) => item.status === "missing");

  return (
    <Card
      title={checklist.title}
      meta={checklist.disclaimer}
      tone={need.length === 0 ? "success" : "default"}
    >
      <div className="grid grid--two">
        <div>
          <h4>Уже есть</h4>
          {have.length === 0 ? (
            <p className="subtle">Пока ничего не собрано.</p>
          ) : (
            <ul className="checklist">
              {have.map((item) => (
                <li key={item.id} className="checklist__item checklist__item--have">
                  <span className="checklist__marker" aria-hidden="true">
                    ✓
                  </span>
                  <span>
                    {item.label}
                    {item.factId && onOpenFact ? (
                      <Button small onClick={() => onOpenFact(item.factId as string)}>
                        Показать факт
                      </Button>
                    ) : null}
                    {item.documentId && onOpenDocument ? (
                      <Button small onClick={() => onOpenDocument(item.documentId as string)}>
                        Открыть документ
                      </Button>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h4>Необходимо получить</h4>
          {need.length === 0 ? (
            <p className="small">Все необходимые данные есть.</p>
          ) : (
            <ul className="checklist">
              {need.map((item) => (
                <li key={item.id} className="checklist__item checklist__item--missing">
                  <span className="checklist__marker" aria-hidden="true">
                    ○
                  </span>
                  <span>
                    {item.label}
                    {item.hint ? <div className="subtle">{item.hint}</div> : null}
                    {item.factId && onOpenFact ? (
                      <Button small onClick={() => onOpenFact(item.factId as string)}>
                        Показать факт
                      </Button>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}