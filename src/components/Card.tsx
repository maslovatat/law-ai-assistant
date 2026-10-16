import type { ReactNode } from "react";

interface CardProps {
  title?: ReactNode;
  meta?: ReactNode;
  tone?: "default" | "accent" | "warning" | "danger" | "success" | "ai";
  actions?: ReactNode;
  footer?: ReactNode;
  flush?: boolean;
  children?: ReactNode;
}

const toneClass: Record<NonNullable<CardProps["tone"]>, string> = {
  default: "",
  accent: "card--accent",
  warning: "card--warning",
  danger: "card--danger",
  success: "card--success",
  ai: "card--ai",
};

export function Card({
  title,
  meta,
  tone = "default",
  actions,
  footer,
  flush,
  children,
}: CardProps) {
  const classes = ["card", toneClass[tone], flush ? "card--flush" : ""].filter(Boolean).join(" ");
  return (
    <section className={classes}>
      {(title || actions || meta) && (
        <header className="card__header">
          <div>
            {title ? <div className="card__title">{title}</div> : null}
            {meta ? <div className="card__meta">{meta}</div> : null}
          </div>
          {actions ? <div className="row">{actions}</div> : null}
        </header>
      )}
      {children}
      {footer ? <div className="card__footer">{footer}</div> : null}
    </section>
  );
}