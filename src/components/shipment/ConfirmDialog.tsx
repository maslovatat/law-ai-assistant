import type { ReactNode } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger";
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

/** Диалог подтверждения разрушительных действий (docs/prototype2.md §14). */
export function ConfirmDialog({
  open,
  title,
  message,
  children,
  confirmLabel = "Подтвердить",
  cancelLabel = "Отмена",
  onConfirm,
  onCancel,
  onClose,
}: ConfirmDialogProps) {
  if (!open) return null;

  const handleClose = onClose ?? onCancel ?? (() => {});

  const handleBackdrop = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) handleClose();
  };

  return (
    <div className="dialog-backdrop" onClick={handleBackdrop}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h3 className="dialog__title" id="confirm-title">
          {title}
        </h3>
        {message ? <p className="small">{message}</p> : null}
        {children}
        <div className="dialog__actions">
          <button type="button" className="btn" onClick={handleClose}>
            {cancelLabel}
          </button>
          <button type="button" className="btn btn--danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
