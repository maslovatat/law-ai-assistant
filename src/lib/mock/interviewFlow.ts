import type {
  Case,
  CaseEvent,
  Message,
  Recommendation,
  RecommendationReason,
} from "../../types/domain";
import { aiDisclaimer } from "../../types/labels";
import { formatDisplayDate } from "./clock";
import { attachDocument, attachmentsForAnswers, withDerivedFacts } from "./caseService";

export function aiMessage(caseItem: Case, text: string, tone: Message["tone"], time: string): Message {
  return {
    id: `${caseItem.id}:msg:ai:${caseItem.messages.length}`,
    caseId: caseItem.id,
    author: "ai",
    text,
    timestamp: time,
    tone,
  };
}

function aiEvent(caseItem: Case, event: Omit<CaseEvent, "id" | "caseId">): CaseEvent {
  return { ...event, id: `${caseItem.id}:ev:${caseItem.events.length}`, caseId: caseItem.id };
}

function buildInitialRecommendations(caseItem: Case, time: string): Recommendation[] {
  const purchaseFact = caseItem.facts.find((f) => f.key === "purchase_date");
  const demandFact = caseItem.facts.find((f) => f.key === "user_demand");
  const reasons: RecommendationReason[] = [
    { text: "Обращение к продавцу ещё не было, либо оно было устным." },
    ...(purchaseFact ? [{ text: "Факт покупки подтверждён чеком.", factIds: [purchaseFact.id] }] : []),
    ...(demandFact ? [{ text: "Требование пользователя определено.", factIds: [demandFact.id] }] : []),
  ];

  return [
    {
      id: `${caseItem.id}:rec:peaceful`,
      caseId: caseItem.id,
      title: "Попробовать решить вопрос напрямую с продавцом",
      kind: "peacful_resolution",
      description:
        "Вы ещё не направляли продавцу формальное требование. В этой ситуации можно сначала попробовать получить решение без подготовки юридического документа.",
      reasons,
      actionId: "CHOOSE_PEACEFUL",
      recommended: true,
      createdAt: time,
      disclaimer: aiDisclaimer,
    },
    {
      id: `${caseItem.id}:rec:claim`,
      caseId: caseItem.id,
      title: "Подготовить досудебную претензию",
      kind: "claim",
      description:
        "Можно подготовить письменную претензию с изложением обстоятельств и требованием о возврате денежных средств.",
      reasons,
      actionId: "CHOOSE_CLAIM",
      createdAt: time,
      disclaimer: aiDisclaimer,
    },
    {
      id: `${caseItem.id}:rec:lawyer`,
      caseId: caseItem.id,
      title: "Обратиться к юристу",
      kind: "lawyer",
      description: "Можно передать материалы юристу для дополнительной оценки ситуации.",
      reasons: [{ text: "Есть сведения, которые пока не подтверждены документом." }],
      actionId: "CHOOSE_LAWYER",
      createdAt: time,
      disclaimer: aiDisclaimer,
    },
  ];
}

function buildConflictRecommendations(caseItem: Case, time: string): Recommendation[] {
  const dateFact = caseItem.facts.find((f) => f.key === "purchase_date");
  return [
    {
      id: `${caseItem.id}:rec:clarify`,
      caseId: caseItem.id,
      title: "Уточнить дату покупки",
      kind: "self_service",
      description:
        "Невозможно надёжно определить правильную дату: ваш ответ и документ содержат разные значения. Система не выбирает одно из значений самостоятельно.",
      reasons: (dateFact?.conflict?.variants ?? []).map((variant) => ({
        text: `${variant.value} — источник: ${variant.source.label}.`,
        factIds: dateFact ? [dateFact.id] : [],
      })),
      actionId: "SEND_MOCK_CONTRADICTION_CLARIFICATION",
      recommended: true,
      createdAt: time,
      disclaimer: aiDisclaimer,
    },
    {
      id: `${caseItem.id}:rec:lawyer-conflict`,
      caseId: caseItem.id,
      title: "Передать дело юристу",
      kind: "lawyer",
      description:
        "Если уточнить дату самостоятельно не получается, материалы можно передать юристу для проверки. Решение о выборе значения принимает человек, а не система.",
      reasons: [{ text: "Обнаружено противоречие в подтверждённом документе.", factIds: dateFact ? [dateFact.id] : [] }],
      actionId: "TRANSFER_TO_LAWYER",
      createdAt: time,
      disclaimer: aiDisclaimer,
    },
  ];
}

