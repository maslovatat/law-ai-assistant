import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type {
  Shipment,
  ShipmentDraft,
  SenderProfile,
  ShipmentStatus,
} from "../types/domain";
import { shipmentService, type ServiceNotice } from "../lib/shipmentService";
import { DEMO_START_DATE, formatDisplayDate } from "../lib/mock/clock";

export interface AppState {
  shipments: Shipment[];
  drafts: ShipmentDraft[];
  senderProfile: SenderProfile;
  today: string;
  notice?: ServiceNotice;
}

export type StateAction =
  | { type: "init" }
  | { type: "dismissNotice" }
  | { type: "saveDraft"; draft: Omit<ShipmentDraft, "id" | "createdAt" | "updatedAt"> }
  | { type: "deleteDraft"; id: string }
  | { type: "openDraft"; id: string }
  | {
      type: "submitShipment";
      draft: ShipmentDraft;
      resolve: (result: { ok: boolean; shipment?: Shipment; notice: ServiceNotice }) => void;
    }
  | { type: "deleteShipment"; id: string }
  | { type: "saveProfile"; profile: SenderProfile }
  | { type: "updateProfileField"; field: keyof SenderProfile; value: unknown }
  | { type: "resetDemo" };

interface StoreValue {
  state: AppState;
  dispatch: Dispatch<StateAction>;
  getShipment: (id: string) => Shipment | undefined;
  getDraft: (id: string) => ShipmentDraft | undefined;
  searchShipments: (query: string) => Shipment[];
  filterShipmentsByStatus: (status: ShipmentStatus | "ALL") => Shipment[];
  statusCounts: Record<string, number>;
}

const StoreContext = createContext<StoreValue | null>(null);

function initialState(): AppState {
  return {
    shipments: [],
    drafts: [],
    senderProfile: shipmentService.getSenderProfile(),
    today: DEMO_START_DATE,
    notice: undefined,
  };
}

function reducer(state: AppState, action: StateAction): AppState {
  switch (action.type) {
    case "init": {
      shipmentService.initSeedData();
      return {
        shipments: shipmentService.getShipments(),
        drafts: shipmentService.getDrafts(),
        senderProfile: shipmentService.getSenderProfile(),
        today: state.today,
      };
    }

    case "dismissNotice":
      return { ...state, notice: undefined };

    case "saveDraft": {
      shipmentService.createDraft(action.draft);
      return {
        ...state,
        drafts: shipmentService.getDrafts(),
        notice: {
          tone: "success",
          title: "Черновик сохранён",
          message: "Состояние мастера сохранено. Продолжите позже.",
        },
      };
    }

    case "deleteDraft": {
      const outcome = shipmentService.deleteDraft(action.id);
      return {
        ...state,
        drafts: shipmentService.getDrafts(),
        notice: outcome.notice,
      };
    }

    case "openDraft": {
      const draft = shipmentService.getDraft(action.id);
      if (!draft) {
        return {
          ...state,
          notice: {
            tone: "danger",
            title: "Черновик не найден",
            message: "Выбранный черновик не найден.",
          },
        };
      }
      return {
        ...state,
        // The draft data is used by the page to populate wizard fields
        notice: {
          tone: "neutral",
          title: "Черновик открыт",
          message: `Продолжите заполнение с шага ${draft.currentStep + 1}.`,
        },
      };
    }

    case "submitShipment": {
      // Handled asynchronously in SubmitButton — this is a placeholder
      return state;
    }

    case "deleteShipment": {
      const outcome = shipmentService.deleteShipment(action.id);
      return {
        ...state,
        shipments: shipmentService.getShipments(),
        notice: outcome.notice,
      };
    }

    case "saveProfile": {
      const outcome = shipmentService.saveSenderProfile(action.profile);
      return {
        ...state,
        senderProfile: outcome.data,
        notice: outcome.notice,
      };
    }

    case "updateProfileField": {
      const updated = { ...state.senderProfile, [action.field]: action.value } as SenderProfile;
      const outcome = shipmentService.saveSenderProfile(updated);
      return {
        ...state,
        senderProfile: outcome.data,
      };
    }

    case "resetDemo": {
      shipmentService.resetDemo();
      shipmentService.initSeedData();
      return {
        shipments: shipmentService.getShipments(),
        drafts: shipmentService.getDrafts(),
        senderProfile: shipmentService.getSenderProfile(),
        today: DEMO_START_DATE,
      };
    }

    default:
      return state;
  }
}

export function ShipmentStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  // Initialize seed data on first mount
  useEffect(() => {
    dispatch({ type: "init" });
  }, []);

  const getShipment = useCallback((id: string) => shipmentService.getShipment(id), []);

  const getDraft = useCallback((id: string) => shipmentService.getDraft(id), []);

  const searchShipments = useCallback(
    (query: string) => {
      const lower = query.toLowerCase();
      return state.shipments.filter(
        (s) =>
          s.recipient.person?.lastName?.toLowerCase().includes(lower) ||
          s.recipient.person?.firstName?.toLowerCase().includes(lower) ||
          s.recipient.organization?.name?.toLowerCase().includes(lower) ||
          s.document?.name?.toLowerCase().includes(lower),
      );
    },
    [state.shipments],
  );

  const filterShipmentsByStatus = useCallback(
    (status: ShipmentStatus | "ALL") => {
      if (status === "ALL") return state.shipments;
      return state.shipments.filter((s) => s.status === status);
    },
    [state.shipments],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const shipment of state.shipments) {
      counts[shipment.status] = (counts[shipment.status] || 0) + 1;
    }
    return counts;
  }, [state.shipments]);

  const value = useMemo<StoreValue>(
    () => ({
      state,
      dispatch,
      getShipment,
      getDraft,
      searchShipments,
      filterShipmentsByStatus,
      statusCounts,
    }),
    [state, getShipment, getDraft, searchShipments, filterShipmentsByStatus, statusCounts],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used within ShipmentStoreProvider");
  return value;
}

export function useShipment(dateIso: string): string {
  return formatDisplayDate(dateIso);
}
