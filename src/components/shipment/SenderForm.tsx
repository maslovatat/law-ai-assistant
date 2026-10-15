import { useState } from "react";
import type { Sender } from "../../types/domain";
import { useStore } from "../../app/ShipmentStore";

interface SenderFormProps {
  sender: Partial<Sender>;
  onChange: (sender: Partial<Sender>) => void;
  /** Ошибки валидации по полям. */
  errors?: Record<string, string>;
  /** Данные из профиля используются для предзаполнения. */
  profileSource?: boolean;
}

/**
 * Форма отправителя (docs/prototype2.md §7, п. 177).
 * Поддерживает тип отправителя: физическое лицо или юридическое лицо.
 */
export function SenderForm({ sender, onChange, errors, profileSource }: SenderFormProps) {
  const { state } = useStore();
  const profile = state.senderProfile;

  const [type, setType] = useState<Sender["type"]>(sender.type ?? profile.type ?? "ul");

  const handleTypeChange = (newType: Sender["type"]) => {
    setType(newType);
    onChange({ ...sender, type: newType });
  };

  const handleField = (field: keyof Sender, value: string) => {
    onChange({ ...sender, [field]: value });
  };

  const handleAddressField = (field: string, value: string) => {
    const existing = sender.address ?? profile.address ?? {};
    onChange({
      ...sender,
      address: { ...existing, [field]: value },
      addressString: buildAddressString({ ...existing, [field]: value }),
    });
  };

  const isOrg = type === "ul";
  const sourceLabel = profileSource ? "Заполнено из профиля" : undefined;

  return (
    <div className="form-section">
      <fieldset className="field-group">
        <legend className="field-group__legend">Тип отправителя</legend>
        <div className="choice-list">
          <label className={`choice ${type === "ul" ? "choice--selected" : ""}`}>
            <input
              type="radio"
              name="senderType"
              value="ul"
              checked={type === "ul"}
              onChange={() => handleTypeChange("ul")}
            />
            <div className="choice__content">
              <div className="choice__label">Юридическое лицо / ИП</div>
            </div>
          </label>
          <label className={`choice ${type === "fiz" ? "choice--selected" : ""}`}>
            <input
              type="radio"
              name="senderType"
              value="fiz"
              checked={type === "fiz"}
              onChange={() => handleTypeChange("fiz")}
            />
            <div className="choice__content">
              <div className="choice__label">Физическое лицо</div>
            </div>
          </label>
        </div>
      </fieldset>

      {sourceLabel ? <div className="subtle small">Источник: {sourceLabel}</div> : null}

      {isOrg ? (
        <>
          <div className="field">
            <label className="field__label" htmlFor="sender-name">
              Наименование организации
            </label>
            <input
              id="sender-name"
              className="input"
              value={sender.name ?? profile.name ?? ""}
              onChange={(e) => handleField("name", e.target.value)}
              aria-invalid={Boolean(errors?.name)}
            />
            {errors?.name ? <span className="error small">{errors.name}</span> : null}
          </div>
          <div className="field">
            <label className="field__label" htmlFor="sender-code">
              Код отправителя (CODE_...)
            </label>
            <input
              id="sender-code"
              className="input"
              value={sender.code ?? ""}
              onChange={(e) => handleField("code", e.target.value)}
              placeholder="CODE_55"
            />
          </div>
        </>
      ) : (
        <>
          <div className="field">
            <label className="field__label" htmlFor="sender-lastName">
              Фамилия
            </label>
            <input
              id="sender-lastName"
              className="input"
              value={sender.individual?.lastName ?? ""}
              onChange={(e) =>
                onChange({
                  ...sender,
                  individual: {
                    ...(sender.individual ?? { firstName: "", lastName: "", patronymic: "" }),
                    lastName: e.target.value,
                  },
                  name: `${e.target.value} ${sender.individual?.firstName ?? ""} ${sender.individual?.patronymic ?? ""}`.trim(),
                })
              }
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="sender-firstName">
              Имя
            </label>
            <input
              id="sender-firstName"
              className="input"
              value={sender.individual?.firstName ?? ""}
              onChange={(e) =>
                onChange({
                  ...sender,
                  individual: {
                    ...(sender.individual ?? { firstName: "", lastName: "", patronymic: "" }),
                    firstName: e.target.value,
                  },
                  name: `${sender.individual?.lastName ?? ""} ${e.target.value} ${sender.individual?.patronymic ?? ""}`.trim(),
                })
              }
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="sender-patronymic">
              Отчество
            </label>
            <input
              id="sender-patronymic"
              className="input"
              value={sender.individual?.patronymic ?? ""}
              onChange={(e) =>
                onChange({
                  ...sender,
                  individual: {
                    ...(sender.individual ?? { firstName: "", lastName: "", patronymic: "" }),
                    patronymic: e.target.value,
                  },
                  name: `${sender.individual?.lastName ?? ""} ${sender.individual?.firstName ?? ""} ${e.target.value}`.trim(),
                })
              }
            />
          </div>
        </>
      )}

      <div className="field">
        <label className="field__label" htmlFor="sender-email">
          Электронная почта
        </label>
        <input
          id="sender-email"
          className="input"
          type="email"
          value={sender.email ?? profile.email ?? ""}
          onChange={(e) => handleField("email", e.target.value)}
          aria-invalid={Boolean(errors?.email)}
        />
        {errors?.email ? <span className="error small">{errors.email}</span> : null}
      </div>

      <AddressForm
        address={(sender.address ?? profile.address ?? {}) as Record<string, string | undefined>}
        onChange={handleAddressField}
        errors={errors}
      />
    </div>
  );
}

function AddressForm({
  address,
  onChange,
  errors,
}: {
  address: Record<string, string | undefined>;
  onChange: (field: string, value: string) => void;
  errors?: Record<string, string>;
}) {
  const fields: Array<{ key: string; label: string; type?: string }> = [
    { key: "postalCode", label: "Почтовый индекс", type: "text" },
    { key: "region", label: "Регион" },
    { key: "city", label: "Город" },
    { key: "street", label: "Улица" },
    { key: "houseNumber", label: "Дом" },
    { key: "corpus", label: "Корпус" },
    { key: "flat", label: "Квартира / офис" },
  ];

  return (
    <div className="field-group">
      <legend className="field-group__legend">Адрес отправителя</legend>
      <div className="grid grid--two">
        {fields.map((field) => (
          <div key={field.key} className="field">
            <label className="field__label" htmlFor={`addr-${field.key}`}>
              {field.label}
            </label>
            <input
              id={`addr-${field.key}`}
              className="input"
              type={field.type ?? "text"}
              value={address[field.key] ?? ""}
              onChange={(e) => onChange(field.key, e.target.value)}
              aria-invalid={Boolean(errors?.[field.key])}
            />
            {errors?.[field.key] ? <span className="error small">{errors[field.key]}</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function buildAddressString(address: Record<string, string | undefined>): string {
  const parts: string[] = [];
  if (address.postalCode) parts.push(address.postalCode + ",");
  if (address.region) parts.push(address.region + " обл.,");
  if (address.city) parts.push("г. " + address.city + ",");
  if (address.street) {
    let streetPart = "ул. " + address.street;
    if (address.houseNumber) streetPart += ", д. " + address.houseNumber;
    if (address.corpus) streetPart += ", корп. " + address.corpus;
    if (address.flat) streetPart += ", кв. " + address.flat;
    parts.push(streetPart);
  }
  return parts.join(" ");
}