export function completeInterview(item: Case, today: string): Case {
  const display = formatDisplayDate(today);
  const time = `${today}T11:40:00`;
  const answers = item.interviewAnswers ?? [];
  let next: Case = {
    ...item,
    ...withDerivedFacts(item, answers),
    stage: "ANALYSIS",
    flags: [],
    interviewCompletedAt: display,
    updatedAt: display,
    expectedEvent: {
      id: `${item.id}:ee:after-interview`,
      title: "Посмотреть факты и выбрать способ решения",
      description: "AI подготовит варианты действий с указанием оснований.",
      responsible: "user",
      actionId: "VIEW_FACTS",
    },
  };

  for (const key of attachmentsForAnswers(answers)) {
    next = attachDocument(next, key, { user_name: "Соколова Ирина" });
  }

  const hasConflict = next.facts.some((fact) => fact.state === "CONFLICT");
  if (hasConflict) {
    next = {
      ...next,
      flags: ["CONFLICT_DETECTED", "NEEDS_CLARIFICATION", "WAITING_USER"],
      expectedEvent: {
        id: `${item.id}:ee:conflict`,
        title: "Уточнить противоречие в данных",
        description:
          "Источники расходятся. Система не выбирает значение самостоятельно: уточнение остаётся за пользователем или юристом.",
        responsible: "user",
        actionId: "SEND_MOCK_CONTRADICTION_CLARIFICATION",
      },
    };
    next = attachDocument(next, "contradiction-note", {
      user_name: "Соколова Ирина",
    });
  }

  next = {
    ...next,
    events: [
      ...next.events,
      aiEvent(next, {
        kind: "interview_completed",
        title: "AI завершил интервью",
        description: `Получены ответы на ${answers.length} вопросов, сформированы факты дела с указанием источников.`,
        date: display,
        timestamp: time,
        initiator: "ai",
        sourceLabel: "AI-интервью",
      }),
      ...(hasConflict
        ? [
            aiEvent(next, {
              kind: "facts_structured",
              title: "Обнаружено противоречие в данных",
              description:
                "Ответ пользователя не совпадает с данными документа. Система не выбирает значение самостоятельно.",
              date: display,
              timestamp: time,
              initiator: "ai",
              sourceLabel: "AI-анализ",
            }),
          ]
        : [
            aiEvent(next, {
              kind: "facts_structured",
              title: "Сформированы факты дела",
              description:
                "Факты и источники доступны на вкладке «Факты». Часть сведений подтверждена документами.",
              date: display,
              timestamp: time,
              initiator: "ai",
              sourceLabel: "AI-анализ",
            }),
          ]),
    ],
    messages: [
      ...next.messages,
      aiMessage(
        next,
        hasConflict
          ? "Интервью завершено. Я обнаружил противоречие: один из фактов подтверждается двумя источниками, которые дают разные значения. Я покажу оба источника и не стану выбирать между ними самостоятельно."
          : "Интервью завершено. Я структурировал сведения в факты дела и указал источник каждого факта. Обратите внимание: часть сведений подтверждена документами, часть — только вашим сообщением.",
        hasConflict ? "warning" : "info",
        time,
      ),
    ],
    recommendations: hasConflict
      ? buildConflictRecommendations(next, time)
      : buildInitialRecommendations(next, time),
  };

  return next;
}
