export type Role = "user" | "lawyer";

export type Participant = "user" | "ai" | "lawyer" | "counterparty" | "system";

/**
 * Основной этап дела (docs/prototype.md §26).
 * Дополнительные признаки (флаги) не заменяют этап, а сопровождают его.
 */
export type CaseStage =
  | "INTAKE"
  | "INFO_COLLECTION"
  | "ANALYSIS"
  | "SOLUTION_CHOICE"
  | "ACTION_EXECUTION"
  | "AWAITING_RESULT"
  | "CLAIM_PREPARATION"
  | "CLAIM_APPROVAL"
  | "SENT"
  | "AWAITING_RESPONSE"
  | "RESULT_ANALYSIS"
  | "COURT_PREPARATION"
  | "LAWYER_REVIEW"
  | "CLOSED";

/** Дополнительные признаки состояния (docs/prototype.md §26). */
export type CaseFlag =
  | "NEEDS_LAWYER"
  | "WAITING_USER"
  | "WAITING_COUNTERPARTY"
  | "NEEDS_CLARIFICATION"
  | "CONFLICT_DETECTED"
  | "SEND_ERROR"
  | "DEADLINE_REVIEW";

export type FactState =
  | "UNCONFIRMED"
  | "CONFIRMED_BY_USER"
  | "CONFIRMED_BY_DOCUMENT"
  | "CONFLICT"
  | "REQUIRES_LAWYER";

export type FactSourceKind = "user_message" | "document" | "document_page" | "lawyer_message" | "counterparty" | "ai_analysis";

export type DocumentKind = "receipt" | "photo" | "chat_log" | "claim" | "confirmation" | "counterparty_reply" | "other";

export type DocumentStatus = "draft" | "confirmed" | "sent_demo" | "received" | "archived";

export type Actor = "user" | "ai" | "lawyer" | "counterparty" | "system";

export type FactKey =
  | "product"
  | "seller"
  | "purchase_date"
  | "price"
  | "defect_description"
  | "defect_found_date"
  | "purchase_channel"
  | "first_contact_date"
  | "seller_response"
  | "user_demand"
  | "receipt_available"
  | "user_name"
  | "user_contact"
  | "extra_costs"
  | "device_model"
  | "warranty_period";

/** Источник факта — отдельная сущность, не часть самого факта (docs/prototype.md §9). */
export interface FactSource {
  id: string;
  kind: FactSourceKind;
  label: string;
  documentId?: string;
  page?: number;
  messageId?: string;
}

export interface CaseFact {
  id: string;
  caseId: string;
  key: FactKey;
  title: string;
  value: string;
  state: FactState;
  /** Несколько источников, если одно значение подтверждено несколькими документами. */
  sources: FactSource[];
  /** Альтернативные значения при конфликте. AI не выбирает значение самостоятельно. */
  conflict?: {
    detectedAt: string;
    variants: FactVariant[];
  };
  updatedAt: string;
  /** Требуется уточнение у пользователя или юриста. */
  requiresClarification?: boolean;
}

export interface FactVariant {
  value: string;
  source: FactSource;
}

export interface DocumentVersion {
  version: number;
  createdAt: string;
  author: Actor;
  note: string;
}

export interface CaseDocument {
  id: string;
  caseId: string;
  name: string;
  kind: DocumentKind;
  status: DocumentStatus;
  version: number;
  createdAt: string;
  origin: "user_upload" | "ai_generated" | "counterparty" | "system";
  pageCount?: number;
  versions: DocumentVersion[];
  /** Предварительно подготовленный текст для mock-просмотрщика. */
  content: DocumentContent;
  /** Факты, использованные при подготовке документа. */
  basedOnFactIds?: string[];
}

export interface DocumentContent {
  title: string;
  blocks: DocumentBlock[];
  attachments?: string[];
}

export type DocumentBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "kv"; rows: Array<{ label: string; value: string }> };

export interface Message {
  id: string;
  caseId: string;
  author: Participant;
  text: string;
  timestamp: string;
  /** Ссылки на факты, документы и события, на которые опирается сообщение. */
  factRefs?: string[];
  documentRefs?: string[];
  tone?: "info" | "question" | "warning" | "success";
}

export type TaskStatus = "open" | "done" | "cancelled";

export interface Task {
  id: string;
  caseId: string;
  title: string;
  description?: string;
  assignee: Actor;
  status: TaskStatus;
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
  result?: string;
}

export type EventKind =
  | "case_created"
  | "interview_started"
  | "interview_completed"
  | "facts_structured"
  | "recommendation_given"
  | "action_selected"
  | "task_created"
  | "task_completed"
  | "document_generated"
  | "document_confirmed"
  | "document_sent"
  | "counterparty_responded"
  | "result_rejected"
  | "court_preparation_started"
  | "transferred_to_lawyer"
  | "lawyer_message"
  | "user_message"
  | "fact_updated"
  | "lawyer_decision"
  | "case_closed"
  | "note";

export interface CaseEvent {
  id: string;
  caseId: string;
  kind: EventKind;
  title: string;
  description?: string;
  date: string;
  timestamp: string;
  initiator: Actor;
  sourceLabel?: string;
  documentRefs?: string[];
  factRefs?: string[];
}

/** Ожидаемое событие объясняет, почему дело находится в текущем состоянии (§11, §27). */
export interface ExpectedEvent {
  id: string;
  title: string;
  description?: string;
  responsible: Actor;
  deadline?: string;
  /** Кнопка, позволяющая сообщить о наступившем событии. */
  actionId?: ActionId;
}

