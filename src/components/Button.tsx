import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { ActionVariant } from "../types/domain";
import type { Tone } from "../types/labels";

type ButtonVariant = ActionVariant | "ai";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  block?: boolean;
  small?: boolean;
  children: ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: "btn--primary",
  secondary: "",
  danger: "btn--danger",
  ai: "btn--ai",
};

export function Button({ variant = "secondary", block, small, className, children, ...rest }: ButtonProps) {
  const classes = ["btn", variantClass[variant], block ? "btn--block" : "", small ? "btn--sm" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}

interface BadgeProps {
  tone?: Tone;
  marker?: string;
  children: ReactNode;
}

export function Badge({ tone = "neutral", marker, children }: BadgeProps) {
  return (
    <span className={`badge badge--${tone}`}>
      {marker ? <span aria-hidden="true">{marker}</span> : null}
      {children}
    </span>
  );
}