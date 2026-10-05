import type { Case, Recommendation } from "../../types/domain";
import { aiDisclaimer } from "../../types/labels";
import { Button } from "../../components/Button";
import { Badge } from "../../components/Button";

interface RecommendationListProps {
  caseItem: Case;
  recommendations: Recommendation[];
  onRun: (actionId: Recommendation["actionId"], payload: Record<string, string>) => void;
  /** Действия, которые показываются отдельными кнопками на экране. */
  hidden?: Recommendation["actionId"][];
  title?: string;
}

/** Варианты действий, предложенные AI, с указанием оснований (§7, §8). */
export function RecommendationList({
  caseItem,
  recommendations,
  onRun,
  hidden = [],
  title = "Возможные варианты",
}: RecommendationListProps) {
  if (recommendations.length === 0) return null;

  const factTitle = (factId: string): string | undefined =>
    caseItem.facts.find((fact) => fact.id === factId)?.title;
  const documentName = (documentId: string): string | undefined =>
    caseItem.documents.find((document) => document.id === documentId)?.name;

  return (
    <section className="section">
      <div className="section__header">
        <h2>{title}</h2>
        <Badge tone="ai" marker="AI">
          Демонстрационная рекомендация AI
        </Badge>
      </div>

      <div className="grid grid--three">
        {recommendations.map((recommendation, index) => {
          const actionId = recommendation.actionId;
          return (
            <article key={recommendation.id} className={`rec-card ${recommendation.recommended ? "rec-card--recommended" : ""}`}>
              <div className="rec-card__head">
                <span className="rec-card__index">Вариант {index + 1}</span>
                {recommendation.recommended ? (
                  <Badge tone="ai" marker="★">
                    Рекомендуемый вариант
                  </Badge>
                ) : null}
              </div>
              <h3 className="rec-card__title">{recommendation.title}</h3>
              <p className="small">{recommendation.description}</p>

              <details className="disclosure">
                <summary>Основания предложения</summary>
                <div className="disclosure__body">
                  <ul>
                    {recommendation.reasons.map((reason, reasonIndex) => (
                      <li key={reasonIndex}>
                        {reason.text}
                        {reason.factIds?.length ? (
                          <div className="subtle">
                            Факты:{" "}
                            {reason.factIds.map((id) => factTitle(id) ?? id).join(", ")}
                          </div>
                        ) : null}
                        {reason.documentIds?.length ? (
                          <div className="subtle">
                            Документы:{" "}
                            {reason.documentIds.map((id) => documentName(id) ?? id).join(", ")}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  <p className="subtle" style={{ marginTop: 8, marginBottom: 0 }}>
                    {recommendation.disclaimer ?? aiDisclaimer}
                  </p>
                </div>
              </details>

              {hidden.includes(actionId) ? null : (
                <div className="rec-card__footer">
                  <Button
                    variant={recommendation.recommended ? "primary" : "secondary"}
                    onClick={() => onRun(actionId, {})}
                  >
                    {actionLabel(recommendation)}
                  </Button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function actionLabel(recommendation: Recommendation): string {
  switch (recommendation.actionId) {
    case "CHOOSE_PEACEFUL":
      return "Попробовать мирное решение";
    case "CHOOSE_CLAIM":
      return "Подготовить претензию";
    case "CHOOSE_LAWYER":
    case "TRANSFER_TO_LAWYER":
      return "Передать юристу";
    case "SEND_MOCK_CONTRADICTION_CLARIFICATION":
      return "Уточнить дату покупки";
    default:
      return recommendation.title;
  }
}