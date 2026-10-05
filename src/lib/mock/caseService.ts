import type {
  ActionId,
  Case,
  CaseEvent,
  CaseFact,
  FactKey,
  FactSource,
  InterviewAnswer,
  InterviewScript,
  LawyerDecision,
  LawyerDecisionType,
  Message,
  Recommendation,
  Task,
} from "../../types/domain";
import { aiDisclaimer } from "../../types/labels";
import { getDocumentTemplate, type DocumentTemplate } from "../../data/documents";
import { getAction } from "../actions";
import {
  buildDocumentValues,
  docId,
  factId,
  materializeDocuments,
  RECEIPT_DATE,
  type FactLike,
} from "./ids";

export interface ActionPayload {
  [fieldId: string]: string;
}

export interface ServiceNotice {
  tone: "neutral" | "progress" | "attention" | "danger" | "success";
  title: string;
  message: string;
}

export interface ActionOutcome {
  caseItem: Case;
  notice: ServiceNotice;
}

/** Действия, которые только меняют экран, а не состояние дела. */
export const navigationActions: ActionId[] = ["START_INTERVIEW", "VIEW_FACTS", "REVIEW_COUNTERPARTY_REPLY"];

export function isNavigationAction(id: ActionId): boolean {
  return navigationActions.includes(id);
}

