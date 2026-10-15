import type { ShipmentStatus, ApiStatus, MailRank, ShipmentType } from "./domain";

/** Семантический тон состояния: используется вместе с текстом, а не вместо него (§24). */
export type Tone = "neutral" | "progress" | "attention" | "danger" | "success" | "demo" | "ai";

/** Метки статусов отправления. */
export const shipmentStatusLabels: Record<ShipmentStatus, string> = {
  DRAFT: "Черновик",
  PREPARED: "Подготовлено",
  SENDING: "Отправляется (демонстрация)",
  ACCEPTED: "Принято системой",
  IN_TRANSIT: "В пути",
  DELIVERED: "Вручено",
  REQUIRES_ATTENTION: "Требует внимания",
};

/** Тональность статусов отправления. */
export const shipmentStatusTone: Record<ShipmentStatus, Tone> = {
  DRAFT: "neutral",
  PREPARED: "progress",
  SENDING: "progress",
  ACCEPTED: "progress",
  IN_TRANSIT: "progress",
  DELIVERED: "success",
  REQUIRES_ATTENTION: "attention",
};

/** Метки статусов из API ИС ЭПС (для справки). */
export const apiStatusLabels: Record<ApiStatus, string> = {
  UNKNOWN: "Неизвестно",
  ACCEPTED: "Принято в обработку",
  IN_PROGRESS: "В процессе обработки",
  ONLINE_DELIVERED: "Доставлено в электронном виде",
  DELIVERED_TO_PRINT: "Направлено на печать",
  FAILED: "Ошибка обработки",
};

/** Метки кодов разряда почтового отправления (из API). */
export const mailRankLabels: Record<MailRank, string> = {
  4: "Судебное",
  8: "Административное",
  0: "Другие",
};

/** Метки типов отправления (из API). */
export const shipmentTypeLabels: Record<ShipmentType, string> = {
  REGULAR: "Простое письмо",
  REGISTERED: "Заказное письмо",
};

/** Метки этапов мастера создания отправления. */
export const wizardStepLabels: Record<number, string> = {
  0: "Документ",
  1: "Отправитель и получатель",
  2: "Проверка",
  3: "Отправка",
};

/** Полные заголовки шагов мастера. */
export const wizardStepTitles: Record<number, string> = {
  0: "Загрузите готовую претензию",
  1: "Укажите отправителя и получателя",
  2: "Проверьте данные и состав отправления",
  3: "Демонстрационная отправка",
};

/** Метки для AI рекомендаций на этапе проверки. */
export const aiRecommendationLabels = {
  valid: "Данные корректны",
  missingSender: "Заполните данные отправителя",
  missingRecipient: "Заполните данные получателя",
  invalidPostalCode: "Проверьте почтовый индекс",
  missingDocument: "Не загружен документ",
};

/** Уведомление о демонстрационном режиме. */
export const demoNoticeText =
  "Демонстрационный режим. Реальная отправка через ИС ЭПС Почты России не выполняется. " +
  "Все данные синтетические.";

export const mockDisclaimer = "Демонстрационный режим. Письмо не отправлено.";
