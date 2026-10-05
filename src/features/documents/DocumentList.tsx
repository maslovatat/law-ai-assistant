import type { Case } from "../../types/domain";
import { documentKindLabels, documentStatusLabels, documentStatusTone } from "../../types/labels";
import { Badge } from "../../components/Button";
import { Button } from "../../components/Button";

interface DocumentListProps {
  caseItem: Case;
  selectedId?: string;
  onSelect: (documentId: string) => void;
}

export function DocumentList({ caseItem, selectedId, onSelect }: DocumentListProps) {
  if (caseItem.documents.length === 0) {
    return <p className="empty">Документы по делу пока не поступали.</p>;
  }

  return (
    <ul className="doc-list">
      {caseItem.documents.map((document) => (
        <li key={document.id} className={`doc-list__item ${document.id === selectedId ? "doc-list__item--active" : ""}`}>
          <button type="button" className="doc-list__button" onClick={() => onSelect(document.id)}>
            <span className="doc-list__name">{document.name}</span>
            <span className="doc-list__meta">
              {documentKindLabels[document.kind]} · версия {document.version} · {document.createdAt}
            </span>
          </button>
          <div className="doc-list__status">
            <Badge tone={documentStatusTone[document.status]} marker="■">
              {documentStatusLabels[document.status]}
            </Badge>
            <Button small onClick={() => onSelect(document.id)} aria-label={`Открыть документ ${document.name}`}>
              Открыть
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}