let sequence = 0;
function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence}`;
}

/** Сброс счётчика идентификаторов выполняется только в демонстрационных целях. */
export function resetSequence(): void {
  sequence = 0;
}

interface Ctx {
  today: string;
  displayToday: string;
  timestamp: string;
}

function makeCtx(today: string): Ctx {
  const [year, month, day] = today.split("-");
  return {
    today,
    displayToday: `${day}.${month}.${year}`,
    timestamp: `${today}T10:00:00`,
  };
}

function addEvent(caseItem: Case, event: Omit<CaseEvent, "id" | "caseId">): Case {
  return {
    ...caseItem,
    events: [...caseItem.events, { ...event, id: nextId("ev"), caseId: caseItem.id }],
  };
}

function addMessage(caseItem: Case, message: Omit<Message, "id" | "caseId">): Case {
  return {
    ...caseItem,
    messages: [...caseItem.messages, { ...message, id: nextId("msg"), caseId: caseItem.id }],
  };
}

function addRecommendation(caseItem: Case, recommendation: Omit<Recommendation, "id" | "caseId">): Case {
  return {
    ...caseItem,
    recommendations: [
      ...caseItem.recommendations,
      { ...recommendation, id: nextId("rec"), caseId: caseItem.id },
    ],
  };
}

function setFlags(caseItem: Case, flags: Case["flags"]): Case {
  return { ...caseItem, flags };
}

function updateFact(caseItem: Case, key: FactKey, patch: Partial<CaseFact>): Case {
  return {
    ...caseItem,
    facts: caseItem.facts.map((fact) => (fact.key === key ? { ...fact, ...patch } : fact)),
  };
}

export function attachDocumentTemplate(
  caseItem: Case,
  key: string,
  extraValues: Record<string, string> = {},
): Case {
  const template: DocumentTemplate | undefined = getDocumentTemplate(key);
  if (!template || caseItem.documents.some((d) => d.id === docId(caseItem.id, key))) return caseItem;
  const values = buildDocumentValues(factsOf(caseItem), extraValues);
  const [document] = materializeDocuments(caseItem.id, [template], values);
  return { ...caseItem, documents: [...caseItem.documents, document] };
}

function findFactValue(caseItem: Case, key: FactKey): string | undefined {
  return caseItem.facts.find((f) => f.key === key)?.value;
}

function factsOf(caseItem: Case): FactLike[] {
  return caseItem.facts.map((fact): FactLike => ({ id: fact.id, key: fact.key, value: fact.value }));
}

function documentValuesFor(caseItem: Case, overrides: Record<string, string> = {}): Record<string, string> {
  return buildDocumentValues(factsOf(caseItem), overrides);
}

// --- Интервью ---------------------------------------------------------------

const factTitles: Partial<Record<FactKey, string>> = {
  product: "Товар",
  device_model: "Модель товара",
  purchase_channel: "Канал покупки",
  seller: "Продавец",
  purchase_date: "Дата покупки",
  price: "Стоимость",
  defect_description: "Неисправность",
  defect_found_date: "Дата обнаружения дефекта",
  first_contact_date: "Дата обращения к продавцу",
  seller_response: "Ответ продавца",
  receipt_available: "Документ о покупке",
  user_demand: "Требование пользователя",
  extra_costs: "Дополнительные расходы",
};

const factStateByKey: Partial<Record<FactKey, CaseFact["state"]>> = {
  purchase_channel: "CONFIRMED_BY_USER",
  device_model: "CONFIRMED_BY_USER",
  defect_found_date: "CONFIRMED_BY_USER",
  first_contact_date: "CONFIRMED_BY_USER",
  seller_response: "CONFIRMED_BY_USER",
  receipt_available: "CONFIRMED_BY_DOCUMENT",
  user_demand: "CONFIRMED_BY_USER",
  extra_costs: "CONFIRMED_BY_USER",
};

function interviewSource(caseId: string, answer: InterviewAnswer): FactSource {
  return {
    id: `${caseId}:src:interview:${answer.questionId}`,
    kind: "user_message",
    label: "Ответ пользователя в AI-интервью",
  };
}

/** Факты, которые подтверждаются загруженным чеком или фотографией. */
const documentBackedFacts: Partial<Record<FactKey, { documentKey: string; label: string }>> = {
  purchase_date: { documentKey: "receipt", label: "Чек.pdf, стр. 1, «Дата продажи»" },
  price: { documentKey: "receipt", label: "Чек.pdf, стр. 1, «Итого»" },
  defect_description: { documentKey: "photo", label: "Фотография дефекта.jpg, стр. 1" },
  first_contact_date: { documentKey: "chat-log", label: "Переписка с продавцом.pdf, стр. 1" },
  seller_response: { documentKey: "chat-log", label: "Переписка с продавцом.pdf, стр. 1" },
  receipt_available: { documentKey: "receipt", label: "Чек.pdf, стр. 1" },
};

/** Продавец определяется из ответа о канале покупки, если он назван прямо. */
function sellerFromChannel(channel: string | undefined): string | undefined {
  return channel?.match(/ООО\s«[^»]+»/)?.[0];
}

/** Собирает факты дела из ответов mock-интервью. */
export function deriveFacts(caseItem: Case, answers: InterviewAnswer[]): CaseFact[] {
  let facts: CaseFact[] = [];
  for (const answer of answers) {
    const key = factKeyForQuestion(caseItem.id, answer.questionId);
    if (!key) continue;
    const value = answer.value.trim();
    if (!value) continue;
    const documentBacking = documentBackedFacts[key];
    const receiptBacked = documentBacking?.documentKey === "receipt";

    const sources: FactSource[] = [
      interviewSource(caseItem.id, answer),
      ...(documentBacking
        ? [
            {
              id: `${caseItem.id}:src:doc:${documentBacking.documentKey}:${key}`,
              kind: "document_page" as const,
              label: documentBacking.label,
              documentId: docId(caseItem.id, documentBacking.documentKey),
            },
          ]
        : []),
    ];

    const base: CaseFact = {
      id: factId(caseItem.id, key),
      caseId: caseItem.id,
      key,
      title: factTitles[key] ?? key,
      value,
      state: factStateByKey[key] ?? "CONFIRMED_BY_USER",
      sources,
      updatedAt: answer.answeredAt,
    };

    // Дата покупки сверяется с чеком: расхождение фиксируется как противоречие,
    // значение не выбирается системой автоматически.
    if (receiptBacked && key === "purchase_date" && value !== RECEIPT_DATE) {
      base.state = "CONFLICT";
      base.requiresClarification = true;
      base.conflict = {
        detectedAt: answer.answeredAt,
        variants: [
          { value, source: sources[0] },
          {
            value: RECEIPT_DATE,
            source: {
              id: `${caseItem.id}:src:doc:receipt:conflict`,
              kind: "document_page",
              label: "Чек.pdf, стр. 1, «Дата продажи»",
              documentId: docId(caseItem.id, "receipt"),
            },
          },
        ],
      };
      base.sources = [sources[0]];
    } else if (documentBacking) {
      base.state = "CONFIRMED_BY_DOCUMENT";
    }

    const existing = facts.find((f) => f.key === key);
    facts = existing ? facts.map((f) => (f.key === key ? { ...base, id: f.id } : f)) : [...facts, base];
  }

  if (!facts.some((fact) => fact.key === "seller")) {
    const channel = facts.find((fact) => fact.key === "purchase_channel");
    const seller = sellerFromChannel(channel?.value);
    if (channel && seller) {
      facts = [
        ...facts,
        {
          id: factId(caseItem.id, "seller"),
          caseId: caseItem.id,
          key: "seller",
          title: "Продавец",
          value: seller,
          state: "CONFIRMED_BY_USER",
          sources: channel.sources,
          updatedAt: channel.updatedAt,
        },
      ];
    }
  }

  return facts;
}

/** Обновляет факты дела по ответам интервью и синхронизирует флаги противоречий. */
export function withDerivedFacts(caseItem: Case, answers: InterviewAnswer[]): Case {
  return syncFactFlags({ ...caseItem, facts: deriveFacts(caseItem, answers) });
}

const questionKeyCache = new Map<string, FactKey>();

export function registerScript(caseId: string, script: InterviewScript): void {
  for (const question of script.questions) {
    questionKeyCache.set(`${caseId}:${question.id}`, question.factKey);
  }
}

function factKeyForQuestion(caseId: string, questionId: string): FactKey | undefined {
  return questionKeyCache.get(`${caseId}:${questionId}`);
}

/** Какие mock-документы доступны после опроса о наличии документов и обращении. */
export function attachmentsForAnswers(answers: InterviewAnswer[]): string[] {
  const values = new Map(answers.map((a) => [a.questionId, a.value]));
  const keys: string[] = [];
  const receipt = [
    values.get("q-receipt"),
    values.get("cq-receipt"),
  ].some((v) => v && v !== "Документа нет" && v !== "Только скриншот оплаты");
  if (receipt) keys.push("receipt");
  if (values.get("q-defect-found-date") || values.get("q-defect")) keys.push("photo");
  const hasContact = values.get("q-first-contact");
  if (hasContact && hasContact !== "Не обращался") keys.push("chat-log");
  return keys;
}

// --- Обработчики действий ---------------------------------------------------

type Handler = (caseItem: Case, payload: ActionPayload, ctx: Ctx) => ActionOutcome;

/** Флаги, которые следуют из состояния фактов, а не из действий пользователя. */
function syncFactFlags(caseItem: Case): Case {
  const hasConflict = caseItem.facts.some((fact) => Boolean(fact.conflict));
  const hasClarification = caseItem.facts.some((fact) => fact.requiresClarification);

  let flags = caseItem.flags;
  if (hasConflict && !flags.includes("CONFLICT_DETECTED")) flags = [...flags, "CONFLICT_DETECTED"];
  if (!hasConflict && flags.includes("CONFLICT_DETECTED")) flags = flags.filter((f) => f !== "CONFLICT_DETECTED");
  if (hasClarification && !flags.includes("NEEDS_CLARIFICATION")) flags = [...flags, "NEEDS_CLARIFICATION"];
  if (!hasClarification && flags.includes("NEEDS_CLARIFICATION")) flags = flags.filter((f) => f !== "NEEDS_CLARIFICATION");
  if (flags.length === caseItem.flags.length) return caseItem;
  return { ...caseItem, flags };
}

const handlers: Partial<Record<ActionId, Handler>> = {
  RESTART_INTERVIEW: (caseItem, _payload, ctx) => ({
    caseItem: addEvent(
      {
        ...caseItem,
        stage: "INFO_COLLECTION",
        flags: ["WAITING_USER"],
        expectedEvent: {
          id: nextId("ee"),
          title: "Пройти AI-интервью",
          description: "AI уточнит детали, чтобы дополнить факты дела.",
          responsible: "user",
        },
      },
      {
        kind: "interview_started",
        title: "Интервью запущено повторно",
        description: "Пользователь уточняет сведения. Ранее собранные факты сохраняются.",
        date: ctx.displayToday,
        timestamp: ctx.timestamp,
        initiator: "user",
        sourceLabel: "AI-интервью",
      },
    ),
    notice: {
      tone: "progress",
      title: "Интервью запущено",
      message: "Ответьте на вопросы AI — новые сведения дополнят факты дела.",
    },
  }),

  CHOOSE_PEACEFUL: (caseItem, _payload, ctx) => {
    const task: Task = {
      id: nextId("task"),
      caseId: caseItem.id,
      title: "Связаться с продавцом и сообщить о проблеме",
      description: "Попросите продавца сообщить порядок действий и сроки, сохраните переписку.",
      assignee: "user",
      status: "open",
      dueDate: "10.10.2026",
      createdAt: ctx.today,
    };
    let next: Case = {
      ...caseItem,
      stage: "AWAITING_RESULT",
      flags: ["WAITING_USER"],
      tasks: [...caseItem.tasks, task],
      expectedEvent: {
        id: nextId("ee"),
        title: "Сообщить результат обращения к продавцу",
        description: "От этого зависит следующий шаг дела.",
        responsible: "user",
        actionId: "REPORT_PEACEFUL_RESULT",
      },
    };
    next = addEvent(next, {
      kind: "action_selected",
      title: "Выбрано мирное урегулирование",
      description: "Выбран вариант обращения к продавцу напрямую, без подготовки юридического документа.",
      date: ctx.displayToday,
      timestamp: ctx.timestamp,
      initiator: "user",
      sourceLabel: "Рекомендация AI",
    });
    next = addEvent(next, {
      kind: "task_created",
      title: "Создана задача: связаться с продавцом",
      description: "Ответственный: пользователь. Рекомендуемый срок: до 10.10.2026.",
      date: ctx.displayToday,
      timestamp: ctx.timestamp,
      initiator: "ai",
      sourceLabel: "Задача",
    });
    return {
      caseItem: next,
      notice: {
        tone: "attention",
        title: "Создана задача",
        message: "Дело ожидает результата обращения к продавцу. Сообщите о результате, когда он станет известен.",
      },
    };
  },

  REPORT_PEACEFUL_RESULT: (caseItem, payload, ctx) => {
    const result = payload.result ?? "seller_refused";
    const resolved = result === "seller_agreed";
    let next: Case = {
      ...caseItem,
      tasks: caseItem.tasks.map((task) =>
        task.status === "open"
          ? {
              ...task,
              status: "done",
              completedAt: ctx.today,
              result: resultLabel(result),
            }
          : task,
      ),
      updatedAt: ctx.today,
    };

    next = addEvent(next, {
      kind: "task_completed",
      title: resolved ? "Продавец согласился решить проблему" : "Пользователь сообщил о результате обращения",
      description: resultLabel(result),
      date: ctx.displayToday,
      timestamp: ctx.timestamp,
      initiator: "user",
      sourceLabel: "Сообщение пользователя",
    });

    next = addMessage(next, {
      author: "user",
      text: resultDescription(result),
      timestamp: ctx.timestamp,
    });

    if (resolved) {
      next = addMessage(next, {
        author: "ai",
        text: "По имеющимся данным вопрос решён. Дело можно закрыть. Если результат изменится, новое дело всегда можно создать заново.",
        timestamp: ctx.timestamp,
        tone: "success",
      });
      next = {
        ...next,
        stage: "CLOSED",
        flags: [],
        expectedEvent: undefined,
        outcome: {
          result: "solved",
          reason: "resolved",
          title: "Проблема решена",
          comment: "Продавец согласился решить вопрос.",
          closedAt: ctx.today,
        },
      };
      return {
        caseItem: addEvent(next, {
          kind: "case_closed",
          title: "Дело завершено",
          description: "Проблема решена, сопровождение завершено.",
          date: ctx.displayToday,
          timestamp: ctx.timestamp,
          initiator: "system",
          sourceLabel: "Итог дела",
        }),
        notice: {
          tone: "success",
          title: "Проблема решена",
          message: "Дело завершено. История дела сохранена.",
        },
      };
    }

    const reasons = [
      { text: "Продавец отказался решить вопрос или потребовал платную диагностику." },
      ...(findFactValue(caseItem, "purchase_date")
        ? [{ text: "Факт покупки подтверждён чеком.", factIds: [factId(caseItem.id, "purchase_date")] }]
        : []),
      ...(findFactValue(caseItem, "user_demand")
        ? [{ text: "Требование пользователя определено.", factIds: [factId(caseItem.id, "user_demand")] }]
        : []),
    ];

    next = setFlags(next, []);
    next = addRecommendation(next, {
      title: "Подготовить досудебную претензию",
      kind: "claim",
      description:
        "Мирное урегулирование не дало результата. На основании собранных сведений можно подготовить досудебную претензию.",
      reasons,
      actionId: "CHOOSE_CLAIM",
      recommended: true,
      createdAt: ctx.timestamp,
      disclaimer: aiDisclaimer,
    });
    next = addRecommendation(next, {
      title: "Обратиться к юристу",
      kind: "lawyer",
      description: "Материалы можно передать юристу для профессиональной оценки ситуации.",
      reasons: [{ text: "Продолжение дела без юриста может потребовать дополнительной подготовки." }],
      actionId: "CHOOSE_LAWYER",
      createdAt: ctx.timestamp,
      disclaimer: aiDisclaimer,
    });
    next = addMessage(next, {
      author: "ai",
      text: "Мирное урегулирование не дало результата. На основании собранных сведений можно подготовить досудебную претензию: факт покупки подтверждён, требование определено, известно о предыдущем обращении. Ни один вариант не гарантирует результат.",
      timestamp: ctx.timestamp,
      tone: "info",
    });
    next = addEvent(next, {
      kind: "recommendation_given",
      title: "Предложены следующие варианты действий",
      description: "Мирное урегулирование не дало результата, доступна подготовка претензии или обращение к юристу.",
      date: ctx.displayToday,
      timestamp: ctx.timestamp,
      initiator: "ai",
      sourceLabel: "Рекомендация AI",
    });
    next = {
      ...next,
      stage: "ANALYSIS",
      expectedEvent: {
        id: nextId("ee"),
        title: "Выбрать следующий шаг",
        description: "Доступны подготовка претензии, обращение к юристу или закрытие дела.",
        responsible: "user",
      },
    };

    return {
      caseItem: next,
      notice: {
        tone: "attention",
        title: "Результат учтён",
        message: "Мирное урегулирование не дало результата. AI предлагает следующие варианты действий.",
      },
    };
  },

  CHOOSE_CLAIM: (caseItem, _payload, ctx) => ({
    caseItem: addEvent(
      {
        ...caseItem,
        stage: "CLAIM_PREPARATION",
        flags: [],
        expectedEvent: {
          id: nextId("ee"),
          title: "Проверить данные и сформировать претензию",
          description: "Перед подготовкой документа система проверит необходимые сведения.",
          responsible: "user",
          actionId: "START_CLAIM",
        },
      },
      {
        kind: "action_selected",
        title: "Выбрана подготовка досудебной претензии",
        date: ctx.displayToday,
        timestamp: ctx.timestamp,
        initiator: "user",
        sourceLabel: "Рекомендация AI",
      },
    ),
    notice: {
      tone: "progress",
      title: "Проверяем данные",
      message: "Перед подготовкой документа система покажет, всё ли необходимое есть.",
    },
  }),

  CHOOSE_LAWYER: (caseItem, _payload, ctx) => transferToLawyer(caseItem, ctx, {
    title: "Выбрано обращение к юристу",
    kind: "action_selected",
  }),

  START_CLAIM: (caseItem, _payload, ctx) => {
    const values = documentValuesFor(caseItem, {
      user_name: "Соколова Ирина",
      generated_date: ctx.displayToday,
    });
    let next = attachDocumentTemplate({ ...caseItem, stage: "CLAIM_PREPARATION" }, "claim", values);
    next = {
      ...next,
      stage: "CLAIM_APPROVAL",
      flags: ["WAITING_USER"],
      expectedEvent: {
        id: nextId("ee"),
        title: "Проверить и подтвердить проект претензии",
        description:
          "Документ является проектом и ещё не отправлен. Проверьте адресата, содержание и приложения.",
        responsible: "user",
        actionId: "CONFIRM_CLAIM",
      },
    };
    next = addEvent(next, {
      kind: "document_generated",
      title: "Подготовлена претензия",
      description: "Сформирован проект претензии на основе фактов дела.",
      date: ctx.displayToday,
      timestamp: ctx.timestamp,
      initiator: "ai",
      sourceLabel: "Претензия.docx",
      documentRefs: [docId(caseItem.id, "claim")],
    });
    next = addMessage(next, {
      author: "ai",
      text: "Проект претензии сформирован на основе фактов дела. Рядом с документом указано, какие факты использованы. Документ является проектом и ещё не отправлен.",
      timestamp: ctx.timestamp,
      tone: "info",
      documentRefs: [docId(caseItem.id, "claim")],
    });
    return {
      caseItem: next,
      notice: {
        tone: "progress",
        title: "Проект претензии готов",
        message: "Проверьте документ и подтвердите его содержимое.",
      },
    };
  },

  CONFIRM_CLAIM: (caseItem, _payload, ctx) => {
    let next: Case = {
      ...caseItem,
      stage: "SENT",
      flags: ["WAITING_USER"],
      documents: caseItem.documents.map((doc) =>
        doc.id === docId(caseItem.id, "claim")
          ? {
              ...doc,
              status: "confirmed",
              versions: [
                ...doc.versions,
                { version: doc.version + 1, createdAt: ctx.displayToday, author: "user", note: "Подтверждён пользователем" },
              ],
              version: doc.version + 1,
            }
          : doc,
      ),
      expectedEvent: {
        id: nextId("ee"),
        title: "Выполнить демонстрационную отправку",
        description:
          "Перед отправкой проверьте адресата, содержание документа и приложения. Отправка в прототипе является симуляцией.",
        responsible: "user",
        actionId: "MOCK_SEND",
      },
    };
    next = addEvent(next, {
      kind: "document_confirmed",
      title: "Пользователь подтвердил документ",
      description: "Адресат, содержание и приложения проверены пользователем.",
      date: ctx.displayToday,
      timestamp: ctx.timestamp,
      initiator: "user",
      sourceLabel: "Претензия.docx",
      documentRefs: [docId(caseItem.id, "claim")],
    });
    return {
      caseItem: next,
      notice: {
        tone: "attention",
        title: "Документ подтверждён",
        message: "Статус: готово к отправке. Отправка в прототипе является демонстрацией.",
      },
    };
  },

  MOCK_SEND: (caseItem, _payload, ctx) => {
    const values = documentValuesFor(caseItem, {
      user_name: "Соколова Ирина",
      generated_date: ctx.displayToday,
      sent_date: ctx.displayToday,
    });
    let next = attachDocumentTemplate(caseItem, "send-confirmation", values);
    next = {
      ...next,
      stage: "AWAITING_RESPONSE",
      flags: ["WAITING_COUNTERPARTY"],
      documents: next.documents.map((doc) =>
        doc.id === docId(caseItem.id, "claim") ? { ...doc, status: "sent_demo" } : doc,
      ),
      expectedEvent: {
        id: nextId("ee"),
        title: "Ответ продавца",
        description: "Дело ожидает реакции контрагента на претензию.",
        responsible: "counterparty",
        deadline: "20.10.2026",
        actionId: "REPORT_COUNTERPARTY_RESPONSE",
      },
    };
    next = addEvent(next, {
      kind: "document_sent",
      title: "Документ передан через демонстрационный канал",
      description: "Это демонстрационное событие. Реальной отправки не производилось.",
      date: ctx.displayToday,
      timestamp: ctx.timestamp,
      initiator: "system",
      sourceLabel: "Подтверждение отправки.pdf",
      documentRefs: [docId(caseItem.id, "claim"), docId(caseItem.id, "send-confirmation")],
    });
    next = addMessage(next, {
      author: "ai",
      text: "Документ передан через демонстрационный канал. Это демонстрационное событие: реальной отправки юридически значимого документа не производилось. Дело перешло в ожидание ответа продавца.",
      timestamp: ctx.timestamp,
      tone: "warning",
      documentRefs: [docId(caseItem.id, "send-confirmation")],
    });
    return {
      caseItem: next,
      notice: {
        tone: "attention",
        title: "Документ передан (демо)",
        message: "Реальной отправки не производилось. Дело ожидает ответ продавца.",
      },
    };
  },

  REPORT_COUNTERPARTY_RESPONSE: (caseItem, payload, ctx) => {
    const response = payload.response ?? "reply_received";
    if (response === "deadline_expired") {
      let next: Case = {
        ...caseItem,
        stage: "RESULT_ANALYSIS",
        flags: ["DEADLINE_REVIEW", "WAITING_USER"],
        expectedEvent: {
          id: nextId("ee"),
          title: "Решить, что делать дальше",
          description: "Срок ожидания ответа истёк. Доступны передача юристу или закрытие дела.",
          responsible: "user",
          actionId: "TRANSFER_TO_LAWYER",
        },
      };
      next = addEvent(next, {
        kind: "note",
        title: "Срок ожидания ответа истёк",
        description: "Ответ продавца не получен в согласованный срок.",
        date: ctx.displayToday,
        timestamp: ctx.timestamp,
        initiator: "system",
        sourceLabel: "Ожидаемое событие",
      });
      next = addMessage(next, {
        author: "ai",
        text: "Срок ожидания ответа истёк, ответа продавца нет. Возможные следующие шаги: передать дело юристу для оценки ситуации или закрыть дело. Решение остаётся за вами.",
        timestamp: ctx.timestamp,
        tone: "warning",
      });
      return {
        caseItem: next,
        notice: {
          tone: "attention",
          title: "Срок истёк",
          message: "Ответ контрагента не получен. Дело ожидает вашего решения.",
        },
      };
    }

    const values = documentValuesFor(caseItem, {
      user_name: "Соколова Ирина",
      reply_date: ctx.displayToday,
      sent_date: "09.09.2026",
    });
    let next = attachDocumentTemplate(caseItem, "counterparty-reply", values);
    next = {
      ...next,
      stage: "RESULT_ANALYSIS",
      flags: ["WAITING_USER"],
      expectedEvent: {
        id: nextId("ee"),
        title: "Просмотреть ответ продавца",
        description: "Ответ получен. Укажите, удовлетворяет ли он вас.",
        responsible: "user",
        actionId: "REVIEW_COUNTERPARTY_REPLY",
      },
    };
    next = addEvent(next, {
      kind: "counterparty_responded",
      title: "Получен ответ продавца",
      description: "В удовлетворении требования отказано, продавец предлагает платную диагностику.",
      date: ctx.displayToday,
      timestamp: ctx.timestamp,
      initiator: "counterparty",
      sourceLabel: "Ответ продавца.pdf",
      documentRefs: [docId(caseItem.id, "counterparty-reply")],
    });
    next = addMessage(next, {
      author: "counterparty",
      text: "В ответ на вашу претензию: в удовлетворении требования отказано. Продавец предлагает провести платную диагностику.",
      timestamp: ctx.timestamp,
      tone: "warning",
      documentRefs: [docId(caseItem.id, "counterparty-reply")],
    });
    return {
      caseItem: next,
      notice: {
        tone: "attention",
        title: "Получен ответ продавца",
        message: "Откройте документ с ответом и укажите, удовлетворяет ли он вас.",
      },
    };
  },

  CLAIM_NOT_SATISFIED: (caseItem, _payload, ctx) => {
    let next = setFlags(caseItem, []);
    next = addEvent(next, {
      kind: "result_rejected",
      title: "Ответ не удовлетворяет пользователя",
      description: "Пользователь указал, что предложенный продавцом вариант его не устраивает.",
      date: ctx.displayToday,
      timestamp: ctx.timestamp,
      initiator: "user",
      sourceLabel: "Сообщение пользователя",
    });
    next = addMessage(next, {
      author: "user",
      text: "Ответ не устраивает. Хочу продолжить дело дальше.",
      timestamp: ctx.timestamp,
    });
    next = {
      ...next,
      stage: "RESULT_ANALYSIS",
      expectedEvent: {
        id: nextId("ee"),
        title: "Начать подготовку следующего этапа",
        description: "AI покажет, какие данные ещё нужно получить.",
        responsible: "user",
        actionId: "START_COURT_PREP",
      },
    };
    return {
      caseItem: next,
      notice: {
        tone: "attention",
        title: "Ответ отклонён",
        message: "Дело возвращено к подготовке следующего этапа.",
      },
    };
  },

  START_COURT_PREP: (caseItem, _payload, ctx) => {
    let next: Case = {
      ...caseItem,
      stage: "COURT_PREPARATION",
      flags: [],
      expectedEvent: {
        id: nextId("ee"),
        title: "Передать дело юристу",
        description: "Материалы передаются юристу для профессиональной проверки.",
        responsible: "user",
        actionId: "TRANSFER_TO_LAWYER",
      },
    };
    next = addEvent(next, {
      kind: "court_preparation_started",
      title: "Начата подготовка к судебному продолжению",
      description: "Сформирован демонстрационный список данных, необходимых для следующего этапа.",
      date: ctx.displayToday,
      timestamp: ctx.timestamp,
      initiator: "ai",
      sourceLabel: "Подготовка судебного продолжения",
    });
    next = addMessage(next, {
      author: "ai",
      text: "Для подготовки к дальнейшему рассмотрению необходимо собрать дополнительные сведения. Я составил демонстрационный список: он не является юридически исчерпывающим перечнем.",
      timestamp: ctx.timestamp,
      tone: "info",
    });
    next = addRecommendation(next, {
      title: "Подготовить материалы для судебного продолжения",
      kind: "lawyer",
      description:
        "Часть сведений подтверждена документами, часть — только сообщением пользователя. Профессиональная проверка позволит оценить, достаточно ли материалов.",
      reasons: [
        { text: "Продавец отказал в удовлетворении письменного требования.", documentIds: [docId(caseItem.id, "counterparty-reply")] },
        { text: "Есть сведения, которые требуют проверки юристом." },
      ],
      actionId: "TRANSFER_TO_LAWYER",
      recommended: true,
      createdAt: ctx.timestamp,
      disclaimer: aiDisclaimer,
    });
    return {
      caseItem: next,
      notice: {
        tone: "progress",
        title: "Начата подготовка следующего этапа",
        message: "Проверьте список данных, которых ещё не хватает, и передайте дело юристу.",
      },
    };
  },

  TRANSFER_TO_LAWYER: (caseItem, _payload, ctx) =>
    transferToLawyer(caseItem, ctx, {
      title: "Дело передано юристу",
      kind: "transferred_to_lawyer",
      description:
        "Причина передачи: требуется профессиональная проверка сведений и оценка дальнейших действий.",
    }),

  SEND_MOCK_CONTRADICTION_CLARIFICATION: (caseItem, payload, ctx) => {
    const choice = payload.value ?? "__variant_user";
    const comment = payload.comment?.trim();
    const fact = caseItem.facts.find((f) => f.key === "purchase_date");
    const variants = fact?.conflict?.variants ?? [];
    const chosen = variants.find((v) =>
      choice === "__variant_user"
        ? v.source.kind === "user_message"
        : v.source.kind === "document_page",
    );
    const resolvedValue = chosen?.value ?? fact?.value ?? "не определено";
    const isDocumentValue = chosen?.source.kind === "document_page";

    let next = updateFact(caseItem, "purchase_date", {
      value: resolvedValue,
      state: isDocumentValue ? "CONFIRMED_BY_DOCUMENT" : "CONFIRMED_BY_USER",
      sources: chosen ? [chosen.source] : [],
      requiresClarification: false,
      conflict: undefined,
      updatedAt: ctx.displayToday,
    });
    next = { ...next, flags: next.flags.filter((f) => f !== "CONFLICT_DETECTED" && f !== "NEEDS_CLARIFICATION") };
    next = addEvent(next, {
      kind: "fact_updated",
      title: "Противоречие устранено пользователем",
      description: `Дата покупки уточнена: ${resolvedValue}. Выбор сделал пользователь, система не определяла значение самостоятельно.${
        comment ? ` Комментарий: ${comment}` : ""
      }`,
      date: ctx.displayToday,
      timestamp: ctx.timestamp,
      initiator: "user",
      sourceLabel: chosen?.source.label ?? "Сообщение пользователя",
      factRefs: fact ? [fact.id] : [],
    });
    next = addMessage(next, {
      author: "user",
      text: comment
        ? `${resolvedValue}. ${comment}`
        : `Уточняю дату покупки: ${resolvedValue}.`,
      timestamp: ctx.timestamp,
      factRefs: fact ? [fact.id] : [],
    });
    next = addMessage(next, {
      author: "ai",
      text: "Противоречие устранено: факт зафиксирован с указанием источника, который вы выбрали. Дальше можно продолжать работу по делу — например, передать его юристу для проверки.",
      timestamp: ctx.timestamp,
      tone: "success",
      factRefs: fact ? [fact.id] : [],
    });
    next = {
      ...next,
      expectedEvent: {
        id: nextId("ee"),
        title: "Выбрать следующий шаг",
        description: "Доступны передача юристу или закрытие дела.",
        responsible: "user",
        actionId: "TRANSFER_TO_LAWYER",
      },
    };
    return {
      caseItem: next,
      notice: {
        tone: "success",
        title: "Противоречие устранено",
        message: "Дата покупки зафиксирована с указанием выбранного вами источника.",
      },
    };
  },

  SEND_LAWYER_MESSAGE: (caseItem, payload, ctx) => {
    const text = payload.text?.trim() ?? "";
    let next = addMessage(caseItem, {
      author: "lawyer",
      text,
      timestamp: ctx.timestamp,
      tone: "question",
    });
    next = addEvent(next, {
      kind: "lawyer_message",
      title: "Юрист отправил сообщение пользователю",
      description: text,
      date: ctx.displayToday,
      timestamp: ctx.timestamp,
      initiator: "lawyer",
      sourceLabel: "Сообщение юриста",
    });
    next = {
      ...next,
      flags: next.flags.includes("WAITING_USER") ? next.flags : [...next.flags, "WAITING_USER"],
      expectedEvent: {
        id: nextId("ee"),
        title: "Ответить юристу",
        description: "Юрист ожидает ответ пользователя.",
        responsible: "user",
        actionId: "ANSWER_LAWYER",
      },
    };
    return {
      caseItem: next,
      notice: {
        tone: "attention",
        title: "Сообщение отправлено",
        message: "Пользователь увидит сообщение в карточке дела и сможет ответить.",
      },
    };
  },

  ANSWER_LAWYER: (caseItem, payload, ctx) => {
    const text = payload.answer?.trim() ?? "";
    const targetFactId = payload.target;
    const targetFact = caseItem.facts.find((f) => f.id === targetFactId);
    let next = addMessage(caseItem, {
      author: "user",
      text,
      timestamp: ctx.timestamp,
      factRefs: targetFact ? [targetFact.id] : [],
    });
    if (targetFact) {
      next = updateFact(next, targetFact.key, {
        value: text,
        state: "CONFIRMED_BY_USER",
        sources: [
          {
            id: `${caseItem.id}:src:lawyer-answer:${nextId("src")}`,
            kind: "lawyer_message",
            label: "Ответ пользователя юристу",
          },
        ],
        requiresClarification: false,
        updatedAt: ctx.displayToday,
      });
      next = addEvent(next, {
        kind: "fact_updated",
        title: `Пользователь уточнил сведения по запросу юриста`,
        description: `Значение факта «${targetFact.title}» обновлено по ответу пользователя.`,
        date: ctx.displayToday,
        timestamp: ctx.timestamp,
        initiator: "user",
        sourceLabel: "Сообщение пользователя",
        factRefs: [targetFact.id],
      });
    } else {
      next = addEvent(next, {
        kind: "user_message",
        title: "Пользователь ответил юристу",
        description: text,
        date: ctx.displayToday,
        timestamp: ctx.timestamp,
        initiator: "user",
        sourceLabel: "Сообщение пользователя",
      });
    }
    return {
      caseItem: next,
      notice: {
        tone: "success",
        title: "Ответ отправлен",
        message: targetFact ? "Факт обновлён пользователем." : "Ответ добавлен в переписку по делу.",
      },
    };
  },

  APPLY_LAWYER_DECISION: (caseItem, payload, ctx) => applyLawyerDecision(caseItem, payload, ctx),

  CLOSE_CASE: (caseItem, _payload, ctx) => {
    let next: Case = {
      ...caseItem,
      stage: "CLOSED",
      flags: [],
      expectedEvent: undefined,
      queueStatus: caseItem.queueStatus ? "resolved" : undefined,
      outcome: {
        result: "closed",
        reason: "user_closed",
        title: "Сопровождение прекращено",
        comment: "Пользователь прекратил работу по делу.",
        closedAt: ctx.today,
      },
    };
    next = addEvent(next, {
      kind: "case_closed",
      title: "Дело закрыто пользователем",
      description: "Причина: пользователь прекратил работу. История дела сохранена.",
      date: ctx.displayToday,
      timestamp: ctx.timestamp,
      initiator: "user",
      sourceLabel: "Итог дела",
    });
    return {
      caseItem: next,
      notice: {
        tone: "neutral",
        title: "Дело закрыто",
        message: "Сопровождение прекращено. История и материалы дела сохранены.",
      },
    };
  },
};

function resultLabel(result: string): string {
  switch (result) {
    case "seller_agreed":
      return "Продавец согласился решить проблему.";
    case "seller_refused":
      return "Продавец отказался решать вопрос и потребовал платную диагностику.";
    case "no_response":
      return "Ответ продавца не получен.";
    case "no_agreement":
      return "Договориться не удалось.";
    default:
      return "Пользователь хочет продолжить дело другим способом.";
  }
}

function resultDescription(result: string): string {
  switch (result) {
    case "seller_agreed":
      return "Продавец согласился решить проблему.";
    case "seller_refused":
      return "Продавец отказался решать вопрос, сказал, что сначала нужна платная проверка.";
    case "no_response":
      return "Ответа от продавца не получил.";
    case "no_agreement":
      return "Договориться с продавцом не удалось.";
    default:
      return "Хочу продолжить дело другим способом.";
  }
}

function transferToLawyer(
  caseItem: Case,
  ctx: Ctx,
  event: Pick<CaseEvent, "kind" | "title" | "description">,
): ActionOutcome {
  const alreadyTransferred = caseItem.stage === "LAWYER_REVIEW" && Boolean(caseItem.assignedLawyerId);
  let next: Case = {
    ...caseItem,
    stage: "LAWYER_REVIEW",
    flags: ["NEEDS_LAWYER"],
    assignedLawyerId: "l-001",
    transferReason: alreadyTransferred
      ? caseItem.transferReason
      : "Требуется профессиональная проверка сведений и оценка дальнейших действий",
    transferredAt: alreadyTransferred ? caseItem.transferredAt : ctx.displayToday,
    queueStatus: caseItem.queueStatus ?? "new",
    expectedEvent: {
      id: nextId("ee"),
      title: "Проверить материалы дела",
      description: "Юрист изучает факты, источники и документы.",
      responsible: "lawyer",
    },
  };
  if (!alreadyTransferred) {
    next = addEvent(next, {
      ...event,
      date: ctx.displayToday,
      timestamp: ctx.timestamp,
      initiator: "user",
      sourceLabel: "Передача юристу",
    });
    next = addMessage(next, {
      author: "ai",
      text: "Дело передано юристу. В кабинете юриста материалы будут проверены; если появятся вопросы или противоречия, юрист напишет вам в карточке дела.",
      timestamp: ctx.timestamp,
      tone: "info",
    });
  }
  return {
    caseItem: next,
    notice: {
      tone: "progress",
      title: "Дело передано юристу",
      message: "Материалы доступны юристу в режиме «Кабинет юриста».",
    },
  };
}

function applyLawyerDecision(caseItem: Case, payload: ActionPayload, ctx: Ctx): ActionOutcome {
  const type = payload.type ?? "request_data";
  const comment = payload.comment?.trim() ?? "";
  const requestedItems = type === "request_data" ? collectRequestedItems(caseItem) : undefined;
  const decision = {
    id: nextId("ld"),
    caseId: caseItem.id,
    type: type as LawyerDecisionType,
    title: decisionTitle(type),
    comment,
    lawyerName: "Анна Верещагина",
    createdAt: ctx.timestamp,
    requestedItems,
  };

  let next: Case = {
    ...caseItem,
    lawyerDecisions: [...caseItem.lawyerDecisions, decision],
  };
  next = addEvent(next, {
    kind: "lawyer_decision",
    title: `Юрист: ${decision.title.toLowerCase()}`,
    description: comment,
    date: ctx.displayToday,
    timestamp: ctx.timestamp,
    initiator: "lawyer",
    sourceLabel: "Решение юриста",
  });
  next = addMessage(next, {
    author: "lawyer",
    text: comment ? `${decision.title}. ${comment}` : decision.title,
    timestamp: ctx.timestamp,
    tone: "question",
  });

  switch (type) {
    case "approve_continuation": {
      next = {
        ...next,
        flags: [],
        queueStatus: "resolved",
        expectedEvent: {
          id: nextId("ee"),
          title: "Продолжить работу по делу",
          description: "Юрист одобрил дальнейшее продолжение.",
          responsible: "user",
        },
      };
      break;
    }
    case "request_data": {
      next = {
        ...next,
        flags: ["NEEDS_LAWYER", "WAITING_USER"],
        queueStatus: "needs_attention",
        expectedEvent: {
          id: nextId("ee"),
          title: "Предоставить запрошенные данные",
          description: "Юрист запросил дополнительную информацию.",
          responsible: "user",
          actionId: "ANSWER_LAWYER",
        },
      };
      break;
    }
    case "return_to_user": {
      next = {
        ...next,
        stage: "COURT_PREPARATION",
        flags: ["WAITING_USER"],
        expectedEvent: {
          id: nextId("ee"),
          title: "Уточнить сведения по запросу юриста",
          description: "Дело возвращено пользователю на уточнение.",
          responsible: "user",
          actionId: "ANSWER_LAWYER",
        },
      };
      break;
    }
    case "close_case": {
      next = {
        ...next,
        stage: "CLOSED",
        flags: [],
        queueStatus: "resolved",
        expectedEvent: undefined,
        outcome: {
          result: "closed",
          reason: "lawyer_closed",
          title: "Дело закрыто юристом",
          comment,
          closedAt: ctx.today,
        },
      };
      next = addEvent(next, {
        kind: "case_closed",
        title: "Дело закрыто юристом",
        description: comment || "Решение юриста о закрытии дела.",
        date: ctx.displayToday,
        timestamp: ctx.timestamp,
        initiator: "lawyer",
        sourceLabel: "Решение юриста",
      });
      break;
    }
    default: {
      next = { ...next, expectedEvent: undefined };
    }
  }

  return {
    caseItem: next,
    notice: {
      tone: "progress",
      title: "Решение зафиксировано",
      message: "Решение юриста сохранено отдельно от предложения AI и отражено в истории дела.",
    },
  };
}

/**
 * Сведения, которые юрист запрашивает у пользователя: выявленные проблемы,
 * а если их нет — факты, требующие проверки.
 */
function collectRequestedItems(caseItem: Case): LawyerDecision["requestedItems"] {
  const fromIssues = (caseItem.issues ?? [])
    .filter((issue) => issue.severity === "warning" && issue.factId)
    .map((issue, index) => ({ id: `ri-issue-${index}`, label: issue.text, factId: issue.factId }));

  if (fromIssues.length > 0) return fromIssues;

  const fromFacts = caseItem.facts
    .filter((fact) => fact.state === "REQUIRES_LAWYER" || fact.requiresClarification)
    .map((fact) => ({
      id: `ri-fact-${fact.id}`,
      label: `Уточнить факт «${fact.title}»`,
      factId: fact.id,
    }));

  if (fromFacts.length > 0) return fromFacts;

  return [
    {
      id: "ri-general",
      label: "Подтвердить сведения, по которым нет подтверждающего документа",
      factId: caseItem.facts.find((fact) => fact.state === "CONFIRMED_BY_USER")?.id,
    },
  ];
}

function decisionTitle(type: string): string {
  switch (type) {
    case "approve_continuation":
      return "Одобрено дальнейшее продолжение";
    case "request_data":
      return "Запрошены дополнительные данные";
    case "return_to_user":
      return "Дело возвращено пользователю на уточнение";
    case "close_case":
      return "Дело закрыто";
    default:
      return "Зафиксировано другое действие";
  }
}

/**
 * Применяет действие к делу. Замена mock-реализации на реальный API потребует
 * только замены этого сервиса (docs/prototype.md §17).
 */
export function applyAction(
  caseItem: Case,
  actionId: ActionId,
  payload: ActionPayload,
  today: string,
): ActionOutcome {
  const handler = handlers[actionId];
  if (!handler) {
    return {
      caseItem,
      notice: {
        tone: "neutral",
        title: actionCatalogueLabel(actionId),
        message: "Действие не изменяет состояние дела.",
      },
    };
  }
  const outcome = handler(caseItem, payload, makeCtx(today));
  return { ...outcome, caseItem: syncFactFlags(outcome.caseItem) };
}

function actionCatalogueLabel(id: ActionId): string {
  return getAction(id).label;
}

/** Прикрепляет mock-документ к делу по ключу шаблона. */
export function attachDocument(caseItem: Case, key: string, extraValues: Record<string, string> = {}): Case {
  return attachDocumentTemplate(caseItem, key, extraValues);
}

/** Рекомендации, относящиеся к текущему шагу дела (самые новые). */
export function getCurrentRecommendations(caseItem: Case): Recommendation[] {
  if (caseItem.recommendations.length === 0) return [];
  const latest = caseItem.recommendations.reduce<string>(
    (max, rec) => (rec.createdAt > max ? rec.createdAt : max),
    caseItem.recommendations[0].createdAt,
  );
  return caseItem.recommendations.filter((rec) => rec.createdAt === latest);
}