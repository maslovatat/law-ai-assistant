import type { ReactNode } from "react";

interface PrototypeNoticeProps {
  /** Дополнительный текст (иначе используется стандартный). */
  children?: ReactNode;
  /** Позиция: "banner" (prominent) или "inline". */
  variant?: "banner" | "inline";
}

/**
 * Промежутичное уведомление о демонстрационном режиме.
 * Всегда указывает, что письмо не отправлено (docs/prototype2.md §7, §28).
 */
export function PrototypeNotice({ children, variant = "banner" }: PrototypeNoticeProps) {
  const text = children ?? "Демонстрационный режим. Реальная отправка через ИС ЭПС Почты России не выполняется. Все данные синтетические.";

  if (variant === "inline") {
    return <p className="subtle small">{text}</p>;
  }

  return (
    <div className="notice notice--demo" role="status">
      <span className="notice__marker">⚠</span>
      <div>{text}</div>
    </div>
  );
}

/**
 * Уведомление о том, что конкретная операция демонстрационная.
 * Используется в карточке результата и на странице отправления.
 */
export function DemoResultNotice({ children }: { children?: ReactNode }) {
  return (
    <div className="notice notice--demo" role="status">
      <span className="notice__marker">⚠</span>
      <div>
        <strong>{children ?? "Демонстрационный режим. Письмо не отправлено."}</strong>
      </div>
    </div>
  );
}
