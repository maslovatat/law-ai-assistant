import type {
  Shipment,
  ShipmentDraft,
  ShipmentStatus,
  ShipmentEvent,
  ShipmentType,
  SenderProfile,
  ApiStatus,
} from "../types/domain";
import { createSeedShipments, createSeedDrafts } from "../data/shipments";
import { defaultSenderProfile } from "../data/sender";
import { formatDisplayDate, addDays, nowTimestamp } from "../lib/mock/clock";
import { generateMailId, generateRequestId, generateShipmentId, resetShipmentCounter } from "../data/ids";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Ключи localStorage для демонстрационных данных. */
const STORAGE_KEYS = {
  shipments: "eps_demo_shipments",
  drafts: "eps_demo_drafts",
  profile: "eps_demo_profile",
  counter: "eps_demo_counter",
};

/** Искусственная задержка для имитации асинхронной работы сервиса. */
const MOCK_DELAY = 300;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Хранилище (localStorage + in-memory fallback)
// ---------------------------------------------------------------------------

export interface ServiceNotice {
  tone: "neutral" | "progress" | "attention" | "danger" | "success" | "demo";
  title: string;
  message: string;
}

export interface ActionOutcome<T> {
  data: T;
  notice?: ServiceNotice;
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // ignore parse errors, fall through to fallback
  }
  return fallback;
}

function writeStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore write errors (e.g. in test environments)
  }
}

function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Shipment service
// ---------------------------------------------------------------------------

export interface ShipmentService {
  /** Получить все отправления (синхронно из in-memory кеша после загрузки). */
  getShipments(): Shipment[];
  /** Получить одно отправление по ID. */
  getShipment(id: string): Shipment | undefined;
  /** Сохранить список отправлений (в localStorage). */
  saveShipments(shipments: Shipment[]): void;
  /** Удалить отправление. */
  deleteShipment(id: string): ActionOutcome<boolean>;
  /** Создать черновик из текущего состояния мастера. */
  createDraft(draft: Omit<ShipmentDraft, "id" | "createdAt" | "updatedAt">): ShipmentDraft;
  /** Получить все черновики. */
  getDrafts(): ShipmentDraft[];
  /** Получить черновик по ID. */
  getDraft(id: string): ShipmentDraft | undefined;
  /** Сохранить черновик. */
  saveDraft(draft: ShipmentDraft): ShipmentDraft;
  /** Удалить черновик. */
  deleteDraft(id: string): ActionOutcome<boolean>;
  /** Отправить отправление (демонстрационная операция). */
  submitShipment(draft: ShipmentDraft): Promise<ActionOutcome<Shipment>>;
  /** Получить профиль отправителя. */
  getSenderProfile(): SenderProfile;
  /** Сохранить профиль отправителя. */
  saveSenderProfile(profile: SenderProfile): ActionOutcome<SenderProfile>;
  /** Сбросить демо-данные к исходным. */
  resetDemo(): void;
}

/** Синглтон-сервис для mock-хранилища. */
class ShipmentServiceImpl implements ShipmentService {
  private shipments: Shipment[] = [];
  private drafts: ShipmentDraft[] = [];
  private profile: SenderProfile = defaultSenderProfile;

  constructor() {
    this.load();
  }

  private load(): void {
    this.shipments = readStorage(STORAGE_KEYS.shipments, []);
    this.drafts = readStorage(STORAGE_KEYS.drafts, []);
    this.profile = readStorage(STORAGE_KEYS.profile, defaultSenderProfile);
  }

  private persist(): void {
    writeStorage(STORAGE_KEYS.shipments, this.shipments);
    writeStorage(STORAGE_KEYS.drafts, this.drafts);
  }

  getShipments(): Shipment[] {
    return [...this.shipments];
  }

  getShipment(id: string): Shipment | undefined {
    return this.shipments.find((s) => s.id === id);
  }

  saveShipments(shipments: Shipment[]): void {
    this.shipments = [...shipments];
    this.persist();
  }

