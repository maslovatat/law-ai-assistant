import type { ActionFormField } from "../../types/domain";

interface ActionFormFieldsProps {
  fields: ActionFormField[];
  payload: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
}

/** Поля mock-формы действия: варианты ответа или свободный текст. */
export function ActionFormFields({ fields, payload, onChange }: ActionFormFieldsProps) {
  return (
    <>
      {fields.map((field) => {
        const value = payload[field.id] ?? "";
        return (
          <div className="field" key={field.id}>
            <span className="field__label" id={`field-${field.id}`}>
              {field.label}
            </span>
            {field.type === "choice" ? (
              <div className="choice-list" role="radiogroup" aria-labelledby={`field-${field.id}`}>
                {field.options?.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={value === option.value}
                    className={`choice ${value === option.value ? "choice--selected" : ""}`}
                    onClick={() => onChange(field.id, option.value)}
                  >
                    <span className="choice__dot" aria-hidden="true" />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <textarea
                className="textarea"
                value={value}
                placeholder={field.placeholder}
                aria-label={field.label}
                onChange={(event) => onChange(field.id, event.target.value)}
              />
            )}
          </div>
        );
      })}
    </>
  );
}