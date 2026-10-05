import type { CaseDocument, CaseFact, FactKey } from "../../types/domain";
import { renderDocumentContent, type DocumentTemplate } from "../../data/documents";

/**
 * Идентификаторы фактов и документов строятся из ключа дела и семантического ключа,
 * поэтому демо-дела независимы друг от друга и могут создаваться в любом количестве.
 */
export function factId(caseId: string, key: FactKey): string {
  return `${caseId}:fact:${key}`;
}

export function docId(caseId: string, key: string): string {
  return `${caseId}:doc:${key}`;
}

export interface FactLike {
  id: string;
  key: FactKey;
  value: string;
}

export function factValueByKey(facts: FactLike[], key: FactKey): string | undefined {
  return facts.find((f) => f.key === key)?.value;
}

/**
 * Дата в чеке задаётся независимо от ответа пользователя: именно расхождение между
 * этими значениями обнаруживается системой как противоречие (docs/prototype.md §24).
 */
export const RECEIPT_DATE = "12.08.2026";

const fallbackValues: Record<string, string> = {
  receipt_date: RECEIPT_DATE,
  purchase_date: "дата покупки не указана",
  defect_found_date: "дата не указана",
  first_contact_date: "дата обращения не указана",
  price: "сумма не указана",
  product: "товар не указан",
  seller: "продавец не указан",
  defect_description: "неисправность не описана",
  user_demand: "требование не определено",
  user_name: "Пользователь (демо)",
  generated_date: "дата формирования документа",
  reply_date: "дата ответа",
  sent_date: "дата отправки",
};

/** Значения для подстановки `{{token}}` в mock-документах: факты имеют приоритет. */
export function buildDocumentValues(
  facts: FactLike[],
  extra: Record<string, string> = {},
): Record<string, string> {
  const values: Record<string, string> = { ...fallbackValues, ...extra };
  for (const fact of facts) {
    values[fact.key] = fact.value;
  }
  return values;
}

export function materializeDocuments(
  caseId: string,
  templates: DocumentTemplate[],
  values: Record<string, string>,
): CaseDocument[] {
  return templates.map((template) => {
    const createdAt = values[template.createdAt] ?? template.createdAt;
    const author =
      template.origin === "ai_generated"
        ? "ai"
        : template.origin === "counterparty"
          ? "counterparty"
          : template.origin === "system"
            ? "system"
            : "user";
    return {
      id: docId(caseId, template.key),
      caseId,
      name: template.name,
      kind: template.kind,
      status: template.status,
      version: 1,
      createdAt,
      origin: template.origin,
      pageCount: template.pageCount,
      versions: [{ version: 1, createdAt, author, note: template.note }],
      content: renderDocumentContent(template.content, values),
      basedOnFactIds: template.basedOnFactKeys?.map((key) => factId(caseId, key)),
    };
  });
}

export function sortFactsByTitle(facts: CaseFact[]): CaseFact[] {
  return [...facts].sort((a, b) => a.title.localeCompare(b.title, "ru"));
}

export function findFactByKey(caseId: string, facts: CaseFact[], key: FactKey): CaseFact | undefined {
  return facts.find((f) => f.caseId === caseId && f.key === key);
}