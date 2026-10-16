// Domain types for the postal shipment prototype (docs/prototype2.md §13)
// Based on ИС ЭПС API field names from docs/Pamyatka_API_*.pdf

/** Тип отправителя: физическое лицо или юридическое лицо (ИП/UL). */
export type SenderType = "fiz" | "ul";

/** Тип получателя: физическое лицо или юридическое лицо. */
export type RecipientType = "fiz" | "ul";

/**
 * Адрес в виде структуры (AddressStruct из API Почты России).
 * Используется для валидации и отображения отдельных полей.
 */
export interface AddressStruct {
  postalCode?: string;
  region?: string;
  area?: string;
  city?: string;
  cityType?: string;
  settlement?: string;
  settlementType?: string;
  street?: string;
  streetType?: string;
  houseNumber?: string;
  corpus?: string;
  stroenie?: string;
  building?: string;
  flat?: string;
  office?: string;
  entrance?: string;
  floor?: string;
  hostel?: string;
  okatoCode?: string;
  postalBox?: string;
  militaryNumber?: string;
  room?: string;
  section?: string;
  vladenie?: string;
  /** Дополнительная информация в адресном блоке. */
  additionalInfo?: string;
}

export interface Organization {
  name: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
}

export interface Individual {
  firstName: string;
  lastName: string;
  patronymic?: string;
  inn?: string;
  snils?: string;
  /** Реквизиты документа, удостоверяющего личность. */
  identityDocument?: {
    series?: string;
    number?: string;
    issueDate?: string;
    issuer?: string;
  };
}

/**
 * ФИАС-адрес отправителя. Может быть строкой или структурой (как в API).
 * Формат строки: "644077, Омская обл., г. Омск, пр. Мира, д. 57, корп. 1, кв. 66"
 */
export interface Sender {
  type: SenderType;
  /** Код отправителя в ИС ЭПС (формат CODE_{ID}). */
  code?: string;
  /** Наименование или ФИО отправителя. */
  name: string;
  /** Электронная почта для уведомлений. */
  email?: string;
  /** Адрес в виде строки. */
  addressString?: string;
  /** Адрес в виде структуры. */
  address?: AddressStruct;
  /** Только для UL. */
  organization?: Organization;
  /** Только для ИП. */
  individual?: Individual;
}

export interface Recipient {
  type: RecipientType;
  /** Код страны по ОКСМ (643 — Россия). */
  countryCodeOKSM: number;
  /** Адрес в виде строки. */
  addressString: string;
  /** Адрес в виде структуры. */
  address?: AddressStruct;
  /** Только для физического лица. */
  person?: Individual;
  /** Только для юридического лица. */
  organization?: Organization;
  /** Дополнительная информация в адресном блоке получателя. */
  additionalInfo?: string;
}

/** Метаданные загруженного документа (PDF). Не сохраняем содержимое файла. */
export interface DocumentAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  pageCount?: number;
  uploadedAt: string;
}

/**
 * Статусы отправления — состояния UI-прототипа.
 * Не выдаются за точный перечень кодов или статусов ИС ЭПС.
 */
export type ShipmentStatus =
  | "DRAFT"
  | "PREPARED"
  | "SENDING"
  | "ACCEPTED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "REQUIRES_ATTENTION";

/**
 * Статусы, используемые в API ИС ЭПС (из документации).
 * Используются для привязки демонстрационных статусов к понятиям API.
 */
export type ApiStatus = "UNKNOWN" | "ACCEPTED" | "IN_PROGRESS" | "ONLINE_DELIVERED" | "DELIVERED_TO_PRINT" | "FAILED";

/** Подстатус для статуса IN_PROGRESS. */
export type ApiSubStatus = "VALIDATION" | "DELIVERY";

/**
 * Коды разряда почтового отправления (из API): 4 — судебное, 8 — административное,
 * 0 — другие. Используются для справки в интерфейсе.
 */
export type MailRank = 4 | 8 | 0;

/** Тип отправления: простое (REGULAR) или заказное (REGISTERED). */
export type ShipmentType = "REGULAR" | "REGISTERED";

