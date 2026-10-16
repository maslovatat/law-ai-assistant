import type { ReactNode } from "react";
import type { ShipmentDraft, SenderProfile } from "../../types/domain";
import { formatBytes, isValidPostalCode, isValidEmail } from "../../lib/utils";
import { formatAddressLine } from "../../lib/utils";
import { formatDisplayDate } from "../../lib/mock/clock";
import { aiRecommendationLabels } from "../../types/labels";

interface ShipmentSummaryProps {
  /** Данные для сводки (из черновика или из отправления). */
  data: {
    document?: ShipmentDraft["document"];
    sender?: ShipmentDraft["sender"];
    recipient?: ShipmentDraft["recipient"];
  };
  /** Профиль для отображения источника данных. */
  profile?: SenderProfile;
  /** Состояние галочки проверки. */
  verificationChecked: boolean;
  onVerificationChange: (checked: boolean) => void;
  /** Действия внизу. */
  actions?: ReactNode;
}

/**
 * Сводка данных для проверки перед отправкой (docs/prototype2.md §12.3).
 * Показывает документ, отправителя, получателя, адреса и предупреждения.
 */
export function ShipmentSummary({ data, profile, verificationChecked, onVerificationChange, actions }: ShipmentSummaryProps) {
  const warnings = computeWarnings(data);
  const rec = computeRecommendation(data);

  return (
    <div className="stack stack--tight">
      <CardSection title="Документ">
        {data.document ? (
          <div className="doc-list__item">
            <div>
              <strong>{data.document.name}</strong>
              <div className="card__meta">
                {data.document.mimeType} · {formatBytes(data.document.size)}
                {data.document.pageCount ? ` · ${data.document.pageCount} стр.` : ""} · Добавлен:{" "}
                {formatDisplayDate(data.document.uploadedAt)}
              </div>
            </div>
          </div>
        ) : (
          <p className="muted small">Документ не загружен.</p>
        )}
      </CardSection>

      <CardSection title="Отправитель" actions={<EditLink onClick={() => {}} label="Редактировать" />}>
        {data.sender ? (
          <SenderInfo sender={data.sender} profile={profile} />
        ) : (
          <p className="muted small">Данные отправителя не заполнены.</p>
        )}
      </CardSection>

      <CardSection title="Получатель" actions={<EditLink onClick={() => {}} label="Редактировать" />}>
        {data.recipient ? (
          <RecipientInfo recipient={data.recipient} />
        ) : (
          <p className="muted small">Данные получателя не заполнены.</p>
        )}
      </CardSection>

      {warnings.length > 0 ? (
        <div className="notice notice--attention" role="alert">
          <span className="notice__marker">⚠</span>
          <div>
            <strong>Обнаружены проблемы</strong>
            <ul style={{ margin: "4px 0 0", paddingLeft: "20px" }}>
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {rec ? (
        <div className="notice notice--neutral">
          <span className="notice__marker">AI</span>
          <div>
            <strong>Рекомендация проверки</strong>
            <br />
            {rec}
          </div>
        </div>
      ) : null}

      <div className="callout callout--warning">
        <strong>Стоимость</strong>: Стоимость будет определена после подключения к Почте России.
        Точные тарифы, допустимость отправления и требования к подписи определяются после
        подключения к ИС ЭПС.
      </div>

      <label className="choice" style={{ cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={verificationChecked}
          onChange={(e) => onVerificationChange(e.target.checked)}
          style={{ marginRight: "var(--space-2)" }}
        />
        <span className="small">
          {verificationChecked ? "✓ " : ""}
          Проверил данные и приложенный документ
        </span>
      </label>
      <p className="subtle small">
        Эта галочка не заменяет электронную подпись и не означает реальную отправку.
      </p>

      {actions}
    </div>
  );
}

function CardSection({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="card">
      <div className="card__header">
        <div>
          <div className="card__title">{title}</div>
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

function EditLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className="btn btn--sm" onClick={onClick}>
      {label}
    </button>
  );
}

function SenderInfo({ sender, profile }: { sender: NonNullable<ShipmentSummaryProps["data"]["sender"]>; profile?: SenderProfile }) {
  const fromProfile = profile && sender.name === profile.name;
  const addressLines = formatAddressLine({
    postalCode: sender.address?.postalCode,
    region: sender.address?.region,
    city: sender.address?.city,
    street: sender.address?.street,
    houseNumber: sender.address?.houseNumber,
    corpus: sender.address?.corpus,
    flat: sender.address?.flat,
  });

  return (
    <div className="stack stack--tight">
      <div>
        <strong>{sender.name}</strong>
        {fromProfile ? <span className="badge badge--neutral small" style={{ marginLeft: "8px" }}>Из профиля</span> : null}
      </div>
      {sender.email ? <div className="small muted">{sender.email}</div> : null}
      {sender.code ? <div className="small muted">Код: {sender.code}</div> : null}
      {addressLines ? <div className="small muted">{addressLines}</div> : null}
      {sender.addressString ? <div className="small muted">{sender.addressString}</div> : null}
    </div>
  );
}

function RecipientInfo({ recipient }: { recipient: NonNullable<ShipmentSummaryProps["data"]["recipient"]> }) {
  const addressLines = formatAddressLine({
    postalCode: recipient.address?.postalCode,
    region: recipient.address?.region,
    city: recipient.address?.city,
    street: recipient.address?.street,
    houseNumber: recipient.address?.houseNumber,
    corpus: recipient.address?.corpus,
    flat: recipient.address?.flat,
  });

  const name = recipient.organization?.name ?? recipient.person
    ? [recipient.person?.lastName, recipient.person?.firstName, recipient.person?.patronymic].filter(Boolean).join(" ")
    : "";

  return (
    <div className="stack stack--tight">
      <div>
        <strong>{recipient.type === "ul" ? recipient.organization?.name : name}</strong>
        {recipient.organization?.inn ? <span className="badge badge--neutral small" style={{ marginLeft: "8px" }}>ИНН {recipient.organization.inn}</span> : null}
      </div>
      {addressLines ? <div className="small muted">{addressLines}</div> : null}
      {recipient.addressString ? <div className="small muted">{recipient.addressString}</div> : null}
      {recipient.additionalInfo ? <div className="small muted">Доп. инфо: {recipient.additionalInfo}</div> : null}
    </div>
  );
}

function computeWarnings(data: ShipmentSummaryProps["data"]): string[] {
  const warnings: string[] = [];
  if (!data.document) warnings.push("Не загружен документ");
  if (!data.sender) warnings.push("Не заполнены данные отправителя");
  if (!data.recipient) warnings.push("Не заполнены данные получателя");

  if (data.recipient?.address) {
    if (!data.recipient.address.postalCode || !isValidPostalCode(data.recipient.address.postalCode)) {
      warnings.push("Почтовый индекс получателя не указан или не соответствует формату (6 цифр)");
    }
  }
  if (data.sender && "email" in data.sender && data.sender.email && !isValidEmail(data.sender.email)) {
    warnings.push("Email отправителя не соответствует формату");
  }
  return warnings;
}

function computeRecommendation(data: ShipmentSummaryProps["data"]): string | null {
  if (!data.document) return aiRecommendationLabels.missingDocument;
  if (!data.sender) return aiRecommendationLabels.missingSender;
  if (!data.recipient) return aiRecommendationLabels.missingRecipient;
  if (data.recipient.address?.postalCode && !isValidPostalCode(data.recipient.address.postalCode)) {
    return aiRecommendationLabels.invalidPostalCode;
  }
  return aiRecommendationLabels.valid;
}
