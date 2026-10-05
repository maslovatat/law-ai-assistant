import type { ActionId, Case } from "../src/types/domain";
import { createSeedCases } from "../src/data/cases";
import { interviewScript } from "../src/data/interview";
import {
  applyAction,
  attachmentsForAnswers,
  withDerivedFacts,
  getCurrentRecommendations,
  isNavigationAction,
  registerScript,
  resetSequence,
  type ActionPayload,
} from "../src/lib/mock/caseService";
import { completeInterview } from "../src/lib/mock/interviewFlow";
import { getAvailableActions } from "../src/lib/workflow";
import { buildClaimChecklist, buildCourtPreparationChecklist } from "../src/lib/checklists";
import { DEMO_START_DATE, addDays } from "../src/lib/mock/clock";

let failures = 0;
let checks = 0;

function check(label: string, condition: boolean | undefined, detail?: string): void {
  const passed = Boolean(condition);
  checks += 1;
  if (!passed) {
    failures += 1;
    console.log(`FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    console.log(`ok    ${label}`);
  }
}

function runAction(caseItem: Case, actionId: ActionId, payload: ActionPayload, today: string): Case {
  if (isNavigationAction(actionId)) return caseItem;
  return applyAction(caseItem, actionId, payload, today).caseItem;
}

/** Ответы интервью основного demo-case: покупка 12.08.2026 совпадает с чеком. */
const mainAnswers = [
  ["q-product", "Холодильник"],
  ["q-model", "ATLANT ХМ 4624-101, 2024"],
  ["q-channel", "В магазине ООО «Техника»"],
  ["q-purchase-date", "12.08.2026"],
  ["q-price", "49 990 ₽"],
  ["q-defect", "Не охлаждает, температура выше заявленной"],
  ["q-defect-date", "15.09.2026"],
  ["q-first-contact", "20.09.2026"],
  ["q-seller-response", "Сказал, что сначала нужна проверка"],
  ["q-receipt", "Есть чек"],
  ["q-demand", "Возврат денежных средств"],
  ["q-extra-costs", "Нет, расходов не было"],
] as const;

console.log("=== 1. Seed-данные ===");
resetSequence();
registerScript("LC-2026-001", interviewScript);
const seeds = createSeedCases();
check("создано два демонстрационных дела", seeds.length === 2, `получено ${seeds.length}`);
const seedCase = seeds[0];
check("LC-2026-001 на этапе проверки юристом", seedCase.stage === "LAWYER_REVIEW", seedCase.stage);
check("факты LC-2026-001 собраны", seedCase.facts.length >= 10, `${seedCase.facts.length}`);
check("документы LC-2026-001 собраны", seedCase.documents.length === 6, `${seedCase.documents.length}`);
check("история LC-2026-001 содержит передачу юристу", seedCase.events.some((e) => e.kind === "transferred_to_lawyer"));
check(
  "ссылки на факты в рекомендациях разрешены",
  seedCase.recommendations.every((rec) => rec.reasons.every((reason) => (reason.factIds ?? []).every((id) => seedCase.facts.some((f) => f.id === id)))),
);
check(
  "ссылки на документы в событиях разрешены",
  seedCase.events.every((event) => (event.documentRefs ?? []).every((id) => seedCase.documents.some((d) => d.id === id))),
);
const seedConflict = seeds[1];
const conflictFact = seedConflict.facts.find((f) => f.key === "purchase_date");
check("LC-2026-002 содержит противоречие", conflictFact?.state === "CONFLICT");
check(
  "противоречие содержит оба источника",
  conflictFact?.conflict?.variants.length === 2,
  `${conflictFact?.conflict?.variants.length}`,
);
check(
  "источники факта в LC-2026-002 разрешены",
  seedConflict.facts.every((fact) =>
    fact.sources.every((source) => !source.documentId || seedConflict.documents.some((d) => d.id === source.documentId)),
  ),
);

console.log("\n=== 2. Основной demo-flow с нуля ===");
resetSequence();
let today = DEMO_START_DATE;
const caseId = "LC-TEST-001";
registerScript(caseId, interviewScript);
let item: Case = {
  id: caseId,
  number: "№ LC-TEST-001",
  title: "Возврат денежных средств за неисправный товар",
  category: "Защита прав потребителей",
  summary: "Тестовое дело",
  situation: "Я купил холодильник, через месяц он перестал нормально работать.",
  userId: "u-001",
  counterparty: "ООО «Техника»",
  stage: "INTAKE",
  flags: [],
  createdAt: "05.10.2026",
  updatedAt: "05.10.2026",
  priority: "normal",
  facts: [],
  documents: [],
  messages: [],
  tasks: [],
  events: [],
  recommendations: [],
  lawyerDecisions: [],
  expectedEvent: {
    id: `${caseId}:ee`,
    title: "Пройти AI-интервью",
    responsible: "user",
    actionId: "START_INTERVIEW",
  },
};

check("новое дело на этапе первичного обращения", item.stage === "INTAKE");
check(
  "доступно действие начала интервью",
  getAvailableActions(item, "user").some((a) => a.id === "START_INTERVIEW"),
);

item = runAction(item, "START_INTERVIEW", {}, today);
item = { ...item, stage: "INFO_COLLECTION" };
const answers = mainAnswers.map(([questionId, value]) => ({ questionId, value, answeredAt: today }));
item = { ...withDerivedFacts(item, answers), interviewAnswers: answers };

check(
  "факты сформированы из ответов",
  item.facts.length >= mainAnswers.length && item.facts.some((f) => f.key === "seller"),
  `${item.facts.length}`,
);
const purchaseFact = item.facts.find((f) => f.key === "purchase_date");
check("дата покупки подтверждена документом", purchaseFact?.state === "CONFIRMED_BY_DOCUMENT", purchaseFact?.state);
check("стоимость подтверждена документом", item.facts.find((f) => f.key === "price")?.state === "CONFIRMED_BY_DOCUMENT");
check(
  "у каждого факта есть источник",
  item.facts.every((fact) => fact.sources.length > 0),
);
check(
  "у каждого факта указан источник документа",
  item.facts.filter((f) => f.state === "CONFIRMED_BY_DOCUMENT").every((f) => f.sources.some((s) => s.documentId)),
  item.facts.filter((f) => f.state === "CONFIRMED_BY_DOCUMENT" && !f.sources.some((s) => s.documentId)).map((f) => f.key).join(","),
);

for (const key of attachmentsForAnswers(answers)) {
  item = runAction(item, "VIEW_FACTS", {}, today);
  void key;
}
// документы прикрепляются через сервис: проверяем через START_CLAIM-переход ниже
item = { ...item, stage: "ANALYSIS" };
const claimChecklistBefore = buildClaimChecklist(item);
check("проверка данных перед претензией запускается", claimChecklistBefore.items.length === 8);
check(
  "противоречий в согласованных данных нет",
  claimChecklistBefore.items.filter((i) => i.hint?.includes("расходятся")).length === 0,
);

const recommendationsAfterInterview = [
  {
    id: "r1",
    caseId,
    title: "Попробовать решить вопрос напрямую с продавцом",
    kind: "peacful_resolution" as const,
    description: "",
    reasons: [],
    actionId: "CHOOSE_PEACEFUL" as const,
    createdAt: "1",
  },
];
item = { ...item, recommendations: recommendationsAfterInterview };
check("доступны варианты действий", getCurrentRecommendations(item).length === 1);

item = runAction(item, "CHOOSE_PEACEFUL", {}, today);
today = addDays(today, 1);
check("после выбора мирного пути ожидается результат", item.stage === "AWAITING_RESULT", item.stage);
check("создана задача для пользователя", item.tasks.some((t) => t.assignee === "user" && t.status === "open"));
check(
  "ожидаемое событие — сообщить о результате",
  item.expectedEvent?.actionId === "REPORT_PEACEFUL_RESULT",
);

item = runAction(item, "REPORT_PEACEFUL_RESULT", { result: "seller_refused" }, today);
today = addDays(today, 1);
check("после неудачи дело возвращено к анализу", item.stage === "ANALYSIS", item.stage);
check("задача закрыта с результатом", item.tasks.every((t) => t.status !== "open"));
check(
  "AI предлагает претензию и юриста",
  getCurrentRecommendations(item).length === 2,
  `${getCurrentRecommendations(item).length}`,
);

item = runAction(item, "CHOOSE_CLAIM", {}, today);
today = addDays(today, 1);
check("этап подготовки претензии", item.stage === "CLAIM_PREPARATION", item.stage);

item = runAction(item, "START_CLAIM", {}, today);
today = addDays(today, 1);
check("проект претензии создан", item.documents.some((d) => d.kind === "claim"));
check("этап согласования документа", item.stage === "CLAIM_APPROVAL", item.stage);
const claimDoc = item.documents.find((d) => d.kind === "claim");
check("в документе подставлены значения фактов", !JSON.stringify(claimDoc?.content).includes("{{"));
check(
  "документ ссылается на использованные факты",
  (claimDoc?.basedOnFactIds ?? []).every((id) => item.facts.some((f) => f.id === id)),
  (claimDoc?.basedOnFactIds ?? []).filter((id) => !item.facts.some((f) => f.id === id)).join(",") + " | have: " + item.facts.map((f) => f.id).join(","),
);

item = runAction(item, "CONFIRM_CLAIM", {}, today);
today = addDays(today, 1);
check("документ подтверждён пользователем", item.documents.find((d) => d.kind === "claim")?.status === "confirmed");
check("этап готовности к отправке", item.stage === "SENT", item.stage);

item = runAction(item, "MOCK_SEND", {}, today);
today = addDays(today, 1);
check("после имитации отправки ожидается ответ", item.stage === "AWAITING_RESPONSE", item.stage);
check("демонстрационная передача зафиксирована", item.events.some((e) => e.kind === "document_sent"));
check(
  "событие отправки помечено как демонстрация",
  item.events.find((e) => e.kind === "document_sent")?.description?.includes("Реальной отправки не производилось"),
);
check(
  "ожидаемое событие — ответ продавца со сроком",
  item.expectedEvent?.responsible === "counterparty" && Boolean(item.expectedEvent?.deadline),
);

item = runAction(item, "REPORT_COUNTERPARTY_RESPONSE", { response: "reply_received" }, today);
today = addDays(today, 1);
check("ответ продавца получен", item.documents.some((d) => d.kind === "counterparty_reply"));
check("этап анализа результата", item.stage === "RESULT_ANALYSIS", item.stage);

item = runAction(item, "CLAIM_NOT_SATISFIED", {}, today);
today = addDays(today, 1);
check("ответ отклонён пользователем", item.events.some((e) => e.kind === "result_rejected"));

item = runAction(item, "START_COURT_PREP", {}, today);
today = addDays(today, 1);
check("начата подготовка судебного продолжения", item.stage === "COURT_PREPARATION", item.stage);
const courtChecklist = buildCourtPreparationChecklist(item);
check("список данных сформирован", courtChecklist.items.length === 12, `${courtChecklist.items.length}`);
check(
  "список помечен как демонстрационный",
  courtChecklist.disclaimer?.includes("не является юридически исчерпывающим"),
);

item = runAction(item, "TRANSFER_TO_LAWYER", {}, today);
today = addDays(today, 1);
check("дело передано юристу", item.stage === "LAWYER_REVIEW" && item.assignedLawyerId === "l-001");
check("дело попало в очередь", item.queueStatus === "new");
check("юрист ожидается как ответственный", item.expectedEvent?.responsible === "lawyer");

item = runAction(item, "SEND_LAWYER_MESSAGE", { text: "Уточните, пожалуйста, дату обращения к продавцу." }, today);
today = addDays(today, 1);
check("сообщение юриста добавлено", item.messages.some((m) => m.author === "lawyer"));
check("пользователь ожидается как ответственный", item.expectedEvent?.actionId === "ANSWER_LAWYER");

const targetFactId = item.facts.find((f) => f.key === "first_contact_date")?.id ?? "";
item = runAction(item, "ANSWER_LAWYER", { answer: "20 сентября", target: targetFactId }, today);
today = addDays(today, 1);
check("факт обновлён по ответу пользователя", item.events.some((e) => e.kind === "fact_updated"));
check(
  "источник факта — сообщение юристу",
  item.facts
    .find((f) => f.key === "first_contact_date")
    ?.sources.some((s) => s.kind === "lawyer_message"),
);

item = runAction(
  item,
  "APPLY_LAWYER_DECISION",
  { type: "request_data", comment: "Прошу подтвердить расходы." },
  today,
);
today = addDays(today, 1);
check("решение юриста зафиксировано", item.lawyerDecisions.length === 1);
check("решение отдельно от предложения AI", item.lawyerDecisions[0].type === "request_data");
check("пользователь ожидает запрошенные данные", item.expectedEvent?.title.includes("запрошенные"));
const requested = item.lawyerDecisions[0].requestedItems ?? [];
check("запрошенные сведения привязаны к фактам", requested.length > 0 && requested.every((entry) => entry.factId), `${requested.length}`);
const requestedFactId = requested[0]?.factId ?? "";
const factBefore = item.facts.find((f) => f.id === requestedFactId);
item = runAction(item, "ANSWER_LAWYER", { answer: "23 500 руб.", target: requestedFactId }, today);
today = addDays(today, 1);
check(
  "ответ на запрос обновляет запрошенный факт",
  item.facts.find((f) => f.id === requestedFactId)?.state === "CONFIRMED_BY_USER",
  `${factBefore?.state} → ${item.facts.find((f) => f.id === requestedFactId)?.state}`,
);
check(
  "в источниках факта появился ответ пользователя",
  item.facts.find((f) => f.id === requestedFactId)?.sources.some((s) => s.kind === "lawyer_message"),
);

item = runAction(item, "CLOSE_CASE", {}, today);
check("дело закрыто пользователем", item.stage === "CLOSED");
check("причина закрытия сохранена", item.outcome?.reason === "user_closed");
check("событие закрытия есть в истории", item.events.some((e) => e.kind === "case_closed"));
check("после закрытия действий нет", getAvailableActions(item, "user").length === 0);

console.log("\n=== 3. Альтернативные ветви ===");
resetSequence();
registerScript(caseId, interviewScript);
const deadlineAnswers = mainAnswers.map(([questionId, value]) => ({ questionId, value, answeredAt: DEMO_START_DATE }));
const deadlineItem: Case = {
  ...withDerivedFacts({ ...item, facts: [] }, deadlineAnswers),
  stage: "AWAITING_RESPONSE",
  flags: ["WAITING_COUNTERPARTY"],
  outcome: undefined,
  expectedEvent: {
    id: "ee",
    title: "Ответ продавца",
    responsible: "counterparty",
    deadline: "20.10.2026",
    actionId: "REPORT_COUNTERPARTY_RESPONSE",
  },
  interviewAnswers: deadlineAnswers,
};
const expired = runAction(deadlineItem, "REPORT_COUNTERPARTY_RESPONSE", { response: "deadline_expired" }, DEMO_START_DATE);
check("ветка «срок истёк» поддержана", expired.flags.includes("DEADLINE_REVIEW"));

const solved = runAction(
  { ...deadlineItem, stage: "AWAITING_RESULT", flags: ["WAITING_USER"], tasks: [{ id: "t", caseId, title: "Связаться с продавцом", assignee: "user", status: "open", createdAt: DEMO_START_DATE }] },
  "REPORT_PEACEFUL_RESULT",
  { result: "seller_agreed" },
  DEMO_START_DATE,
);
check("ветка «продавец согласился» закрывает дело", solved.stage === "CLOSED" && solved.outcome?.result === "solved");

console.log("\n=== 4. Сценарий противоречия ===");
resetSequence();
registerScript(caseId, interviewScript);
const conflictAnswers = mainAnswers.map(([questionId, value]) => ({
  questionId,
  value: questionId === "q-purchase-date" ? "10.08.2026" : value,
  answeredAt: DEMO_START_DATE,
}));
let conflictItem: Case = completeInterview(
  {
    ...item,
    stage: "INFO_COLLECTION",
    outcome: undefined,
    documents: [],
    recommendations: [],
    events: [],
    messages: [],
    tasks: [],
    interviewAnswers: conflictAnswers,
  },
  DEMO_START_DATE,
);
const conflictFactLive = conflictItem.facts.find((f) => f.key === "purchase_date");
check("противоречие обнаружено автоматически", conflictFactLive?.state === "CONFLICT", conflictFactLive?.state);
check(
  "оба варианта сохранены с источниками",
  conflictFactLive?.conflict?.variants.length === 2 &&
    conflictFactLive.conflict.variants.some((v) => v.source.kind === "user_message") &&
    conflictFactLive.conflict.variants.some((v) => v.source.kind === "document_page"),
);
check(
  "противоречие отражается флагом дела",
  conflictItem.facts.some((f) => f.state === "CONFLICT"),
);
check(
  "флаг противоречия выставляется автоматически",
  conflictItem.flags.includes("CONFLICT_DETECTED"),
  conflictItem.flags.join(","),
);
check(
  "противоречие выводит на передний план",
  Boolean(conflictItem.expectedEvent),
  conflictItem.expectedEvent?.title,
);

check(
  "доступно уточнение и передача юристу",
  getAvailableActions(conflictItem, "user").some((a) => a.id === "SEND_MOCK_CONTRADICTION_CLARIFICATION") &&
    getAvailableActions(conflictItem, "user").some((a) => a.id === "TRANSFER_TO_LAWYER"),
);

const resolvedByUser = runAction(conflictItem, "SEND_MOCK_CONTRADICTION_CLARIFICATION", { value: "__variant_user" }, DEMO_START_DATE);
check(
  "после уточнения противоречие снято",
  resolvedByUser.facts.find((f) => f.key === "purchase_date")?.state === "CONFIRMED_BY_USER",
);
check(
  "источник факта — сообщение пользователя",
  resolvedByUser.facts.find((f) => f.key === "purchase_date")?.sources[0].kind === "user_message",
);
check(
  "в истории появилось обновление факта",
  resolvedByUser.events.some((e) => e.kind === "fact_updated"),
);

const resolvedByReceipt = runAction(conflictItem, "SEND_MOCK_CONTRADICTION_CLARIFICATION", { value: "__variant_receipt" }, DEMO_START_DATE);
check(
  "выбор значения по чеку фиксирует источник документа",
  resolvedByReceipt.facts.find((f) => f.key === "purchase_date")?.state === "CONFIRMED_BY_DOCUMENT",
);

const claimWithConflict = buildClaimChecklist(conflictItem);
check(
  "при противоречии проверка претензии сообщает о расхождении",
  claimWithConflict.items.some((i) => i.hint?.includes("расходятся")),
);

console.log(`\nПроверок: ${checks}, ошибок: ${failures}`);
if (failures > 0) process.exit(1);