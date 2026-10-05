import type { Case } from "../../types/domain";
import { Card } from "../../components/Card";
import { Badge } from "../../components/Button";
import { aiDisclaimer, lawyerDecisionLabels } from "../../types/labels";

/** Предложение AI, оформленное отдельно от решения юриста (docs/prototype.md §21). */
export function AiProposalBlock({ caseItem }: { caseItem: Case }) {
  const latest = caseItem.recommendations.slice(-2);

  return (
    <Card title="Предложение системы (AI)" tone="ai">
      <p className="subtle">{aiDisclaimer}</p>
      {latest.length === 0 ? (
        <p className="small">AI ещё не формировал предложений по этому делу.</p>
      ) : (
        latest.map((recommendation) => (
          <div key={recommendation.id} className="callout" style={{ marginTop: 12 }}>
            <strong>{recommendation.title}</strong>
            <div className="small">{recommendation.description}</div>
            <ul className="small">
              {recommendation.reasons.map((reason, index) => (
                <li key={index}>{reason.text}</li>
              ))}
            </ul>
            {recommendation.recommended ? (
              <Badge tone="ai" marker="★">
                Рекомендуемый вариант
              </Badge>
            ) : null}
          </div>
        ))
      )}
    </Card>
  );
}

/** Решения юриста. Отображаются отдельно от предложения AI и не подменяют его. */
export function LawyerDecisionList({ caseItem }: { caseItem: Case }) {
  return (
    <Card title="Решение юриста" tone="accent" meta="Отображается отдельно от предложения AI">
      {caseItem.lawyerDecisions.length === 0 ? (
        <p className="small">Решение ещё не принято.</p>
      ) : (
        <ul className="stack stack--tight">
          {caseItem.lawyerDecisions.map((decision) => (
            <li key={decision.id} className="decision-card">
              <div className="row row--between">
                <strong>{decision.title}</strong>
                <span className="subtle mono-num">{decision.createdAt}</span>
              </div>
              <div className="subtle">{decision.lawyerName}</div>
              {decision.comment ? <p className="small">{decision.comment}</p> : null}
              <div className="small muted">Тип решения: {lawyerDecisionLabels[decision.type]}</div>
              {decision.requestedItems?.length ? (
                <div className="small">
                  Запрошено у пользователя:
                  <ul>
                    {decision.requestedItems.map((item) => (
                      <li key={item.id}>{item.label}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}