import type {
  ActionVariant,
  CaseFlag,
  CaseOutcome,
  CaseStage,
  DocumentKind,
  DocumentStatus,
  FactSourceKind,
  FactState,
  LawyerDecisionType,
  OutcomeReason,
  Participant,
  TaskStatus,
} from "./domain";

/** Семантический тон состояния: используется вместе с текстом, а не вместо него (§24). */
export type Tone = "neutral" | "progress" | "attention" | "danger" | "success" | "ai";

export const stageLabels: Record<CaseStage, string> = {
  INTAKE: "Первичное обращение",
  INFO_COLLECTION: "Сбор информации",
  ANALYSIS: "Анализ ситуации",
  SOLUTION_CHOICE: "Выбор способа решения",
  ACTION_EXECUTION: "Выполнение действия",
  AWAITING_RESULT: "Ожидание результата",
  CLAIM_PREPARATION: "Подготовка претензии",
  CLAIM_APPROVAL: "Согласование документа",
  SENT: "Отправлено",
  AWAITING_RESPONSE: "Ожидание ответа",
  RESULT_ANALYSIS: "Анализ результата",
  COURT_PREPARATION: "Подготовка судебного продолжения",
  LAWYER_REVIEW: "Проверка юристом",
  CLOSED: "Завершено",
};

export const stageTone: Record<CaseStage, Tone> = {
  INTAKE: "neutral",
  INFO_COLLECTION: "progress",
  ANALYSIS: "progress",
  SOLUTION_CHOICE: "progress",
  ACTION_EXECUTION: "progress",
  AWAITING_RESULT: "attention",
  CLAIM_PREPARATION: "progress",
  CLAIM_APPROVAL: "attention",
  SENT: "progress",
  AWAITING_RESPONSE: "attention",
  RESULT_ANALYSIS: "attention",
  COURT_PREPARATION: "progress",
  LAWYER_REVIEW: "attention",
  CLOSED: "success",
};

export const stageShortLabels: Record<CaseStage, string> = {
  INTAKE: "Обращение",
  INFO_COLLECTION: "Сбор данных",
  ANALYSIS: "Анализ",
  SOLUTION_CHOICE: "Выбор",
  ACTION_EXECUTION: "Действие",
  AWAITING_RESULT: "Ожидание",
  CLAIM_PREPARATION: "Претензия",
  CLAIM_APPROVAL: "Согласование",
  SENT: "Отправлено",
  AWAITING_RESPONSE: "Ожидание",
  RESULT_ANALYSIS: "Результат",
  COURT_PREPARATION: "Судебная подготовка",
  LAWYER_REVIEW: "Проверка",
  CLOSED: "Завершено",
};

/**
 * Упрощённая шкала прогресса дела: объединяет этапы одного смыслового шага,
 * чтобы пользователь не терялся в двенадцати состояниях.
 */
export const stageProgressOrder: CaseStage[] = [
  "INTAKE",
  "INFO_COLLECTION",
  "ANALYSIS",
  "SOLUTION_CHOICE",
  "AWAITING_RESULT",
  "CLAIM_PREPARATION",
  "CLAIM_APPROVAL",
  "SENT",
  "AWAITING_RESPONSE",
  "RESULT_ANALYSIS",
  "COURT_PREPARATION",
  "LAWYER_REVIEW",
  "CLOSED",
];

export const stageProgressLabels: Record<CaseStage, string> = {
  INTAKE: "Обращение",
  INFO_COLLECTION: "Сбор данных",
  ANALYSIS: "Анализ",
  SOLUTION_CHOICE: "Выбор способа",
  ACTION_EXECUTION: "Выполнение",
  AWAITING_RESULT: "Ожидание результата",
  CLAIM_PREPARATION: "Подготовка претензии",
  CLAIM_APPROVAL: "Согласование",
  SENT: "Отправлено",
  AWAITING_RESPONSE: "Ожидание ответа",
  RESULT_ANALYSIS: "Анализ результата",
  COURT_PREPARATION: "Судебная подготовка",
  LAWYER_REVIEW: "Проверка юристом",
  CLOSED: "Завершено",
};

export const flagLabels: Record<CaseFlag, string> = {
  NEEDS_LAWYER: "Требуется юрист",
  WAITING_USER: "Ожидаем пользователя",
  WAITING_COUNTERPARTY: "Ожидаем контрагента",
  NEEDS_CLARIFICATION: "Требуется уточнение",
  CONFLICT_DETECTED: "Обнаружено противоречие",
  SEND_ERROR: "Ошибка отправки",
  DEADLINE_REVIEW: "Срок требует проверки",
};

