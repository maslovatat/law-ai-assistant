import type { ShipmentStatus } from "../../types/domain";
import { shipmentStatusLabels, shipmentStatusTone } from "../../types/labels";
import type { Tone } from "../../types/labels";

interface StatusBadgeProps {
  /** Статус отправления — текст и цвет выбираются автоматически. */
  status?: ShipmentStatus;
  /** Явный тон (перекрывает выбор по status). */
  tone?: Tone;
  /** Текстовый маркер слева. */
  marker?: string;
  children?: React.ReactNode;
}

/** Значок состояния. Текст обязателен, цвет дополняет (docs/prototype2.md §22). */
export function StatusBadge({ status, tone, marker, children }: StatusBadgeProps) {
  const resolvedTone = tone ?? (status ? shipmentStatusTone[status] : "neutral");
  const label = children ?? (status ? shipmentStatusLabels[status] : "");
  const classes = ["badge", `badge--${resolvedTone}`];

  if (marker) {
    return (
      <span className={classes.join(" ")}>
        <span aria-hidden="true">{marker}</span>
        {label}
      </span>
    );
  }
  return <span className={classes.join(" ")}>{label}</span>;
}
