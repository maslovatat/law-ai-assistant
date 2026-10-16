import { useState, useEffect } from "react";
import type { Recipient } from "../../types/domain";

interface RecipientFormProps {
  recipient: Partial<Recipient>;
  onChange: (recipient: Partial<Recipient>) => void;
  errors?: Record<string, string>;
}

/**
 * Форма получателя (docs/prototype2.md §7, п. 185).
 * Поддерживает физическое лицо и юридическое лицо, адаптирует поля под тип.
 */
export function RecipientForm({ recipient, onChange, errors }: RecipientFormProps) {
  const [type, setType] = useState<Recipient["type"]>(recipient.type ?? "fiz");

  useEffect(() => {
    setType(recipient.type ?? "fiz");
  }, [recipient.type]);

  const handleTypeChange = (newType: Recipient["type"]) => {
    setType(newType);
    onChange({
      ...recipient,
      type: newType,
      countryCodeOKSM: 643,
      person: newType === "fiz" ? recipient.person : undefined,
      organization: newType === "ul" ? recipient.organization : undefined,
    });
  };

  const handleAddressField = (field: string, value: string) => {
    const existing = recipient.address ?? {};
    onChange({
      ...recipient,
      address: { ...existing, [field]: value },
      addressString: buildAddressString({ ...existing, [field]: value }),
    });
  };

  const isPerson = type === "fiz";

  const addressFields: Array<{ key: string; label: string }> = [
    { key: "postalCode", label: "Почтовый индекс" },
    { key: "region", label: "Регион" },
    { key: "city", label: "Населённый пункт" },
    { key: "street", label: "Улица" },
    { key: "houseNumber", label: "Дом" },
    { key: "corpus", label: "Корпус/строение" },
    { key: "flat", label: "Квартира / офис" },
  ];

  return (
    <div className="form-section">
      <fieldset className="field-group">
        <legend className="field-group__legend">Тип получателя</legend>
        <div className="choice-list">
          <label className={`choice ${type === "fiz" ? "choice--selected" : ""}`}>
            <input
              type="radio"
              name="recipientType"
              value="fiz"
              checked={type === "fiz"}
              onChange={() => handleTypeChange("fiz")}
            />
            <div className="choice__content">
              <div className="choice__label">Физическое лицо</div>
            </div>
          </label>
          <label className={`choice ${type === "ul" ? "choice--selected" : ""}`}>
            <input
              type="radio"
              name="recipientType"
              value="ul"
              checked={type === "ul"}
              onChange={() => handleTypeChange("ul")}
            />
            <div className="choice__content">
              <div className="choice__label">Юридическое лицо</div>
            </div>
          </label>
        </div>
      </fieldset>

      {isPerson ? (
        <>
          <div className="field">
            <label className="field__label" htmlFor="recipient-lastName">
              Фамилия
            </label>
            <input
              id="recipient-lastName"
              className="input"
              value={recipient.person?.lastName ?? ""}
              onChange={(e) =>
                onChange({
                  ...recipient,
                  person: { ...recipient.person!, lastName: e.target.value },
                })
              }
              aria-invalid={Boolean(errors?.lastName)}
            />
            {errors?.lastName ? <span className="error small">{errors.lastName}</span> : null}
          </div>
          <div className="field">
            <label className="field__label" htmlFor="recipient-firstName">
              Имя
            </label>
            <input
              id="recipient-firstName"
              className="input"
              value={recipient.person?.firstName ?? ""}
              onChange={(e) =>
                onChange({
                  ...recipient,
                  person: { ...recipient.person!, firstName: e.target.value },
                })
              }
              aria-invalid={Boolean(errors?.firstName)}
            />
            {errors?.firstName ? <span className="error small">{errors.firstName}</span> : null}
          </div>
          <div className="field">
            <label className="field__label" htmlFor="recipient-patronymic">
              Отчество
            </label>
            <input
              id="recipient-patronymic"
              className="input"
              value={recipient.person?.patronymic ?? ""}
              onChange={(e) =>
                onChange({
                  ...recipient,
                  person: { ...recipient.person!, patronymic: e.target.value },
                })
              }
            />
          </div>
        </>
      ) : (
        <div className="field">
          <label className="field__label" htmlFor="recipient-org-name">
            Наименование организации
          </label>
          <input
            id="recipient-org-name"
            className="input"
            value={recipient.organization?.name ?? ""}
            onChange={(e) =>
              onChange({
                ...recipient,
                organization: { ...recipient.organization!, name: e.target.value },
              })
            }
            aria-invalid={Boolean(errors?.orgName)}
          />
          {errors?.orgName ? <span className="error small">{errors.orgName}</span> : null}
          <div className="subtle small">ИНН (опционально):
            <input
              className="input"
              style={{ maxWidth: "200px", marginTop: "4px" }}
              value={recipient.organization?.inn ?? ""}
              onChange={(e) =>
                onChange({
                  ...recipient,
                  organization: { ...recipient.organization!, inn: e.target.value },
                })
              }
            />
          </div>
        </div>
      )}

      <div className="field-group">
        <legend className="field-group__legend">Адрес получателя</legend>
        <div className="grid grid--two">
          {addressFields.map((field) => (
            <div key={field.key} className="field">
              <label className="field__label" htmlFor={`recipient-${field.key}`}>
                {field.label}
              </label>
              <input
                id={`recipient-${field.key}`}
                className="input"
                value={(recipient.address as Record<string, string | undefined>)?.[field.key] ?? ""}
                onChange={(e) => handleAddressField(field.key, e.target.value)}
                aria-invalid={Boolean(errors?.[field.key])}
              />
              {errors?.[field.key] ? <span className="error small">{errors[field.key]}</span> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="recipient-additional">
          Доп. информация в адресном блоке (до 30 символов)
        </label>
        <input
          id="recipient-additional"
          className="input"
          maxLength={30}
          value={recipient.additionalInfo ?? ""}
          onChange={(e) => onChange({ ...recipient, additionalInfo: e.target.value })}
        />
      </div>
    </div>
  );
}

function buildAddressString(address: Record<string, string | undefined>): string {
  const parts: string[] = [];
  if (address.postalCode) parts.push(address.postalCode + ",");
  if (address.region) parts.push(address.region + " обл.,");
  if (address.city) {
    if (address.settlement) parts.push("пос. " + address.settlement + ",");
    parts.push("г. " + address.city + ",");
  }
  if (address.street) {
    let streetPart = "ул. " + address.street;
    if (address.houseNumber) streetPart += ", д. " + address.houseNumber;
    if (address.corpus) streetPart += ", корп. " + address.corpus;
    if (address.flat) streetPart += ", кв. " + address.flat;
    parts.push(streetPart);
  }
  return parts.join(" ");
}
