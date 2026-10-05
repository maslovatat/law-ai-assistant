import type { ReactNode } from "react";
import type { Tone } from "../types/labels";

interface NoticeProps {
  tone?: Tone;
  marker?: string;
  title?: ReactNode;
  children?: ReactNode;
  onClose?: () => void;
}

const toneMarker: Record<Tone, string> = {
  neutral: "i",
  progress: "→",
  attention: "!",
  danger: "⚠",
  success: "✓",
  ai: "AI",
};

export function Notice({ tone = "neutral", marker, title, children, onClose }: NoticeProps) {
  return (
    <div className={`notice notice--${tone}`} role="status">
      <span className="notice__marker" aria-hidden="true">
        {marker ?? toneMarker[tone]}
      </span>
      <div>
        {title ? <strong>{title}</strong> : null}
        {title && children ? <br /> : null}
        {children}
      </div>
      {onClose ? (
        <button type="button" className="notice__close" onClick={onClose} aria-label="Закрыть уведомление">
          ✕
        </button>
      ) : null}
    </div>
  );
}