/**
 * Событие в истории отправления.
 * Каждое событие содержит дату, описание, инициатора и пометку "демонстрационное".
 */
export interface ShipmentEvent {
  id: string;
  shipmentId: string;
  type: ShipmentEventType;
  title: string;
  description?: string;
  date: string;
  timestamp: string;
  /** Инициатор события. */
  initiator: ShipmentActor;
  /** Пометка "демонстрационное" для симулированных событий. */
  isDemo: boolean;
}

export type ShipmentActor = "user" | "system" | "recipient" | "post";

export type ShipmentEventType =
  | "document_added"
  | "sender_filled"
  | "recipient_filled"
  | "shipment_verified"
  | "shipment_sent"
  | "accepted_by_system"
  | "in_transit"
  | "delivered"
  | "attention_required";

/**
 * Ожидаемое событие объясняет, почему отправление находится в текущем состоянии.
 */
export interface ExpectedEvent {
  id: string;
  title: string;
  description?: string;
  responsible: ShipmentActor;
  deadline?: string;
}

/**
 * Почтовое отправление — центральный объект приложения (docs/prototype2.md §5).
 */
export interface Shipment {
  /** Внутренний идентификатор. */
  id: string;
  /** Условный идентификатор отправления (synthetic). */
  requestCode: string;
  /** ШПИ — Штриховой Почтовый Идентификатор (synthetic). */
  mailId?: string;
  /** Информация об отправителе. */
  sender: Sender;
  /** Информация о получателе. */
  recipient: Recipient;
  /** Метаданные документа. */
  document: DocumentAttachment;
  /** Статус отправления. */
  status: ShipmentStatus;
  /** Статус из API ИС ЭПС (для справки). */
  apiStatus?: ApiStatus;
  /** Подстатус из API. */
  apiSubStatus?: ApiSubStatus;
  /** Дата создания. */
  createdAt: string;
  /** Дата последнего изменения. */
  updatedAt: string;
  /** История событий. */
  events: ShipmentEvent[];
  /** Признак демонстрационных данных. */
  isDemo: boolean;
  /** Ожидаемое событие. */
  expectedEvent?: ExpectedEvent;
  /** Код разряда (4 — судебное, 8 — административное). */
  mailRank?: MailRank;
  /** Тип отправления. */
  shipmentType?: ShipmentType;
}

/**
 * Черновик отправления — состояние незавершённого мастера.
 * Сохраняется в localStorage.
 */
export interface ShipmentDraft {
  id: string;
  /** Дата создания. */
  createdAt: string;
  /** Дата последнего изменения. */
  updatedAt: string;
  /** Текущий шаг мастера (0-based индекс). */
  currentStep: number;
  /** Этапы, завершённые пользователем. */
  completedSteps: number[];
  /** Данные отправителя. */
  sender?: Sender;
  /** Данные получателя. */
  recipient?: Recipient;
  /** Данные документа. */
  document?: DocumentAttachment;
}

/** Шаги мастера создания отправления. */
export type WizardStep = "document" | "sender_recipient" | "verification" | "sending";

export const WIZARD_STEPS: WizardStep[] = ["document", "sender_recipient", "verification", "sending"];

/** Настройки уведомлений пользователя. */
export type NotificationSetting = "all" | "important" | "none";

/** Профиль отправителя (локальные настройки). */
export interface SenderProfile {
  type: SenderType;
  name: string;
  email: string;
  organization?: Organization;
  individual?: Individual;
  addressString?: string;
  address?: AddressStruct;
  notificiations: NotificationSetting;
  /** Пометка о том, что профиль демонстрационный. */
  isDemo: boolean;
}

/** Варианты действий кнопок в UI. */
export type ActionVariant = "primary" | "secondary" | "danger";

/** Источник данных для факта (docs/prototype2.md §9). */
export interface DataFact {
  id: string;
  label: string;
  value: string;
  source: "user_input" | "profile" | "demo_data" | "document";
}

/** Противоречие в данных (docs/prototype2.md §10). */
export interface DataConflict {
  id: string;
  field: string;
  variants: Array<{
    value: string;
    source: string;
  }>;
  /** Когда обнаружено. */
  detectedAt: string;
}
