import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type {
  ActionId,
  Case,
  InterviewAnswer,
  InterviewScript,
  Recommendation,
  Role,
} from "../types/domain";
import { createSeedCases } from "../data/cases";
import { contradictionInterviewScript, interviewScript } from "../data/interview";
import {
  applyAction,
  withDerivedFacts,
  getCurrentRecommendations,
  isNavigationAction,
  registerScript,
  resetSequence,
  type ActionPayload,
  type ServiceNotice,
} from "../lib/mock/caseService";
import { DEMO_START_DATE, addDays, formatDisplayDate } from "../lib/mock/clock";
import { aiMessage, completeInterview } from "../lib/mock/interviewFlow";
import { getAvailableActions, type CaseAction } from "../lib/workflow";

export interface AppState {
  role: Role;
  cases: Case[];
  nextCaseNumber: number;
  today: string;
  notice?: ServiceNotice;
}

export type StateAction =
  | { type: "setRole"; role: Role }
  | { type: "resetDemo" }
  | { type: "createCase"; situation: string; title: string; script: InterviewScript }
  | { type: "startInterview"; caseId: string }
  | { type: "answerQuestion"; caseId: string; answer: InterviewAnswer }
  | { type: "completeInterview"; caseId: string }
  | { type: "runAction"; caseId: string; actionId: ActionId; payload: ActionPayload }
  | { type: "dismissNotice" };

function initialState(): AppState {
  resetSequence();
  registerScript("LC-2026-001", interviewScript);
  registerScript("LC-2026-002", contradictionInterviewScript);
  return {
    role: "user",
    cases: createSeedCases(),
    nextCaseNumber: 3,
    today: DEMO_START_DATE,
  };
}

function withCase(state: AppState, caseId: string, update: (item: Case) => Case): AppState {
  return { ...state, cases: state.cases.map((item) => (item.id === caseId ? update(item) : item)) };
}

function stamp(iso: string): string {
  return formatDisplayDate(iso);
}

function reducer(state: AppState, action: StateAction): AppState {
  switch (action.type) {
    case "setRole":
      return { ...state, role: action.role };

    case "resetDemo":
      return initialState();

    case "dismissNotice":
      return { ...state, notice: undefined };

    case "createCase": {
      const id = `LC-2026-${String(state.nextCaseNumber).padStart(3, "0")}`;
      const display = stamp(state.today);
      const time = `${state.today}T09:12:00`;
      const created: Case = {
        id,
        number: `№ ${id}`,
        title: action.title,
        category: "Защита прав потребителей",
        summary: action.situation,
        situation: action.situation,
        userId: "u-001",
        counterparty: "ООО «Техника»",
        stage: "INTAKE",
        flags: [],
        createdAt: display,
        updatedAt: display,
        priority: "normal",
        facts: [],
        documents: [],
        messages: [
          {
            id: `${id}:msg:1`,
            caseId: id,
            author: "user",
            text: action.situation,
            timestamp: time,
          },
        ],
        tasks: [],
        events: [
          {
            id: `${id}:ev:1`,
            caseId: id,
            kind: "case_created",
            title: "Обращение создано",
            description: action.situation,
            date: display,
            timestamp: time,
            initiator: "user",
            sourceLabel: "Первичное обращение",
          },
        ],
        recommendations: [],
        lawyerDecisions: [],
        expectedEvent: {
          id: `${id}:ee:1`,
          title: "Пройти AI-интервью",
          description: "AI уточнит детали, чтобы собрать факты дела и их источники.",
          responsible: "user",
          actionId: "START_INTERVIEW",
        },
      };
      registerScript(id, action.script);
      return {
        ...state,
        cases: [created, ...state.cases],
        nextCaseNumber: state.nextCaseNumber + 1,
        notice: {
          tone: "progress",
          title: "Дело создано",
          message: "Далее AI задаст уточняющие вопросы, чтобы собрать факты дела и их источники.",
        },
      };
    }

    case "startInterview":
      return withCase(state, action.caseId, (item) => {
        const display = stamp(state.today);
        const time = `${state.today}T09:14:00`;
        const alreadyStarted = item.stage === "INFO_COLLECTION";
        return {
          ...item,
          stage: "INFO_COLLECTION",
          flags: ["WAITING_USER"],
          updatedAt: display,
          expectedEvent: {
            id: `${item.id}:ee:interview`,
            title: "Пройти AI-интервью",
            description: "AI уточнит детали, чтобы собрать факты дела и их источники.",
            responsible: "user",
          },
          ...(alreadyStarted
            ? {}
            : {
                events: [
                  ...item.events,
                  {
                    id: `${item.id}:ev:interview`,
                    caseId: item.id,
                    kind: "interview_started" as const,
                    title: "Начато AI-интервью",
                    date: display,
                    timestamp: time,
                    initiator: "ai" as const,
                    sourceLabel: "AI-интервью",
                  },
                ],
                messages: [
                  ...item.messages,
                  aiMessage(item, "Понял ситуацию. Чтобы определить подходящий способ решения, мне нужно уточнить несколько деталей.", "info", time),
                ],
              }),
        };
      });

    case "answerQuestion":
      return withCase(state, action.caseId, (item) => {
        const answers = [
          ...(item.interviewAnswers ?? []).filter((a) => a.questionId !== action.answer.questionId),
          action.answer,
        ];
        return { ...withDerivedFacts(item, answers), interviewAnswers: answers };
      });

    case "completeInterview":
      return withCase(state, action.caseId, (item) => completeInterview(item, state.today));

    case "runAction": {
      if (isNavigationAction(action.actionId)) return state;
      const target = state.cases.find((item) => item.id === action.caseId);
      if (!target) return state;
      const outcome = applyAction(target, action.actionId, action.payload, state.today);
      return {
        ...withCase(state, action.caseId, () => ({
          ...outcome.caseItem,
          updatedAt: stamp(state.today),
        })),
        today: addDays(state.today, 1),
        notice: outcome.notice,
      };
    }

    default:
      return state;
  }
}

export interface StoreValue {
  state: AppState;
  dispatch: Dispatch<StateAction>;
  getCase: (caseId: string) => Case | undefined;
  actionsFor: (caseItem: Case) => CaseAction[];
  recommendationsFor: (caseItem: Case) => Recommendation[];
  scripts: { interview: InterviewScript; contradiction: InterviewScript };
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  const getCase = useCallback(
    (caseId: string) => state.cases.find((item) => item.id === caseId),
    [state.cases],
  );

  const value = useMemo<StoreValue>(
    () => ({
      state,
      dispatch,
      getCase,
      actionsFor: (caseItem: Case) => getAvailableActions(caseItem, state.role),
      recommendationsFor: (caseItem: Case) => getCurrentRecommendations(caseItem),
      scripts: { interview: interviewScript, contradiction: contradictionInterviewScript },
    }),
    [state, getCase],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used within StoreProvider");
  return value;
}