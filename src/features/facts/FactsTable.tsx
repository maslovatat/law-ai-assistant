import { useState } from "react";
import type { Case, CaseFact, FactSource } from "../../types/domain";
import { factSourceKindLabels, factStateLabels, factStateMarkers, factStateTone } from "../../types/labels";
import { Badge } from "../../components/Button";
import { Button } from "../../components/Button";
import { sortFactsByTitle } from "../../lib/mock/ids";

interface FactsTableProps {
  caseItem: Case;
  /** Источник по id документа открывается в просмотрщике документов. */
  onOpenDocument?: (documentId: string) => void;
  highlightConflict?: boolean;
}

/** Таблица фактов дела с указанием источников и состояния каждого факта (§6, §9). */
export function FactsTable({ caseItem, onOpenDocument, highlightConflict }: FactsTableProps) {
  const [onlyProblems, setOnlyProblems] = useState(false);
  const facts = sortFactsByTitle(caseItem.facts);
  const filtered = onlyProblems
    ? facts.filter((fact) => fact.state === "CONFLICT" || fact.state === "REQUIRES_LAWYER" || fact.requiresClarification)
    : facts;

  const confirmedByDocument = facts.filter((f) => f.state === "CONFIRMED_BY_DOCUMENT").length;
  const confirmedByUser = facts.filter((f) => f.state === "CONFIRMED_BY_USER").length;
  const problems = facts.filter(
    (f) => f.state === "CONFLICT" || f.state === "REQUIRES_LAWYER" || f.requiresClarification,
  ).length;

  return (
    <div className="stack">
      <div className="row row--between">
        <div className="row">
          <Badge tone="success" marker="✓">
            Подтверждено документом: {confirmedByDocument}
          </Badge>
          <Badge tone="success" marker="✓">
            Подтверждено пользователем: {confirmedByUser}
          </Badge>
          {problems > 0 ? (
            <Badge tone="danger" marker="⚠">
              Требует внимания: {problems}
            </Badge>
          ) : null}
        </div>
        <Button small onClick={() => setOnlyProblems((prev) => !prev)}>
          {onlyProblems ? "Показать все факты" : "Показать только проблемные"}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="empty">Факты ещё не собраны.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Факт</th>
                <th scope="col">Значение</th>
                <th scope="col">Источник</th>
                <th scope="col">Состояние</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((fact) => (
                <FactRow key={fact.id} fact={fact} onOpenDocument={onOpenDocument} highlight={highlightConflict} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FactRow({
  fact,
  onOpenDocument,
  highlight,
}: {
  fact: CaseFact;
  onOpenDocument?: (documentId: string) => void;
  highlight?: boolean;
}) {
  return (
    <tr className={highlight && fact.state === "CONFLICT" ? "table__row--conflict" : undefined}>
      <th scope="row">{fact.title}</th>
      <td>
        {fact.value}
        {fact.conflict ? (
          <div className="conflict-block">
            <div className="conflict-block__title">
              <Badge tone="danger" marker="⚠">
                Обнаружено противоречие
              </Badge>
            </div>
            <p className="small">Невозможно надёжно определить правильное значение. Источники расходятся:</p>
            <ul className="conflict-variants">
              {fact.conflict.variants.map((variant, index) => (
                <li key={index}>
                  <strong className="mono-num">{variant.value}</strong> — {variant.source.label}
                  {variant.source.documentId && onOpenDocument ? (
                    <>
                      {" "}
                      <Button
                        small
                        onClick={() => onOpenDocument(variant.source.documentId as string)}
                        aria-label={`Показать источник: ${variant.source.label}`}
                      >
                        Показать источник
                      </Button>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="subtle" style={{ marginBottom: 0 }}>
              Выбор значения не выполняется системой автоматически: уточните дату или передайте дело юристу.
            </p>
          </div>
        ) : null}
      </td>
      <td>
        <ul className="source-list">
          {fact.sources.map((source) => (
            <li key={source.id}>
              <SourceLabel source={source} onOpenDocument={onOpenDocument} />
            </li>
          ))}
        </ul>
      </td>
      <td>
        <Badge tone={factStateTone[fact.state]} marker={factStateMarkers[fact.state]}>
          {factStateLabels[fact.state]}
        </Badge>
      </td>
    </tr>
  );
}

function SourceLabel({
  source,
  onOpenDocument,
}: {
  source: FactSource;
  onOpenDocument?: (documentId: string) => void;
}) {
  return (
    <span className="source">
      <span className="source__kind">{factSourceKindLabels[source.kind]}</span>
      {source.label ? <span className="source__label">{source.label}</span> : null}
      {source.documentId && onOpenDocument ? (
        <Button small onClick={() => onOpenDocument(source.documentId as string)} aria-label={`Открыть документ: ${source.label}`}>
          Открыть
        </Button>
      ) : null}
    </span>
  );
}