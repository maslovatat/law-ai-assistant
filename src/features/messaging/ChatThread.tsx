import type { Case, Message } from "../../types/domain";
import { participantLabels } from "../../types/labels";

const toneClass: Record<NonNullable<Message["tone"]>, string> = {
  info: "chat__bubble--info",
  question: "chat__bubble--question",
  warning: "chat__bubble--warning",
  success: "chat__bubble--success",
};

function formatTimestamp(value: string): string {
  const date = value.split("T")[0];
  const time = value.split("T")[1]?.slice(0, 5) ?? "";
  return `${date.replaceAll("-", ".")}${time ? `, ${time}` : ""}`;
}

/** Переписка по делу в контексте AI, пользователя, юриста и контрагента. */
export function ChatThread({
  caseItem,
  onOpenDocument,
}: {
  caseItem: Case;
  onOpenDocument?: (documentId: string) => void;
}) {
  const messages = [...caseItem.messages].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  if (messages.length === 0) {
    return <p className="empty">Сообщений по делу пока нет.</p>;
  }

  return (
    <ol className="chat">
      {messages.map((message) => (
        <li key={message.id} className={`chat__row chat__row--${message.author}`}>
          <div className={`chat__bubble ${toneClass[message.tone ?? "info"]}`}>
            <div className="chat__meta">
              <strong>{participantLabels[message.author]}</strong>
              <span className="subtle mono-num">{formatTimestamp(message.timestamp)}</span>
            </div>
            <p className="chat__text">{message.text}</p>
            {message.documentRefs?.length ? (
              <div className="chat__refs">
                {message.documentRefs.map((documentId) => {
                  const document = caseItem.documents.find((d) => d.id === documentId);
                  if (!document) return null;
                  return (
                    <button
                      key={documentId}
                      type="button"
                      className="chat__ref"
                      onClick={() => onOpenDocument?.(documentId)}
                    >
                      Документ: {document.name}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {message.factRefs?.length ? (
              <div className="subtle">Связано с фактами: {message.factRefs.length}</div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}