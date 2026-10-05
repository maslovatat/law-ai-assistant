import type { CaseDocument, DocumentBlock } from "../../types/domain";
import { documentKindLabels, documentStatusLabels, documentStatusTone } from "../../types/labels";
import { Badge } from "../../components/Button";

interface DocumentViewerProps {
  document: CaseDocument;
  /** Факты, использованные при подготовке документа. */
  basedOn?: Array<{ id: string; title: string; value: string }>;
}

/** Mock-просмотрщик документа: подготовленный текст вместо реального PDF/DOCX. */
export function DocumentViewer({ document, basedOn }: DocumentViewerProps) {
  return (
    <div className="doc-viewer">
      <div className="doc-viewer__toolbar">
        <div>
          <strong>{document.name}</strong>
          <div className="card__meta">
            {documentKindLabels[document.kind]} · версия {document.version} · {document.createdAt}
            {document.pageCount ? ` · ${document.pageCount} стр.` : ""}
          </div>
        </div>
        <Badge tone={documentStatusTone[document.status]} marker="■">
          {documentStatusLabels[document.status]}
        </Badge>
      </div>

      <div className="doc-viewer__page">
        <h3 className="doc-viewer__title">{document.content.title}</h3>
        {document.content.blocks.map((block, index) => (
          <DocumentBlockView key={index} block={block} />
        ))}
        {document.content.attachments?.length ? (
          <>
            <h4>Приложения</h4>
            <ul>
              {document.content.attachments.map((attachment) => (
                <li key={attachment}>{attachment}</li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      <div className="doc-viewer__aside">
        <p className="callout">
          Это mock-документ. Настоящий файл не открывается и не обрабатывается: показано заранее подготовленное
          содержимое.
        </p>
        <h4>Версии</h4>
        <ul className="version-list">
          {document.versions.map((version) => (
            <li key={version.version}>
              <span className="mono-num">v{version.version}</span> — {version.createdAt} —{" "}
              {actorLabelsSafe(version.author)}
              <div className="subtle">{version.note}</div>
            </li>
          ))}
        </ul>
        {basedOn && basedOn.length > 0 ? (
          <>
            <h4>Использованы факты дела</h4>
            <ul className="fact-ref-list">
              {basedOn.map((fact) => (
                <li key={fact.id}>
                  <strong>{fact.title}:</strong> {fact.value}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </div>
  );
}

function DocumentBlockView({ block }: { block: DocumentBlock }) {
  switch (block.kind) {
    case "heading":
      return <h4 className="doc-viewer__heading">{block.text}</h4>;
    case "paragraph":
      return <p>{block.text}</p>;
    case "list":
      return (
        <ul>
          {block.items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      );
    case "kv":
      return (
        <div className="kv-list">
          {block.rows.map((row) => (
            <div key={row.label} style={{ display: "contents" }}>
              <div className="kv-list__key">{row.label}</div>
              <div className="kv-list__value">{row.value}</div>
            </div>
          ))}
        </div>
      );
  }
}

function actorLabelsSafe(author: string): string {
  switch (author) {
    case "ai":
      return "AI";
    case "lawyer":
      return "Юрист";
    case "counterparty":
      return "Контрагент";
    case "system":
      return "Система";
    default:
      return "Пользователь";
  }
}