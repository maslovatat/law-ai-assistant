/**
 * Демонстрационные часы прототипа. Даты в прототипе не привязаны к реальному времени,
 * чтобы сценарий показывался одинаково при любом запуске.
 */

const MS_PER_DAY = 86_400_000;

export interface DemoDate {
  /** ISO-формат YYYY-MM-DD. */
  iso: string;
  /** Отображение DD.MM.YYYY. */
  display: string;
}

export const DEMO_START_DATE = "2026-10-05";

export function formatDisplayDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

export function formatShortDate(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${day}.${month}`;
}

export function toDemoDate(iso: string): DemoDate {
  return { iso, display: formatDisplayDate(iso) };
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setTime(date.getTime() + days * MS_PER_DAY);
  return date.toISOString().slice(0, 10);
}

export function isBefore(a: string, b: string): boolean {
  return a < b;
}

/** Дни до срока; отрицательное значение означает, что срок истёк. */
export function daysUntil(deadlineIso: string, todayIso: string): number {
  const deadline = new Date(`${deadlineIso}T00:00:00Z`).getTime();
  const today = new Date(`${todayIso}T00:00:00Z`).getTime();
  return Math.round((deadline - today) / MS_PER_DAY);
}