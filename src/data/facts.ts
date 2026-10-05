import type { CaseFact, FactKey, FactSourceKind } from "../types/domain";

/** Источник в seed-данных: документ указан семантическим ключом и разрешается при сборке дела. */
export interface SourceSeed {
  id: string;
  kind: FactSourceKind;
  label: string;
  documentKey?: string;
  page?: number;
}

export interface FactSeed {
  localId: string;
  factKey: FactKey;
  title: string;
  value: string;
  state: CaseFact["state"];
  sources: SourceSeed[];
  conflict?: {
    detectedAt: string;
    variants: Array<{ value: string; source: SourceSeed }>;
  };
  requiresClarification?: boolean;
  updatedAt: string;
}

const userSource = (id: string, label = "Сообщение пользователя"): SourceSeed => ({
  id,
  kind: "user_message",
  label,
});

const docSource = (id: string, documentKey: string, label: string): SourceSeed => ({
  id,
  kind: "document_page",
  label,
  documentKey,
});

/**
 * Факты демо-дел. Значения и состояния описаны данными: при расхождении источников
 * факт помечается CONFLICT, а варианты сохраняются отдельно — система не выбирает
 * значение самостоятельно (docs/prototype.md §10).
 */
export const factSeeds: Record<string, FactSeed[]> = {
  "LC-2026-001": [
    {
      localId: "f-product",
      factKey: "product",
      title: "Товар",
      value: "Холодильник ATLANT ХМ 4624-101",
      state: "CONFIRMED_BY_USER",
      sources: [userSource("src-product")],
      updatedAt: "06.09.2026",
    },
    {
      localId: "f-seller",
      factKey: "seller",
      title: "Продавец",
      value: "ООО «Техника»",
      state: "CONFIRMED_BY_USER",
      sources: [userSource("src-seller")],
      updatedAt: "06.09.2026",
    },
    {
      localId: "f-purchase-date",
      factKey: "purchase_date",
      title: "Дата покупки",
      value: "12.08.2026",
      state: "CONFIRMED_BY_DOCUMENT",
      sources: [docSource("src-purchase-date", "receipt", "Чек.pdf, стр. 1, «Дата продажи»")],
      updatedAt: "06.09.2026",
    },
    {
      localId: "f-price",
      factKey: "price",
      title: "Стоимость",
      value: "49 990 ₽",
      state: "CONFIRMED_BY_DOCUMENT",
      sources: [docSource("src-price", "receipt", "Чек.pdf, стр. 1, «Итого»")],
      updatedAt: "06.09.2026",
    },
    {
      localId: "f-defect-description",
      factKey: "defect_description",
      title: "Неисправность",
      value: "Не охлаждает, показание индикатора +9 °C при +21 °C в помещении",
      state: "CONFIRMED_BY_DOCUMENT",
      sources: [docSource("src-defect", "photo", "Фотография дефекта.jpg, стр. 1")],
      updatedAt: "06.09.2026",
    },
    {
      localId: "f-defect-found-date",
      factKey: "defect_found_date",
      title: "Дата обнаружения дефекта",
      value: "15.09.2026",
      state: "CONFIRMED_BY_USER",
      sources: [userSource("src-defect-date")],
      updatedAt: "06.09.2026",
    },
    {
      localId: "f-first-contact-date",
      factKey: "first_contact_date",
      title: "Дата обращения к продавцу",
      value: "20.09.2026",
      state: "CONFIRMED_BY_DOCUMENT",
      sources: [
        docSource("src-first-contact", "chat-log", "Переписка с продавцом.pdf, стр. 1"),
      ],
      updatedAt: "18.09.2026",
    },
    {
      localId: "f-seller-response",
      factKey: "seller_response",
      title: "Ответ продавца",
      value: "Требуется диагностика до рассмотрения обращения",
      state: "CONFIRMED_BY_DOCUMENT",
      sources: [
        docSource("src-seller-response", "chat-log", "Переписка с продавцом.pdf, стр. 1"),
      ],
      updatedAt: "18.09.2026",
    },
    {
      localId: "f-demand",
      factKey: "user_demand",
      title: "Требование пользователя",
      value: "Возврат денежных средств в размере 49 990 ₽",
      state: "CONFIRMED_BY_USER",
      sources: [userSource("src-demand")],
      updatedAt: "06.09.2026",
    },
    {
      localId: "f-receipt",
      factKey: "receipt_available",
      title: "Документ о покупке",
      value: "Кассовый чек от 12.08.2026",
      state: "CONFIRMED_BY_DOCUMENT",
      sources: [docSource("src-receipt", "receipt", "Чек.pdf, стр. 1")],
      updatedAt: "06.09.2026",
    },
    {
      localId: "f-extra-costs",
      factKey: "extra_costs",
      title: "Дополнительные расходы",
      value: "Оплачивалась доставка другой техники — 1 800 ₽, чек не сохранён",
      state: "REQUIRES_LAWYER",
      sources: [userSource("src-extra-costs")],
      updatedAt: "20.09.2026",
      requiresClarification: true,
    },
    {
      localId: "f-warranty",
      factKey: "warranty_period",
      title: "Гарантийный срок",
      value: "24 месяца с даты продажи (по чеку)",
      state: "CONFIRMED_BY_DOCUMENT",
      sources: [docSource("src-warranty", "receipt", "Чек.pdf, стр. 1, «Отметка о гарантии»")],
      updatedAt: "06.09.2026",
    },
  ],
  "LC-2026-002": [
    {
      localId: "cf-product",
      factKey: "product",
      title: "Товар",
      value: "Варочная панель",
      state: "CONFIRMED_BY_USER",
      sources: [userSource("c-src-product")],
      updatedAt: "12.09.2026",
    },
    {
      localId: "cf-seller",
      factKey: "seller",
      title: "Продавец",
      value: "ООО «Техника»",
      state: "CONFIRMED_BY_USER",
      sources: [userSource("c-src-seller")],
      updatedAt: "12.09.2026",
    },
    {
      localId: "cf-purchase-date",
      factKey: "purchase_date",
      title: "Дата покупки",
      value: "10.08.2026",
      state: "CONFLICT",
      sources: [userSource("c-src-date-user", "Сообщение пользователя (интервью)")],
      conflict: {
        detectedAt: "12.09.2026",
        variants: [
          { value: "10.08.2026", source: userSource("c-var-user", "Сообщение пользователя (интервью)") },
          {
            value: "12.08.2026",
            source: docSource(
              "c-var-receipt",
              "receipt-2",
              "Чек (копия).pdf, стр. 1, «Дата продажи»",
            ),
          },
        ],
      },
      requiresClarification: true,
      updatedAt: "12.09.2026",
    },
    {
      localId: "cf-price",
      factKey: "price",
      title: "Стоимость",
      value: "24 900 ₽",
      state: "CONFIRMED_BY_DOCUMENT",
      sources: [docSource("c-src-price", "receipt-2", "Чек (копия).pdf, стр. 1, «Итого»")],
      updatedAt: "12.09.2026",
    },
    {
      localId: "cf-defect-description",
      factKey: "defect_description",
      title: "Неисправность",
      value: "Не включается одна конфорка",
      state: "CONFIRMED_BY_USER",
      sources: [userSource("c-src-defect")],
      updatedAt: "12.09.2026",
    },
    {
      localId: "cf-demand",
      factKey: "user_demand",
      title: "Требование пользователя",
      value: "Возврат денежных средств",
      state: "CONFIRMED_BY_USER",
      sources: [userSource("c-src-demand")],
      updatedAt: "12.09.2026",
    },
  ],
};