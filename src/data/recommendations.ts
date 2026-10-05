import type { Recommendation } from "../types/domain";
import { aiDisclaimer } from "../types/labels";

/**
 * Рекомендации AI. Каждая содержит основания со ссылками на факты и документы,
 * чтобы пользователь понимал, почему предложен этот вариант (§8).
 */
export const recommendationSeeds: Record<string, Recommendation[]> = {
  "LC-2026-001": [
    {
      id: "r-peaceful",
      caseId: "LC-2026-001",
      title: "Попробовать решить вопрос напрямую с продавцом",
      kind: "peacful_resolution",
      description:
        "Вы ещё не направляли продавцу формальное требование. В этой ситуации можно сначала попробовать получить решение без подготовки юридического документа.",
      reasons: [
        { text: "Обращение к продавцу уже было, но без письменного требования." },
        { text: "Факт покупки подтверждён чеком от 12.08.2026.", factIds: ["f-receipt"] },
        {
          text: "Продавец сообщил о необходимости диагностики, сроки ответа не зафиксированы.",
          documentIds: ["chat-log"],
          factIds: ["f-seller-response"],
        },
        {
          text: "Требование пользователя определено: возврат денежных средств.",
          factIds: ["f-demand"],
        },
      ],
      actionId: "CHOOSE_PEACEFUL",
      recommended: true,
      createdAt: "2026-09-06T11:45:00",
      disclaimer: aiDisclaimer,
    },
    {
      id: "r-claim-early",
      caseId: "LC-2026-001",
      title: "Подготовить досудебную претензию",
      kind: "claim",
      description:
        "Можно подготовить письменную претензию с изложением обстоятельств и требования о возврате денежных средств.",
      reasons: [
        { text: "Факт покупки и стоимость товара подтверждены документом.", factIds: ["f-receipt", "f-price"] },
        { text: "Характер неисправности подтверждён фотографией.", factIds: ["f-defect-description"] },
      ],
      actionId: "CHOOSE_CLAIM",
      createdAt: "2026-09-06T11:46:00",
      disclaimer: aiDisclaimer,
    },
    {
      id: "r-lawyer-early",
      caseId: "LC-2026-001",
      title: "Обратиться к юристу",
      kind: "lawyer",
      description: "Можно передать материалы юристу для дополнительной оценки ситуации.",
      reasons: [
        { text: "В деле есть сведения, которые пока не подтверждены документом.", factIds: ["f-extra-costs"] },
      ],
      actionId: "CHOOSE_LAWYER",
      createdAt: "2026-09-06T11:47:00",
      disclaimer: aiDisclaimer,
    },
    {
      id: "r-claim-after-failure",
      caseId: "LC-2026-001",
      title: "Подготовить досудебную претензию",
      kind: "claim",
      description:
        "Мирное урегулирование не дало результата. На основании собранных сведений можно подготовить досудебную претензию с требованием о возврате денежных средств.",
      reasons: [
        { text: "Продавец отказался решить вопрос и потребовал платную диагностику." },
        { text: "Факт покупки подтверждён чеком от 12.08.2026.", factIds: ["f-receipt"] },
        { text: "Требование пользователя определено: возврат денежных средств.", factIds: ["f-demand"] },
        { text: "Имеется информация о предыдущем обращении к продавцу.", factIds: ["f-first-contact-date"] },
      ],
      actionId: "CHOOSE_CLAIM",
      recommended: true,
      createdAt: "2026-09-08T15:22:00",
      disclaimer: aiDisclaimer,
    },
    {
      id: "r-court-preparation",
      caseId: "LC-2026-001",
      title: "Подготовить материалы для судебного продолжения",
      kind: "lawyer",
      description:
        "Для подготовки дела к дальнейшему рассмотрению необходимо собрать дополнительные сведения и передать материалы юристу для профессиональной проверки.",
      reasons: [
        { text: "Продавец отказал в удовлетворении письменного требования.", documentIds: ["counterparty-reply"] },
        { text: "Часть сведений подтверждена документами, часть — только сообщением пользователя." },
        { text: "Есть неподтверждённые данные, которые повлияют на оценку дела.", factIds: ["f-extra-costs"] },
      ],
      actionId: "TRANSFER_TO_LAWYER",
      recommended: true,
      createdAt: "2026-09-19T09:30:00",
      disclaimer: aiDisclaimer,
    },
  ],
  "LC-2026-002": [
    {
      id: "cr-clarify",
      caseId: "LC-2026-002",
      title: "Уточнить дату покупки у пользователя",
      kind: "self_service",
      description:
        "Невозможно надёжно определить правильную дату: ваш ответ и чек содержат разные значения. Система не выбирает одно из значений самостоятельно.",
      reasons: [
        { text: "Ответ пользователя: 10.08.2026 — источник: сообщение пользователя." },
        { text: "Чек: 12.08.2026 — источник: Чек (копия).pdf, стр. 1.", documentIds: ["receipt-2"] },
      ],
      actionId: "SEND_MOCK_CONTRADICTION_CLARIFICATION",
      recommended: true,
      createdAt: "2026-09-12T10:08:00",
      disclaimer: aiDisclaimer,
    },
    {
      id: "cr-lawyer",
      caseId: "LC-2026-002",
      title: "Передать дело юристу",
      kind: "lawyer",
      description:
        "Если уточнить дату самостоятельно не получается, материалы можно передать юристу для проверки. Решение о выборе значения принимает человек, а не система.",
      reasons: [
        { text: "Обнаружено противоречие в подтверждённом документе.", factIds: ["cf-purchase-date"] },
      ],
      actionId: "TRANSFER_TO_LAWYER",
      createdAt: "2026-09-12T10:09:00",
      disclaimer: aiDisclaimer,
    },
  ],
};