export type RecommendationKind = "peacful_resolution" | "claim" | "lawyer" | "self_service" | "close";

export interface RecommendationReason {
  text: string;
  factIds?: string[];
  documentIds?: string[];
  eventIds?: string[];
}

export interface Recommendation {
  id: string;
  caseId: string;
  title: string;
  kind: RecommendationKind;
  description: string;
  /** Пояснение, почему предложен этот вариант (docs/prototype.md §8). */
  reasons: RecommendationReason[];
  actionId: ActionId;
  recommended?: boolean;
  createdAt: string;
  /** Формулировки AI ограничены: оценка результата не гарантируется. */
  disclaimer?: string;
}

export type ActionId =
  | "START_INTERVIEW"
  | "RESTART_INTERVIEW"
  | "VIEW_FACTS"
  | "CHOOSE_PEACEFUL"
  | "CHOOSE_CLAIM"
  | "CHOOSE_LAWYER"
  | "START_CLAIM"
  | "CONFIRM_CLAIM"
  | "MOCK_SEND"
  | "REPORT_PEACEFUL_RESULT"
  | "REPORT_COUNTERPARTY_RESPONSE"
  | "REVIEW_COUNTERPARTY_REPLY"
  | "CLAIM_NOT_SATISFIED"
  | "START_COURT_PREP"
  | "TRANSFER_TO_LAWYER"
  | "SEND_MOCK_CONTRADICTION_CLARIFICATION"
  | "ANSWER_LAWYER"
  | "SEND_LAWYER_MESSAGE"
  | "APPLY_LAWYER_DECISION"
  | "CLOSE_CASE";

export type ActionVariant = "primary" | "secondary" | "danger";

export interface CaseAction {
  id: ActionId;
  label: string;
  description?: string;
  variant: ActionVariant;
  /** Действие доступно только в определённых ролях. */
  roles: Role[];
  /** Действие требует подтверждения пользователем. */
  confirm?: {
    title: string;
    message: string;
    confirmLabel: string;
  };
  /** Наличие вопроса с вариантами ответов. */
  form?: ActionForm;
}

export type ActionFormFieldType = "choice" | "text";

export interface ActionFormField {
  id: string;
  label: string;
  type: ActionFormFieldType;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export interface ActionForm {
  title: string;
  description?: string;
  fields: ActionFormField[];
}

export type LawyerDecisionType =
  | "approve_continuation"
  | "request_data"
  | "return_to_user"
  | "close_case"
  | "other";

export interface LawyerDecision {
  id: string;
  caseId: string;
  type: LawyerDecisionType;
  title: string;
  comment: string;
  lawyerName: string;
  createdAt: string;
  /** Запрошенные у пользователя данные. */
  requestedItems?: Array<{ id: string; label: string; factId?: string }>;
}

export type OutcomeReason =
  | "resolved"
  | "user_closed"
  | "lawyer_closed"
  | "counterparty_declined"
  | "deadline_expired";

export interface CaseOutcome {
  result: "solved" | "not_solved" | "closed";
  reason: OutcomeReason;
  title: string;
  comment?: string;
  closedAt: string;
}

export interface CaseUser {
  id: string;
  name: string;
  role: Role;
  title: string;
  organization?: string;
  email?: string;
  phone?: string;
  note?: string;
}

export interface CaseParty {
  name: string;
  address: string;
  inn?: string;
}

export type CasePriority = "normal" | "high" | "urgent";

export type LawyerQueueStatus = "new" | "in_progress" | "needs_attention" | "resolved";

/**
 * Юридическое дело — центральный объект приложения (docs/prototype.md §5).
 * Все вложенные коллекции принадлежат делу и позволяют восстановить его состояние.
 */
export interface Case {
  id: string;
  number: string;
  title: string;
  category: string;
  summary: string;
  situation: string;
  userId: string;
  counterparty: string;
  stage: CaseStage;
  flags: CaseFlag[];
  createdAt: string;
  updatedAt: string;
  interviewCompletedAt?: string;
  priority: CasePriority;
  transferReason?: string;
  transferredAt?: string;
  assignedLawyerId?: string;
  expectedEvent?: ExpectedEvent;
  facts: CaseFact[];
  documents: CaseDocument[];
  messages: Message[];
  tasks: Task[];
  events: CaseEvent[];
  recommendations: Recommendation[];
  lawyerDecisions: LawyerDecision[];
  outcome?: CaseOutcome;
  /** Собранные ответы mock-интервью. */
  interviewAnswers?: InterviewAnswer[];
  /** Проблемные места, выявленные AI или юристом. */
  issues?: CaseIssue[];
  queueStatus?: LawyerQueueStatus;
}

export interface CaseIssue {
  id: string;
  text: string;
  severity: "warning" | "info";
  factId?: string;
  raisedBy: Actor;
}

export interface InterviewAnswer {
  questionId: string;
  value: string;
  answeredAt: string;
}

export interface InterviewQuestion {
  id: string;
  text: string;
  factKey: FactKey;
  /** Варианты ответа. Пустой массив — свободный ввод. */
  options: Array<{ value: string; label: string }>;
  /** Значение, которое считается «достаточным» для формирования факта. */
  expectedValue?: string;
  /** Признак того, что ответ нужно сопоставить с документом и проверить на конфликт. */
  conflictsWithDocument?: boolean;
  aiFollowUp?: string;
}

export interface InterviewScript {
  intro: string[];
  closing: string[];
  questions: InterviewQuestion[];
}
