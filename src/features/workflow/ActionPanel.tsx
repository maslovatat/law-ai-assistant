import { useState } from "react";
import type { ActionId, Case, CaseAction } from "../../types/domain";
import { getAction } from "../../lib/actions";
import { Button } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { ActionFormFields } from "../workflow/ActionFormFields";

interface ActionPanelProps {
  caseItem: Case;
  actions: CaseAction[];
  /** Действия, уже переданные в другие части экрана, скрываются из панели. */
  hidden?: ActionId[];
  onRun: (actionId: ActionId, payload: Record<string, string>) => void;
  title?: string;
}

/** Панель доступных действий дела. Кнопки явно описывают действие (§24). */
export function ActionPanel({ caseItem, actions, hidden = [], onRun, title = "Что можно сделать" }: ActionPanelProps) {
  const visible = actions.filter((action) => !hidden.includes(action.id));
  const [dialogAction, setDialogAction] = useState<CaseAction | null>(null);
  const [payload, setPayload] = useState<Record<string, string>>({});

  if (visible.length === 0) {
    return null;
  }

  const openForm = (action: CaseAction) => {
    setDialogAction(action);
    setPayload({});
  };

  const close = () => {
    setDialogAction(null);
    setPayload({});
  };

  const submitForm = () => {
    if (!dialogAction) return;
    const targetFactId = requestedFactId(caseItem);
    onRun(dialogAction.id, dialogAction.id === "ANSWER_LAWYER" && targetFactId ? { ...payload, target: targetFactId } : payload);
    close();
  };

  const confirmAction = dialogAction?.confirm;

  return (
    <section className="section">
      <div className="section__header">
        <h2>{title}</h2>
        <span className="section__hint">Действия зависят от текущего этапа и состояния дела</span>
      </div>
      <div className="action-grid">
        {visible.map((action) => (
          <div key={action.id} className="action-card">
            <div className="action-card__body">
              <div className="action-card__label">{action.label}</div>
              {action.description ? <p className="small muted">{action.description}</p> : null}
            </div>
            <Button
              variant={action.variant === "danger" ? "danger" : action.variant === "primary" ? "primary" : "secondary"}
              onClick={() => {
                if (action.confirm) {
                  openForm(action);
                } else if (action.form) {
                  openForm(action);
                } else {
                  onRun(action.id, {});
                }
              }}
            >
              {action.confirm ? action.confirm.confirmLabel : action.label}
            </Button>
          </div>
        ))}
      </div>

      <Dialog
        open={Boolean(dialogAction && (confirmAction || dialogAction?.form))}
        title={
          confirmAction
            ? confirmAction.title
            : dialogAction?.form?.title ?? getAction(dialogAction?.id ?? "VIEW_FACTS").label
        }
        confirmLabel={
          confirmAction ? confirmAction.confirmLabel : (dialogAction?.form ? "Подтвердить" : "Подтвердить")
        }
        confirmVariant={dialogAction?.variant === "danger" ? "danger" : "primary"}
        disabled={Boolean(
          dialogAction?.form?.fields.some((field) => field.type === "choice" && !payload[field.id]),
        )}
        onConfirm={submitForm}
        onCancel={close}
      >
        {confirmAction ? <p className="muted">{confirmAction.message}</p> : null}
        {dialogAction?.form ? (
          <>
            {dialogAction.form.description ? (
              <p className="muted">{dialogAction.form.description}</p>
            ) : null}
            {dialogAction.id === "ANSWER_LAWYER" && requestedItems(caseItem).length > 0 ? (
              <div className="callout small">
                Юрист ожидает уточнения по следующим сведениям:
                <ul>
                  {requestedItems(caseItem).map((item) => (
                    <li key={item.id}>{item.label}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <ActionFormFields
              fields={dialogAction.form.fields}
              payload={payload}
              onChange={(fieldId, value) => setPayload((prev) => ({ ...prev, [fieldId]: value }))}
            />
          </>
        ) : null}
        {dialogAction ? (
          <p className="subtle" style={{ marginTop: 12, marginBottom: 0 }}>
            Дело: {caseItem.number} · {dialogAction.label}
          </p>
        ) : null}
      </Dialog>
    </section>
  );
}
/** Сведения, запрошенные последним решением юриста. */
function requestedItems(caseItem: Case): Array<{ id: string; label: string; factId?: string }> {
  const decision = caseItem.lawyerDecisions[caseItem.lawyerDecisions.length - 1];
  return decision?.requestedItems ?? [];
}

/** Факт, который обновится по ответу пользователя. */
function requestedFactId(caseItem: Case): string | undefined {
  return requestedItems(caseItem).find((item) => item.factId)?.factId;
}
