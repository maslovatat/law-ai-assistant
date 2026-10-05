import type { ActionId, Case, CaseStage, Role } from "../types/domain";
import type { CaseAction } from "../types/domain";

export type { CaseAction };
import { stageProgressOrder } from "../types/labels";
import { actionCatalogue } from "./actions";

const stageActions: Record<CaseStage, ActionId[]> = {
  INTAKE: ["START_INTERVIEW"],
  INFO_COLLECTION: ["START_INTERVIEW"],
  ANALYSIS: ["RESTART_INTERVIEW"],
  SOLUTION_CHOICE: [],
  ACTION_EXECUTION: [],
  AWAITING_RESULT: ["REPORT_PEACEFUL_RESULT"],
  CLAIM_PREPARATION: ["START_CLAIM"],
  CLAIM_APPROVAL: ["CONFIRM_CLAIM"],
  SENT: ["MOCK_SEND"],
  AWAITING_RESPONSE: ["REPORT_COUNTERPARTY_RESPONSE"],
  RESULT_ANALYSIS: ["REVIEW_COUNTERPARTY_REPLY", "CLAIM_NOT_SATISFIED"],
  COURT_PREPARATION: ["START_COURT_PREP"],
  LAWYER_REVIEW: ["SEND_LAWYER_MESSAGE", "APPLY_LAWYER_DECISION"],
  CLOSED: [],
};

const flagActions: Array<{ flag: Case["flags"][number]; action: ActionId }> = [
  { flag: "CONFLICT_DETECTED", action: "SEND_MOCK_CONTRADICTION_CLARIFICATION" },
  { flag: "NEEDS_CLARIFICATION", action: "TRANSFER_TO_LAWYER" },
  { flag: "NEEDS_LAWYER", action: "TRANSFER_TO_LAWYER" },
  { flag: "WAITING_USER", action: "ANSWER_LAWYER" },
];

/** Действия, помогающие понять состояние дела и не меняющие его. */
const alwaysAvailable: ActionId[] = ["VIEW_FACTS"];

/**
 * Доступные действия выводятся из этапа, флагов и ожидаемого события дела,
 * а не из номера дела. Это позволяет заменить или добавить демо-дела
 * без изменения логики переходов (docs/prototype.md §38).
 */
export function getAvailableActions(caseItem: Case, role: Role): CaseAction[] {
  if (caseItem.stage === "CLOSED") return [];

  const ids = new Set<ActionId>();

  for (const id of stageActions[caseItem.stage]) ids.add(id);
  for (const flag of caseItem.flags) {
    for (const entry of flagActions) {
      if (entry.flag === flag) ids.add(entry.action);
    }
  }
  for (const id of alwaysAvailable) ids.add(id);

  // Ожидаемое событие определяет главное действие дела.
  const expectedAction = caseItem.expectedEvent?.actionId;
  if (expectedAction) ids.add(expectedAction);

  // Закрытие дела доступно пользователю на всех этапах.
  ids.add("CLOSE_CASE");

  const variantOrder: Record<CaseAction["variant"], number> = { primary: 0, secondary: 1, danger: 2 };
  return [...ids]
    .map((id) => actionCatalogue[id])
    .filter((action): action is CaseAction => Boolean(action))
    .filter((action) => action.roles.includes(role))
    .sort((a, b) => variantOrder[a.variant] - variantOrder[b.variant]);
}

/** Стадия прогресса для индикатора «где я сейчас». */
export function getStageProgress(caseItem: Case): { index: number; total: number } {
  const index = Math.max(stageProgressOrder.indexOf(caseItem.stage), 0);
  return { index, total: stageProgressOrder.length - 1 };
}