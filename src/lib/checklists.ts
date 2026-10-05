import type { Case, FactKey } from "../types/domain";

/** Позиция элемента в проверке: «есть» / «нужно получить». */
export interface ChecklistEntry {
  id: string;
  label: string;
  status: "have" | "missing";
  factId?: string;
  documentId?: string;
  hint?: string;
}

export interface ChecklistResult {
  title: string;
  disclaimer?: string;
  items: ChecklistEntry[];
  missingCount: number;
}

/** Проверка данных перед подготовкой претензии (docs/prototype.md §11). */
const claimRequirements: Array<{
  id: string;
  label: string;
  factKey?: FactKey;
  documentKey?: string;
  hint?: string;
}> = [
  { id: "cl-user", label: "Данные пользователя", documentKey: "claim" },
  { id: "cl-seller", label: "Данные продавца", factKey: "seller" },
  { id: "cl-product", label: "Сведения о товаре", factKey: "product" },
  { id: "cl-date", label: "Дата покупки", factKey: "purchase_date" },
  { id: "cl-price", label: "Стоимость", factKey: "price" },
  { id: "cl-defect", label: "Описание дефекта", factKey: "defect_description" },
  { id: "cl-demand", label: "Требования пользователя", factKey: "user_demand" },
  { id: "cl-receipt", label: "Подтверждение покупки", factKey: "receipt_available" },
];

export function buildClaimChecklist(caseItem: Case): ChecklistResult {
  const items: ChecklistEntry[] = claimRequirements.map((requirement) => {
    const fact = requirement.factKey
      ? caseItem.facts.find((f) => f.key === requirement.factKey)
      : undefined;
    const document = requirement.documentKey
      ? caseItem.documents.find((d) => d.name.toLowerCase().includes(requirement.documentKey ?? ""))
      : undefined;

    const conflicting = fact?.state === "CONFLICT";
    const missing = !fact || conflicting;
    return {
      id: requirement.id,
      label: requirement.label,
      status: missing ? "missing" : "have",
      factId: fact?.id,
      documentId: document?.id,
      hint: conflicting
        ? "Источники расходятся: требуется уточнение."
        : missing && requirement.factKey
          ? "Данные не получены."
          : undefined,
    };
  });

  return {
    title: "Данные для подготовки претензии",
    disclaimer: "Проверка выполняется по данным дела. Недостающие данные можно получить через интервью или уточнение.",
    items,
    missingCount: items.filter((item) => item.status === "missing").length,
  };
}

/** Список данных для подготовки следующего этапа (docs/prototype.md §17). */
const courtHaveRequirements: Array<{ id: string; label: string; documentKind?: Case["documents"][number]["kind"] }> = [
  { id: "ct-user", label: "Данные пользователя" },
  { id: "ct-seller", label: "Сведения о продавце" },
  { id: "ct-purchase-docs", label: "Документы о покупке", documentKind: "receipt" },
  { id: "ct-claim", label: "Претензия", documentKind: "claim" },
  { id: "ct-confirmation", label: "Подтверждение отправки", documentKind: "confirmation" },
  { id: "ct-reply", label: "Ответ продавца", documentKind: "counterparty_reply" },
];

const courtNeedItems: Array<{ id: string; label: string; factKey?: FactKey; documentKind?: Case["documents"][number]["kind"] }> = [
  {
    id: "cn-product",
    label: "Дополнительные сведения о товаре и характере неисправности",
    factKey: "defect_description",
  },
  { id: "cn-history", label: "Подробная история событий с датами обращений", factKey: "first_contact_date" },
  { id: "cn-costs", label: "Сведения о понесённых расходах", factKey: "extra_costs" },
  { id: "cn-docs", label: "Дополнительные документы, если они есть", documentKind: "other" },
  { id: "cn-demand", label: "Информация о требованиях пользователя", factKey: "user_demand" },
  { id: "cn-other", label: "Другие данные, необходимые для подготовки следующего этапа" },
];

export function buildCourtPreparationChecklist(caseItem: Case): ChecklistResult {
  const have: ChecklistEntry[] = courtHaveRequirements.map((requirement) => {
    const document = requirement.documentKind
      ? caseItem.documents.find((d) => d.kind === requirement.documentKind)
      : undefined;
    const seller = caseItem.facts.find((f) => f.key === "seller");
    const present = requirement.documentKind ? Boolean(document) : Boolean(seller);
    return {
      id: requirement.id,
      label: requirement.label,
      status: present ? "have" : "missing",
      documentId: document?.id,
    };
  });

  const need: ChecklistEntry[] = courtNeedItems.map((requirement) => {
    const fact = requirement.factKey
      ? caseItem.facts.find((f) => f.key === requirement.factKey)
      : undefined;
    const document = requirement.documentKind
      ? caseItem.documents.find((d) => d.kind === requirement.documentKind)
      : undefined;
    const present = Boolean(fact || document);
    const weak = fact?.state === "REQUIRES_LAWYER" || fact?.state === "CONFLICT";
    return {
      id: requirement.id,
      label: requirement.label,
      status: present && !weak ? "have" : "missing",
      factId: fact?.id,
      documentId: document?.id,
      hint: weak ? "Требуется проверка юриста." : undefined,
    };
  });

  const items = [...have, ...need];
  return {
    title: "Данные, необходимые для подготовки следующего этапа",
    disclaimer:
      "Демонстрационный список данных, необходимых для подготовки следующего этапа. Он не является юридически исчерпывающим перечнем.",
    items,
    missingCount: items.filter((item) => item.status === "missing").length,
  };
}

/** Проверка перед отправкой (docs/prototype.md §13). */
export const sendChecklistLabels = [
  "Адресат проверен",
  "Содержание проверено",
  "Приложения выбраны",
  "Пользователь подтвердил отправку",
] as const;