import type { DocumentAttachment } from "../../types/domain";
import { formatBytes } from "../../lib/utils";

interface DocumentPreviewProps {
  document: DocumentAttachment;
  /** Документ доступен для просмотра (иначе показывается сообщение о необходимости загрузить). */
  available: boolean;
}

/**
 * Mock-просмотрщик документа (docs/prototype2.md §27).
 * Не требует реальной PDF обработки: показывает метаданные файла и placeholder.
 */
export function DocumentPreview({ document, available }: DocumentPreviewProps) {
  return (
    <div className="doc-preview">
      <div className="doc-preview__header">
        <div className="doc-preview__icon">📄</div>
        <div>
          <strong>{document.name}</strong>
          <div className="card__meta">
            {document.mimeType} · {formatBytes(document.size)}
            {document.pageCount ? ` · ${document.pageCount} стр.` : ""}
          </div>
        </div>
      </div>

      <div className="doc-preview__content">
        {available ? (
          <div className="doc-preview__placeholder">
            <p>Демонстрационный просмотр документа.</p>
            <p className="subtle small">
              Настоящий PDF не обрабатывается в прототипе. Отображается placeholder.
            </p>
          </div>
        ) : (
          <div className="doc-preview__placeholder">
            <p>Документ недоступен.</p>
            <p className="subtle small">
              Перезагрузите страницу и загрузите документ повторно, чтобы просматривать его содержимое.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
