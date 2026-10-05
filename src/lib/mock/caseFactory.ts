import type {
  Case,
  CaseEvent,
  CaseFact,
  CaseIssue,
  CaseUser,
  ExpectedEvent,
  FactKey,
  FactSource,
  InterviewAnswer,
  LawyerDecision,
  Message,
  Recommendation,
  Task,
} from "../../types/domain";
import { caseEventSeeds } from "../../data/events";
import { documentTemplates, getDocumentTemplate, type DocumentTemplate } from "../../data/documents";
import { factSeeds, type SourceSeed } from "../../data/facts";
import { messageSeeds } from "../../data/messages";
import { recommendationSeeds } from "../../data/recommendations";
import { taskSeeds } from "../../data/tasks";
import { buildDocumentValues, docId, factId, materializeDocuments, type FactLike } from "./ids";

export interface SeedCaseSpec {
  id: string;
  number: string;
  title: string;
  category: string;
  summary: string;
  situation: string;
  counterparty: string;
  stage: Case["stage"];
  flags: Case["flags"];
  createdAt: string;
  updatedAt: string;
  priority: Case["priority"];
  user: CaseUser;
  /** Ключи шаблонов документов, входящих в дело. */
  documentKeys: string[];
  /** Дополнительные значения для подстановки в mock-документы. */
  documentValues?: Record<string, string>;
  expectedEvent?: ExpectedEvent;
  interviewAnswers?: InterviewAnswer[];
  issues?: CaseIssue[];
  lawyerDecisions?: LawyerDecision[];
  transferReason?: string;
  transferredAt?: string;
  assignedLawyerId?: string;
  queueStatus?: Case["queueStatus"];
  interviewCompletedAt?: string;
  /** Значения, добавляемые к фактам поверх seed-набора (например, уточнение юриста). */
  extraFactValues?: Array<{ factKey: FactKey; value: string; state: CaseFact["state"]; sourceLabel: string }>;
}

function resolveSource(seed: SourceSeed, caseId: string): FactSource {
  const { documentKey, ...rest } = seed;
  return {
    ...rest,
    id: `${caseId}:src:${rest.id}`,
    ...(documentKey ? { documentId: docId(caseId, documentKey) } : {}),
  };
}

function resolveFacts(spec: SeedCaseSpec): CaseFact[] {
  const seeds = factSeeds[spec.id] ?? [];
  const facts: CaseFact[] = seeds.map((seed): CaseFact => {
    const sources = seed.sources.map((s) => resolveSource(s, spec.id));
    return {
      id: factId(spec.id, seed.factKey),
      caseId: spec.id,
      key: seed.factKey,
      title: seed.title,
      value: seed.value,
      state: seed.state,
      sources,
      conflict: seed.conflict
        ? {
            detectedAt: seed.conflict.detectedAt,
            variants: seed.conflict.variants.map((variant) => ({
              value: variant.value,
              source: resolveSource(variant.source, spec.id),
            })),
          }
        : undefined,
      requiresClarification: seed.requiresClarification,
      updatedAt: seed.updatedAt,
    };
  });

  for (const extra of spec.extraFactValues ?? []) {
    const existing = facts.find((f) => f.key === extra.factKey);
    const source: FactSource = {
      id: `${spec.id}:src:extra-${extra.factKey}`,
      kind: "lawyer_message",
      label: extra.sourceLabel,
    };
    if (existing) {
      existing.value = extra.value;
      existing.state = extra.state;
      existing.updatedAt = spec.updatedAt;
      existing.sources = [source];
      existing.requiresClarification = false;
      delete existing.conflict;
    } else {
      facts.push({
        id: factId(spec.id, extra.factKey),
        caseId: spec.id,
        key: extra.factKey,
        title: extra.factKey,
        value: extra.value,
        state: extra.state,
        sources: [source],
        updatedAt: spec.updatedAt,
        requiresClarification: false,
      });
    }
  }

  return facts;
}

function resolveDocuments(spec: SeedCaseSpec, facts: CaseFact[]): Case["documents"] {
  const templates = spec.documentKeys
    .map((key) => getDocumentTemplate(key))
    .filter((t): t is DocumentTemplate => t !== undefined);
  const values = buildDocumentValues(
    facts.map((fact): FactLike => ({ id: fact.id, key: fact.key, value: fact.value })),
    spec.documentValues,
  );
  return materializeDocuments(spec.id, templates, values);
}

/** Переводит локальные ссылки (идентификатор факта или ключ документа) в идентификаторы дела. */
function makeRefResolver(spec: SeedCaseSpec): (ref: string) => string {
  const factByLocalId = new Map<string, FactKey>();
  for (const seed of factSeeds[spec.id] ?? []) {
    factByLocalId.set(seed.localId, seed.factKey);
  }
  return (ref) => {
    const key = factByLocalId.get(ref);
    if (key) return factId(spec.id, key);
    return docId(spec.id, ref);
  };
}

function resolveMessages(spec: SeedCaseSpec, resolve: (ref: string) => string): Message[] {
  return (messageSeeds[spec.id] ?? []).map((message) => ({
    ...message,
    caseId: spec.id,
    factRefs: message.factRefs?.map(resolve),
    documentRefs: message.documentRefs?.map(resolve),
  }));
}

function resolveEvents(spec: SeedCaseSpec, resolve: (ref: string) => string): CaseEvent[] {
  return (caseEventSeeds[spec.id] ?? []).map((event) => ({
    ...event,
    caseId: spec.id,
    factRefs: event.factRefs?.map(resolve),
    documentRefs: event.documentRefs?.map(resolve),
  }));
}

function resolveRecommendations(spec: SeedCaseSpec, resolve: (ref: string) => string): Recommendation[] {
  return (recommendationSeeds[spec.id] ?? []).map((rec) => ({
    ...rec,
    caseId: spec.id,
    reasons: rec.reasons.map((reason) => ({
      ...reason,
      factIds: reason.factIds?.map(resolve),
      documentIds: reason.documentIds?.map(resolve),
    })),
  }));
}

function resolveTasks(spec: SeedCaseSpec): Task[] {
  return (taskSeeds[spec.id] ?? []).map((task) => ({ ...task, caseId: spec.id }));
}

/** Собирает демонстрационное дело из seed-данных. */
export function buildSeedCase(spec: SeedCaseSpec): Case {
  const resolve = makeRefResolver(spec);
  const facts = resolveFacts(spec);
  return {
    id: spec.id,
    number: spec.number,
    title: spec.title,
    category: spec.category,
    summary: spec.summary,
    situation: spec.situation,
    userId: spec.user.id,
    counterparty: spec.counterparty,
    stage: spec.stage,
    flags: spec.flags,
    createdAt: spec.createdAt,
    updatedAt: spec.updatedAt,
    interviewCompletedAt: spec.interviewCompletedAt,
    priority: spec.priority,
    transferReason: spec.transferReason,
    transferredAt: spec.transferredAt,
    assignedLawyerId: spec.assignedLawyerId,
    expectedEvent: spec.expectedEvent,
    facts,
    documents: resolveDocuments(spec, facts),
    messages: resolveMessages(spec, resolve),
    tasks: resolveTasks(spec),
    events: resolveEvents(spec, resolve),
    recommendations: resolveRecommendations(spec, resolve),
    lawyerDecisions: (spec.lawyerDecisions ?? []).map((decision) => ({
      ...decision,
      caseId: spec.id,
    })),
    interviewAnswers: spec.interviewAnswers,
    issues: spec.issues,
    queueStatus: spec.queueStatus,
  };
}

export { documentTemplates };