export const flagTone: Record<CaseFlag, Tone> = {
  NEEDS_LAWYER: "ai",
  WAITING_USER: "attention",
  WAITING_COUNTERPARTY: "attention",
  NEEDS_CLARIFICATION: "attention",
  CONFLICT_DETECTED: "danger",
  SEND_ERROR: "danger",
  DEADLINE_REVIEW: "attention",
};

/** Короткие текстовые маркеры — состояние не передаётся только цветом. */
export const flagMarkers: Record<CaseFlag, string> = {
  NEEDS_LAWYER: "Юрист",
  WAITING_USER: "⧗ Пользователь",
  WAITING_COUNTERPARTY: "⧗ Контрагент",
  NEEDS_CLARIFICATION: "? Уточнение",
  CONFLICT_DETECTED: "⚠ Противоречие",
  SEND_ERROR: "✕ Ошибка",
  DEADLINE_REVIEW: "⧗ Срок",
};

export const factStateLabels: Record<FactState, string> = {
  UNCONFIRMED: "Не подтверждено",
  CONFIRMED_BY_USER: "Подтверждено пользователем",
  CONFIRMED_BY_DOCUMENT: "Подтверждено документом",
  CONFLICT: "Противоречие",
  REQUIRES_LAWYER: "Требуется проверка юриста",
};

export const factStateTone: Record<FactState, Tone> = {
  UNCONFIRMED: "neutral",
  CONFIRMED_BY_USER: "success",
  CONFIRMED_BY_DOCUMENT: "success",
  CONFLICT: "danger",
  REQUIRES_LAWYER: "ai",
};

export const factStateMarkers: Record<FactState, string> = {
  UNCONFIRMED: "○",
  CONFIRMED_BY_USER: "✓",
  CONFIRMED_BY_DOCUMENT: "✓",
  CONFLICT: "⚠",
  REQUIRES_LAWYER: "⚖",
};

export const factSourceKindLabels: Record<FactSourceKind, string> = {
  user_message: "Сообщение пользователя",
  document: "Документ",
  document_page: "Страница документа",
  lawyer_message: "Сообщение юриста",
  counterparty: "Документ контрагента",
  ai_analysis: "Анализ AI",
};

export const documentKindLabels: Record<DocumentKind, string> = {
  receipt: "Чек",
  photo: "Фотография",
  chat_log: "Переписка",
  claim: "Претензия",
  confirmation: "Подтверждение отправки",
  counterparty_reply: "Ответ контрагента",
  other: "Документ",
};

export const documentStatusLabels: Record<DocumentStatus, string> = {
  draft: "Проект",
  confirmed: "Подтверждён",
  sent_demo: "Передан (демо)",
  received: "Получен",
  archived: "В архиве",
};

export const documentStatusTone: Record<DocumentStatus, Tone> = {
  draft: "attention",
  confirmed: "success",
  sent_demo: "progress",
  received: "progress",
  archived: "neutral",
};

export const participantLabels: Record<Participant, string> = {
  user: "Пользователь",
  ai: "AI",
  lawyer: "Юрист",
  counterparty: "Контрагент",
  system: "Система",
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  open: "Ожидается",
  done: "Выполнено",
  cancelled: "Отменено",
};

export const taskStatusTone: Record<TaskStatus, Tone> = {
  open: "attention",
  done: "success",
  cancelled: "neutral",
};

export const lawyerDecisionLabels: Record<LawyerDecisionType, string> = {
  approve_continuation: "Одобрить дальнейшее продолжение",
  request_data: "Запросить дополнительные данные",
  return_to_user: "Вернуть пользователю на уточнение",
  close_case: "Закрыть дело",
  other: "Другое действие",
};

export const outcomeReasonLabels: Record<OutcomeReason, string> = {
  resolved: "Проблема решена",
  user_closed: "Пользователь прекратил работу",
  lawyer_closed: "Дело закрыто юристом",
  counterparty_declined: "Контрагент отказал",
  deadline_expired: "Срок истёк",
};

export const actionVariantTone: Record<ActionVariant, Tone> = {
  primary: "progress",
  secondary: "neutral",
  danger: "danger",
};

export const actorLabels: Record<"user" | "ai" | "lawyer" | "counterparty" | "system", string> = {
  user: "Пользователь",
  ai: "AI",
  lawyer: "Юрист",
  counterparty: "Контрагент",
  system: "Система",
};

export const outcomeResultLabels: Record<CaseOutcome["result"], string> = {
  solved: "Решено",
  not_solved: "Не решено",
  closed: "Прекращено",
};

/** Единая формулировка ограничения ответственности AI для рекомендаций. */
export const aiDisclaimer =
  "Демонстрационная рекомендация AI. Возможный вариант действий, а не юридическое заключение. Результат не гарантирован.";

export const mockNotice =
  "Демонстрационный режим. Все данные синтетические, настоящей авторизации и отправки документов нет.";
