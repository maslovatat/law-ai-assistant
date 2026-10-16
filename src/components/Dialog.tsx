import { useEffect, type ReactNode } from "react";

interface DialogProps {
  open: boolean;
  title: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger";
  disabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function Dialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = "Отмена",
  confirmVariant = "primary",
  disabled,
  onConfirm,
  onCancel,
}: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : "Диалог"}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="dialog__title">{title}</h2>
        <div>{children}</div>
        <div className="dialog__actions">
          <button type="button" className="btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${confirmVariant === "danger" ? "btn--danger" : "btn--primary"}`}
            onClick={onConfirm}
            disabled={disabled}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}