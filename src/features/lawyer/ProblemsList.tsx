import type { Case } from "../../types/domain";
import { Badge } from "../../components/Button";
import { Card } from "../../components/Card";

/** Проблемные места дела, выявленные AI или юристом (docs/prototype.md §21). */
export function ProblemsList({ caseItem }: { caseItem: Case }) {
  const issues = caseItem.issues ?? [];

  return (
    <Card title="Проблемные места" tone="warning">
      {issues.length === 0 ? (
        <p className="small">Явных проблем не выявлено.</p>
      ) : (
        <ul className="issue-list">
          {issues.map((issue) => (
            <li key={issue.id} className="issue-list__item">
              <Badge tone={issue.severity === "warning" ? "attention" : "neutral"} marker={issue.severity === "warning" ? "⚠" : "i"}>
                {issue.severity === "warning" ? "Требует проверки" : "Замечание"}
              </Badge>
              <span>{issue.text}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}