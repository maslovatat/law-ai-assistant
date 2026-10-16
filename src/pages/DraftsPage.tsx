import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../app/ShipmentStore";
import { StatusBadge } from "../components/shipment/StatusBadge";
import { ConfirmDialog } from "../components/shipment/ConfirmDialog";
import { EmptyState } from "../components/shipment/EmptyState";
import { PrototypeNotice } from "../components/shipment/PrototypeNotice";
import { formatDisplayDate } from "../lib/mock/clock";
import type { ShipmentDraft } from "../types/domain";

/** Страница черновиков (docs/prototype2.md §10). */
export function DraftsPage() {
  const { state, dispatch } = useStore();
  const [deleteTarget, setDeleteTarget] = useState<ShipmentDraft | null>(null);

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      dispatch({ type: "deleteDraft", id: deleteTarget.id });
      setDeleteTarget(null);
    }
  };

  if (state.drafts.length === 0) {
    return (
      <div className="stack">
        <h1>Черновики</h1>
        <p className="muted">Сохранённые черновики будут отображаться здесь.</p>
        <EmptyState
          title="Пока нет черновиков"
          actionLabel="Создать новое отправление"
          actionHref="/create"
        />
        <PrototypeNotice variant="inline" />
      </div>
    );
  }

  return (
    <div className="stack">
      <h1>Черновики</h1>
      <p className="muted small" style={{ marginTop: "-12px", marginBottom: "var(--space-3)" }}>
        {state.drafts.length} черновиков. Нажмите "Продолжить", чтобы дозаполнить мастер.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {state.drafts.map((draft) => (
          <div key={draft.id} className="card">
            <div className="card__header">
              <div>
                <div className="card__title">Черновик от {formatDisplayDate(draft.updatedAt)}</div>
                <div className="card__meta">
                  Шаг {draft.currentStep + 1} из 4 · обновлён: {formatDisplayDate(draft.updatedAt)}
                </div>
              </div>
              <StatusBadge status={stepToStatus(draft.currentStep)} />
            </div>

            {draft.document ? (
              <div className="doc-list__item">
                <div>
                  <strong>{draft.document.name}</strong>
                  <div className="card__meta">
                    {draft.document.size} Б · {draft.document.uploadedAt}
                  </div>
                </div>
              </div>
            ) : null}

            {draft.sender || draft.recipient ? (
              <div style={{ marginTop: "var(--space-3)" }}>
                <div className="small muted">
                  {draft.sender?.name ?? "Отправитель не указан"}
                  {" → "}
                  {draft.recipient?.organization?.name ??
                    draft.recipient?.person
                    ? [draft.recipient.person?.lastName, draft.recipient.person?.firstName, draft.recipient.person?.patronymic]
                        .filter(Boolean)
                        .join(" ") || "—"
                    : "Получатель не указан"}
                </div>
              </div>
            ) : null}

            <div className="card__footer">
              <Link to={`/create?draft=${draft.id}`} className="btn btn--primary btn--sm">
                Продолжить
              </Link>
              <button
                type="button"
                className="btn btn--sm btn--danger"
                onClick={() => setDeleteTarget(draft)}
              >
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>

      <PrototypeNotice variant="inline" />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Удалить черновик?"
        confirmLabel="Удалить"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      >
        <p>Это действие нельзя отменить. Незавершённый черновик будет удалён безвозвратно.</p>
      </ConfirmDialog>
    </div>
  );
}

function stepToStatus(step: number): "DRAFT" | "PREPARED" | "IN_TRANSIT" | "REQUIRES_ATTENTION" {
  if (step === 0) return "DRAFT";
  if (step === 1) return "DRAFT";
  if (step === 2) return "PREPARED";
  return "REQUIRES_ATTENTION";
}
