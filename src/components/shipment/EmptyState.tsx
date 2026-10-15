import { Button } from "../Button";

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

import { Link } from "react-router-dom";

/** Аккуратное пустое состояние (docs/prototype2.md §5, §14). */
export function EmptyState({ title, description, actionLabel, actionHref, onAction }: EmptyStateProps) {
  return (
    <div className="empty">
      <p>{title ?? "Ничего не найдено"}</p>
      {description ? <p className="small">{description}</p> : null}
      {actionLabel && (onAction || actionHref) ? (
        onAction ? (
          <Button onClick={onAction} small>
            {actionLabel}
          </Button>
        ) : (
          <Link to={actionHref!} className="btn btn--primary btn--sm">
            {actionLabel}
          </Link>
        )
      ) : null}
    </div>
  );
}
