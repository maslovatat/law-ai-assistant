import type { Case } from "../types/domain";
import { demoLawyer, demoUser } from "./users";
import { buildSeedCase, type SeedCaseSpec } from "../lib/mock/caseFactory";
import { factId } from "../lib/mock/ids";

/**
 * Демонстрационные дела. Состояние описано данными: этап, флаги, ожидаемое событие,
 * факты, документы и история. Общая логика переходов не зависит от номера дела,
 * поэтому набор демо-дел можно заменить (docs/prototype.md §38).
 */
export const seedCaseSpecs: SeedCaseSpec[] = [
  {
    id: "LC-2026-001",
    number: "№ LC-2026-001",
    title: "Возврат денежных средств за неисправный товар",
    category: "Защита прав потребителей",
    summary:
      "Приобретён холодильник, через месяц обнаружена неисправность. Продавец отказал в возврате денег и после направленной претензии предложил платную диагностику.",
    situation:
      "Я купила холодильник, через месяц он перестал нормально работать. Я обратилась в магазин, но мне сказали, что сначала нужно провести проверку.",
    counterparty: "ООО «Техника»",
    stage: "LAWYER_REVIEW",
    flags: ["NEEDS_LAWYER", "WAITING_USER"],
    createdAt: "05.09.2026",
    updatedAt: "22.09.2026",
    interviewCompletedAt: "06.09.2026",
    priority: "normal",
    user: demoUser,
    documentKeys: [
      "receipt",
      "photo",
      "chat-log",
      "claim",
      "send-confirmation",
      "counterparty-reply",
    ],
    documentValues: {
      user_name: "Соколова Ирина",
      generated_date: "08.09.2026",
      sent_date: "09.09.2026",
      reply_date: "18.09.2026",
    },
    interviewAnswers: [
      { questionId: "q-product", value: "Холодильник", answeredAt: "06.09.2026" },
      { questionId: "q-model", value: "ATLANT ХМ 4624-101, 2024", answeredAt: "06.09.2026" },
      { questionId: "q-channel", value: "В магазине ООО «Техника»", answeredAt: "06.09.2026" },
      { questionId: "q-purchase-date", value: "12.08.2026", answeredAt: "06.09.2026" },
      { questionId: "q-price", value: "49 990 ₽", answeredAt: "06.09.2026" },
      {
        questionId: "q-defect",
        value: "Не охлаждает, температура выше заявленной",
        answeredAt: "06.09.2026",
      },
      { questionId: "q-defect-date", value: "15.09.2026", answeredAt: "06.09.2026" },
      { questionId: "q-first-contact", value: "20.09.2026", answeredAt: "06.09.2026" },
      { questionId: "q-seller-response", value: "Сказал, что сначала нужна проверка", answeredAt: "06.09.2026" },
      { questionId: "q-receipt", value: "Есть чек", answeredAt: "06.09.2026" },
      { questionId: "q-demand", value: "Возврат денежных средств", answeredAt: "06.09.2026" },
      { questionId: "q-extra-costs", value: "Нет, расходов не было", answeredAt: "06.09.2026" },
    ],
    expectedEvent: {
      id: "ee-001-extra-costs",
      title: "Предоставить сведения о дополнительных расходах",
      description:
        "Юрист запросил подтверждение суммы дополнительных расходов и приложение, если оно есть.",
      responsible: "user",
      actionId: "ANSWER_LAWYER",
    },
    issues: [
      {
        id: "i-001",
        text: "Не подтверждена сумма дополнительных расходов: чек не сохранён.",
        severity: "warning",
        factId: factId("LC-2026-001", "extra_costs"),
        raisedBy: "lawyer",
      },
      {
        id: "i-002",
        text: "Позиция продавца о нарушении правил эксплуатации не подтверждена документами.",
        severity: "warning",
        raisedBy: "lawyer",
      },
      {
        id: "i-003",
        text: "Требуется оценить, достаточно ли имеющихся материалов для следующего этапа.",
        severity: "info",
        raisedBy: "ai",
      },
    ],
    transferReason: "Требуется профессиональная проверка сведений и оценка дальнейших действий",
    transferredAt: "20.09.2026",
    assignedLawyerId: demoLawyer.id,
    queueStatus: "in_progress",
    lawyerDecisions: [
      {
        id: "ld-001",
        caseId: "LC-2026-001",
        type: "request_data",
        title: "Запросить дополнительные данные",
        comment:
          "Материалы в целом собраны. Для оценки дальнейших действий требуется подтвердить дату обращения к продавцу и сумму дополнительных расходов.",
        lawyerName: demoLawyer.name,
        createdAt: "22.09.2026T09:40:00",
        requestedItems: [
          {
            id: "ri-001",
            label: "Подтверждение даты обращения к продавцу",
            factId: factId("LC-2026-001", "first_contact_date"),
          },
          {
            id: "ri-002",
            label: "Подтверждение суммы дополнительных расходов",
            factId: factId("LC-2026-001", "extra_costs"),
          },
        ],
      },
    ],
  },
  {
    id: "LC-2026-002",
    number: "№ LC-2026-002",
    title: "Противоречие в данных о покупке",
    category: "Защита прав потребителей",
    summary:
      "Дата покупки в сообщении пользователя не совпадает с датой в чеке. Требуется уточнение: система не выбирает значение самостоятельно.",
    situation: "Я купил товар 10.08.2026, а в чеке указано 12.08.2026.",
    counterparty: "ООО «Техника»",
    stage: "ANALYSIS",
    flags: ["CONFLICT_DETECTED", "NEEDS_CLARIFICATION", "WAITING_USER"],
    createdAt: "12.09.2026",
    updatedAt: "12.09.2026",
    interviewCompletedAt: "12.09.2026",
    priority: "high",
    user: demoUser,
    documentKeys: ["receipt-2", "contradiction-note"],
    interviewAnswers: [
      { questionId: "cq-product", value: "Варочная панель", answeredAt: "12.09.2026" },
      { questionId: "cq-channel", value: "В магазине ООО «Техника»", answeredAt: "12.09.2026" },
      { questionId: "cq-purchase-date", value: "10.08.2026", answeredAt: "12.09.2026" },
      { questionId: "cq-price", value: "24 900 ₽", answeredAt: "12.09.2026" },
      { questionId: "cq-defect", value: "Не включается одна конфорка", answeredAt: "12.09.2026" },
      { questionId: "cq-demand", value: "Возврат денежных средств", answeredAt: "12.09.2026" },
    ],
    expectedEvent: {
      id: "ee-002-clarify",
      title: "Уточнить дату покупки",
      description:
        "Источники расходятся: сообщение пользователя и чек. Выбор значения остаётся за пользователем или юристом.",
      responsible: "user",
      deadline: "20.10.2026",
      actionId: "SEND_MOCK_CONTRADICTION_CLARIFICATION",
    },
    issues: [
      {
        id: "ci-001",
        text: "Невозможно надёжно определить дату покупки: источники расходятся.",
        severity: "warning",
        factId: factId("LC-2026-002", "purchase_date"),
        raisedBy: "ai",
      },
    ],
  },
];

export function createSeedCases(): Case[] {
  return seedCaseSpecs.map(buildSeedCase);
}