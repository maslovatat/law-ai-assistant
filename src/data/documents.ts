import type {
  CaseDocument,
  DocumentBlock,
  DocumentContent,
  DocumentKind,
  DocumentStatus,
  FactKey,
} from "../types/domain";

export interface DocumentTemplate {
  /** Ключ шаблона. Идентификатор документа в деле собирается как `${caseId}:${key}`. */
  key: string;
  caseId: string;
  name: string;
  kind: DocumentKind;
  status: DocumentStatus;
  createdAt: string;
  origin: CaseDocument["origin"];
  pageCount?: number;
  note: string;
  basedOnFactKeys?: FactKey[];
  attachments?: string[];
  /** true — документ оформляется системой автоматически при наступлении события. */
  autoAttach?: boolean;
  content: DocumentContent;
}

/**
 * Mock-документы. Настоящая обработка PDF/DOCX не выполняется (docs/prototype.md §29).
 * `{{token}}` подставляются значениями фактов при формировании документа.
 */
export const documentTemplates: DocumentTemplate[] = [
  {
    key: "receipt",
    caseId: "LC-2026-001",
    name: "Чек.pdf",
    kind: "receipt",
    status: "received",
    createdAt: "{{receipt_date}}",
    origin: "user_upload",
    pageCount: 1,
    note: "Загружен пользователем вместе с первым обращением",
    content: {
      title: "Кассовый чек",
      blocks: [
        {
          kind: "kv",
          rows: [
            { label: "Продавец", value: "{{seller}}" },
            { label: "ИНН", value: "7700000000 (демо)" },
            { label: "Адрес", value: "г. Москва, ул. Примерная, д. 1 (демо)" },
            { label: "Дата продажи", value: "{{receipt_date}}" },
            { label: "Время", value: "18:42" },
            { label: "Способ оплаты", value: "Банковская карта" },
          ],
        },
        { kind: "heading", text: "Позиции чека" },
        {
          kind: "list",
          items: [
            "{{product}} — 1 шт. — {{price}}",
            "Доставка — 1 шт. — 0,00 ₽ (акция магазина)",
            "Итого: {{price}}",
          ],
        },
        { kind: "heading", text: "Отметка о гарантии" },
        {
          kind: "paragraph",
          text: "Гарантийный срок — 24 месяца с даты продажи. Гарантийный талон выдан.",
        },
      ],
      attachments: ["Гарантийный талон (в оригинале у пользователя)"],
    },
  },
  {
    key: "photo",
    caseId: "LC-2026-001",
    name: "Фотография дефекта.jpg",
    kind: "photo",
    status: "received",
    createdAt: "{{defect_found_date}}",
    origin: "user_upload",
    note: "Фотография показания индикатора",
    content: {
      title: "Фотография: показание индикатора",
      blocks: [
        {
          kind: "paragraph",
          text: "[Демонстрационное изображение] На снимке зафиксировано показание индикатора, соответствующее признаку неисправности, описанной пользователем.",
        },
        {
          kind: "list",
          items: [
            "Описание: {{defect_description}}",
            "Дата снимка: {{defect_found_date}}",
          ],
        },
      ],
    },
  },
  {
    key: "chat-log",
    caseId: "LC-2026-001",
    name: "Переписка с продавцом.pdf",
    kind: "chat_log",
    status: "received",
    createdAt: "{{first_contact_date}}",
    origin: "user_upload",
    pageCount: 2,
    note: "Экспорт переписки из мессенджера",
    content: {
      title: "Переписка с отделом обслуживания",
      blocks: [
        {
          kind: "paragraph",
          text: "[Демонстрационная переписка] {{first_contact_date}} — Пользователь сообщает о неисправности, прикладывает чек и просит сообщить порядок действий.",
        },
        {
          kind: "paragraph",
          text: "Ответ продавца: для рассмотрения обращения требуется провести диагностику товара.",
        },
        {
          kind: "paragraph",
          text: "Пользователь уточняет сроки ответа по результатам диагностики. Конкретный срок не зафиксирован.",
        },
      ],
    },
  },
  {
    key: "claim",
    caseId: "LC-2026-001",
    name: "Претензия.docx",
    kind: "claim",
    status: "draft",
    createdAt: "{{generated_date}}",
    origin: "ai_generated",
    note: "Сформирован на основе фактов дела",
    basedOnFactKeys: [
      "product",
      "seller",
      "purchase_date",
      "price",
      "defect_description",
      "defect_found_date",
      "first_contact_date",
      "user_demand",
    ],
    attachments: [
      "Копия кассового чека — 1 экз.",
      "Копия гарантийного талона — 1 экз.",
      "Фотография показания индикатора — 1 файл.",
      "Копия переписки с продавцом — 2 стр.",
    ],
    content: {
      title: "Претензия продавцу",
      blocks: [
        {
          kind: "kv",
          rows: [
            { label: "Кому", value: "{{seller}}, г. Москва, ул. Примерная, д. 1 (демо-адрес)" },
            { label: "От кого", value: "{{user_name}}, адрес для корреспонденции указан в деле (демо)" },
            { label: "Дата", value: "{{generated_date}}" },
          ],
        },
        { kind: "heading", text: "1. Обстоятельства покупки" },
        {
          kind: "paragraph",
          text: "Я, {{user_name}}, приобрела товар {{product}} у {{seller}} {{purchase_date}}. Стоимость товара составила {{price}}. Факт покупки подтверждается кассовым чеком от {{purchase_date}}.",
        },
        { kind: "heading", text: "2. Обнаруженная неисправность" },
        {
          kind: "paragraph",
          text: "{{defect_found_date}} мною был обнаружен дефект: {{defect_description}}. Обнаружение подтверждается фотографией от {{defect_found_date}}.",
        },
        { kind: "heading", text: "3. Обращение к продавцу" },
        {
          kind: "paragraph",
          text: "{{first_contact_date}} я обратилась в {{seller}}. Продавец сообщил, что до рассмотрения обращения требуется провести диагностику товара. Переписка подтверждается документом «Переписка с продавцом».",
        },
        { kind: "heading", text: "4. Требование" },
        {
          kind: "paragraph",
          text: "На основании изложенного прошу в течение 10 календарных дней с момента получения настоящей претензии удовлетворить требование: {{user_demand}}.",
        },
        { kind: "heading", text: "5. Приложения" },
        {
          kind: "list",
          items: [
            "Копия кассового чека от {{purchase_date}} — 1 экз.",
            "Копия гарантийного талона — 1 экз.",
            "Фотография показания индикатора от {{defect_found_date}} — 1 файл.",
            "Копия переписки с продавцом от {{first_contact_date}} — 2 стр.",
          ],
        },
      ],
    },
  },
  {
    key: "send-confirmation",
    caseId: "LC-2026-001",
    name: "Подтверждение отправки.pdf",
    kind: "confirmation",
    status: "sent_demo",
    createdAt: "{{generated_date}}",
    origin: "system",
    note: "Сформировано после демонстрационной отправки",
    autoAttach: true,
    content: {
      title: "Подтверждение демонстрационной отправки",
      blocks: [
        {
          kind: "paragraph",
          text: "Документ «Претензия.docx» передан через демонстрационный канал связи {{generated_date}}.",
        },
        {
          kind: "paragraph",
          text: "Это демонстрационное событие. Реальной отправки юридически значимого документа не производилось.",
        },
        {
          kind: "kv",
          rows: [
            { label: "Канал", value: "Демонстрационный канал (симуляция)" },
            { label: "Дата и время", value: "{{generated_date}}, 10:14" },
            { label: "Получатель", value: "{{seller}} (демо)" },
            { label: "Приложения", value: "4 файла" },
          ],
        },
      ],
    },
  },
  {
    key: "counterparty-reply",
    caseId: "LC-2026-001",
    name: "Ответ продавца.pdf",
    kind: "counterparty_reply",
    status: "received",
    createdAt: "{{reply_date}}",
    origin: "counterparty",
    pageCount: 2,
    note: "Получен от контрагента",
    content: {
      title: "Ответ на претензию",
      blocks: [
        {
          kind: "kv",
          rows: [
            { label: "От кого", value: "{{seller}}, служба поддержки (демо)" },
            { label: "Дата", value: "{{reply_date}}" },
            { label: "На претензию от", value: "{{sent_date}}" },
          ],
        },
        { kind: "heading", text: "Мотивы отказа" },
        {
          kind: "paragraph",
          text: "В удовлетворении заявленного требования отказано. Продавец сообщает, что товар прошёл плановое тестирование при приёмке, а заявленная неисправность не подтверждена.",
        },
        { kind: "heading", text: "Позиция продавца" },
        {
          kind: "list",
          items: [
            "Товар не проходил сервисное обслуживание по документам продавца.",
            "Обращение передано в технический отдел, выводы не представлены.",
            "Продавец полагает, что неисправность вызвана нарушением правил эксплуатации, доказательства не приложены.",
          ],
        },
        { kind: "heading", text: "Предложение продавца" },
        {
          kind: "paragraph",
          text: "Продавец предлагает провести платную диагностику. Стоимость — 2 500 ₽, оплачивается пользователем. В случае подтверждения неисправности вопрос возврата будет рассмотрен отдельно.",
        },
        {
          kind: "paragraph",
          text: "Ответ сформирован для демонстрации прототипа и не является юридическим документом.",
        },
      ],
    },
  },
  {
    key: "receipt-2",
    caseId: "LC-2026-002",
    name: "Чек (копия).pdf",
    kind: "receipt",
    status: "received",
    createdAt: "{{receipt_date}}",
    origin: "user_upload",
    pageCount: 1,
    note: "Загружен пользователем",
    content: {
      title: "Кассовый чек",
      blocks: [
        {
          kind: "kv",
          rows: [
            { label: "Продавец", value: "ООО «Техника»" },
            { label: "Дата продажи", value: "{{receipt_date}}" },
            { label: "Время", value: "14:05" },
          ],
        },
        { kind: "heading", text: "Позиции чека" },
        {
          kind: "list",
          items: ["{{product}} — 1 шт. — {{price}}", "Итого: {{price}}"],
        },
      ],
    },
  },
  {
    key: "contradiction-note",
    caseId: "LC-2026-002",
    name: "Отметка о противоречии.pdf",
    kind: "other",
    status: "received",
    createdAt: "12.09.2026",
    origin: "system",
    note: "Сформировано системой при обнаружении расхождения",
    autoAttach: true,
    content: {
      title: "Отметка о расхождении в источниках",
      blocks: [
        { kind: "heading", text: "Факт: дата покупки" },
        {
          kind: "list",
          items: [
            "Вариант 1: 10.08.2026 — источник: сообщение пользователя (интервью, вопрос «Когда вы приобрели товар?»).",
            "Вариант 2: 12.08.2026 — источник: Чек (копия).pdf, страница 1, строка «Дата продажи».",
          ],
        },
        { kind: "heading", text: "Вывод системы" },
        {
          kind: "paragraph",
          text: "Невозможно надёжно определить правильную дату. Источники расходятся, а система не выбирает одно из значений самостоятельно. Требуется уточнение у пользователя либо проверка юристом.",
        },
        {
          kind: "paragraph",
          text: "До устранения противоречия факт не может считаться подтверждённым и не используется как подтверждённое основание в документах.",
        },
      ],
    },
  },
];

export function getDocumentTemplate(key: string): DocumentTemplate | undefined {
  return documentTemplates.find((t) => t.key === key);
}

export function renderDocumentContent(
  content: DocumentContent,
  values: Record<string, string>,
): DocumentContent {
  const substitute = (text: string): string =>
    text.replace(/\{\{(\w+)\}\}/g, (match, token: string) => values[token] ?? match);

  const renderBlock = (block: DocumentBlock): DocumentBlock => {
    switch (block.kind) {
      case "paragraph":
        return { kind: "paragraph", text: substitute(block.text) };
      case "heading":
        return { kind: "heading", text: substitute(block.text) };
      case "list":
        return { kind: "list", items: block.items.map(substitute) };
      case "kv":
        return {
          kind: "kv",
          rows: block.rows.map((row) => ({
            label: substitute(row.label),
            value: substitute(row.value),
          })),
        };
    }
  };

  return {
    title: substitute(content.title),
    blocks: content.blocks.map(renderBlock),
    attachments: content.attachments?.map(substitute),
  };
}