  deleteShipment(id: string): ActionOutcome<boolean> {
    this.shipments = this.shipments.filter((s) => s.id !== id);
    this.persist();
    return {
      data: true,
      notice: {
        tone: "success",
        title: "Отправление удалено",
        message: "Запись удалена из списка.",
      },
    };
  }

  createDraft(draft: Omit<ShipmentDraft, "id" | "createdAt" | "updatedAt">): ShipmentDraft {
    const now = new Date().toISOString().slice(0, 10);
    const display = formatDisplayDate(now);
    const newDraft: ShipmentDraft = {
      ...draft,
      id: `draft-${Date.now()}`,
      createdAt: display,
      updatedAt: display,
    };
    this.drafts = [newDraft, ...this.drafts];
    this.persist();
    return newDraft;
  }

  getDrafts(): ShipmentDraft[] {
    return [...this.drafts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getDraft(id: string): ShipmentDraft | undefined {
    return this.drafts.find((d) => d.id === id);
  }

  saveDraft(draft: ShipmentDraft): ShipmentDraft {
    const now = new Date().toISOString().slice(0, 10);
    const display = formatDisplayDate(now);
    const updated = { ...draft, updatedAt: display };
    this.drafts = [updated, ...this.drafts.filter((d) => d.id !== draft.id)];
    this.persist();
    return updated;
  }

  deleteDraft(id: string): ActionOutcome<boolean> {
    this.drafts = this.drafts.filter((d) => d.id !== id);
    this.persist();
    return {
      data: true,
      notice: {
        tone: "success",
        title: "Черновик удалён",
        message: "Незавершённый черновик удалён.",
      },
    };
  }

  /**
   * Демонстрационная отправка. Симулирует последовательность состояний:
   * Подготавливаем → Обрабатываем → Завершено → Принято системой → В пути → Вручено.
   */
  async submitShipment(draft: ShipmentDraft): Promise<ActionOutcome<Shipment>> {
    await delay(MOCK_DELAY);

    if (!draft.sender || !draft.recipient || !draft.document) {
      return {
        data: null as any,
        notice: {
          tone: "danger",
          title: "Ошибка отправки",
          message: "Недостаточно данных для создания отправления.",
        },
      };
    }

    const now = new Date().toISOString().slice(0, 10);
    const nowDisplay = formatDisplayDate(now);
    const nowTs = nowTimestamp(now);
    const mailId = generateMailId();

    const events: ShipmentEvent[] = [
      {
        id: generateShipmentId(),
        shipmentId: "",
        type: "document_added",
        title: "Документ добавлен",
        description: `Файл «${draft.document.name}» загружен.`,
        date: nowDisplay,
        timestamp: nowTs,
        initiator: "user",
        isDemo: false,
      },
      {
        id: generateShipmentId(),
        shipmentId: "",
        type: "sender_filled",
        title: "Отправитель и получатель заполнены",
        date: nowDisplay,
        timestamp: nowTimestamp(addDays(now, 0)),
        initiator: "user",
        isDemo: false,
      },
      {
        id: generateShipmentId(),
        shipmentId: "",
        type: "shipment_verified",
        title: "Отправление проверено",
        date: nowDisplay,
        timestamp: nowTimestamp(addDays(now, 0)),
        initiator: "system",
        isDemo: false,
      },
      {
        id: generateShipmentId(),
        shipmentId: "",
        type: "shipment_sent",
        title: "Демонстрационная операция завершена",
        description: "Демонстрационный режим. Письмо не отправлено.",
        date: nowDisplay,
        timestamp: nowTimestamp(addDays(now, 1)),
        initiator: "system",
        isDemo: true,
      },
      {
        id: generateShipmentId(),
        shipmentId: "",
        type: "accepted_by_system",
        title: "Принято системой",
        description: "Демонстрационный статус: запрос принят в обработку (IN_PROGRESS / VALIDATION).",
        date: nowDisplay,
        timestamp: nowTimestamp(addDays(now, 1)),
        initiator: "system",
        isDemo: true,
      },
      {
        id: generateShipmentId(),
        shipmentId: "",
        type: "in_transit",
        title: "В пути",
        description: "Демонстрационный статус доставки (IN_PROGRESS / DELIVERY).",
        date: nowDisplay,
        timestamp: nowTimestamp(addDays(now, 2)),
        initiator: "system",
        isDemo: true,
      },
      {
        id: generateShipmentId(),
        shipmentId: "",
        type: "delivered",
        title: "Вручено",
        description: "Демонстрационный статус: письмо доставлено получателю (ONLINE_DELIVERED).",
        date: nowDisplay,
        timestamp: nowTimestamp(addDays(now, 2)),
        initiator: "post",
        isDemo: true,
      },
    ];

    const shipment: Shipment = {
      id: generateShipmentId(),
      requestCode: generateRequestId(),
      mailId,
      sender: draft.sender!,
      recipient: draft.recipient!,
      document: draft.document!,
      status: "DELIVERED" as ShipmentStatus,
      apiStatus: "ONLINE_DELIVERED" as ApiStatus,
      createdAt: nowDisplay,
      updatedAt: nowDisplay,
      events,
      isDemo: true,
      mailRank: 4,
      shipmentType: "REGISTERED" as ShipmentType,
      expectedEvent: {
        id: "ev-" + generateMailId(),
        title: "Доставлено (демонстрация)",
        description: "Демонстрационная операция завершена.",
        responsible: "recipient",
      },
    };

    // Link events
    for (const event of shipment.events) {
      event.shipmentId = shipment.id;
    }

    this.shipments = [shipment, ...this.shipments];
    this.persist();

    // Remove the draft — shipment created
    this.drafts = this.drafts.filter((d) => d.id !== draft.id);
    this.persist();

    // Check for duplicate (same document)
    const hasDuplicate = this.shipments.filter(
      (s) => s.document?.name === draft.document!.name && s.document?.size === draft.document!.size,
    ).length > 1;

    const notice: ServiceNotice = {
      tone: "success",
      title: "Демонстрационная операция завершена",
      message: hasDuplicate
        ? "Отправление создано повторно. Обратите внимание на дубликат."
        : "Демонстрационное отправление сохранено в списке. Письмо не отправлено.",
    };

    return { data: shipment, notice };
  }

  getSenderProfile(): SenderProfile {
    return { ...this.profile };
  }

  saveSenderProfile(profile: SenderProfile): ActionOutcome<SenderProfile> {
    this.profile = { ...profile };
    writeStorage(STORAGE_KEYS.profile, this.profile);
    return {
      data: this.profile,
      notice: {
        tone: "success",
        title: "Профиль сохранён",
        message: "Настройки отправителя сохранены локально.",
      },
    };
  }

  /** Сбросить демо-данные к исходным (только синтетические seed-данные). */
  resetDemo(): void {
    resetShipmentCounter();
    this.shipments = [];
    this.drafts = [];
    removeStorage(STORAGE_KEYS.shipments);
    removeStorage(STORAGE_KEYS.drafts);
    removeStorage(STORAGE_KEYS.counter);
    writeStorage(STORAGE_KEYS.profile, defaultSenderProfile);
    this.profile = { ...defaultSenderProfile };
  }

  /** Инициализировать seed-данные, если localStorage пуст. */
  initSeedData(): void {
    if (this.shipments.length === 0) {
      this.shipments = createSeedShipments();
      this.persist();
    }
    if (this.drafts.length === 0) {
      this.drafts = createSeedDrafts();
      this.persist();
    }
  }

  /** Получить статусы для дашборда. */
  getStatusCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const shipment of this.shipments) {
      counts[shipment.status] = (counts[shipment.status] || 0) + 1;
    }
    return counts;
  }
}

export const shipmentService = new ShipmentServiceImpl();
