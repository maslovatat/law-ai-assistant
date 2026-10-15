/** Утилиты для работы с данными прототипа. */

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export function formatFileSize(bytes: number): string {
  return formatBytes(bytes);
}

/** Сокращает строку до указанной длины с добавлением "..." */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/** Форматирует почтовый индекс и адрес в читаемый вид. */
export function formatAddressLine(address: {
  postalCode?: string;
  region?: string;
  city?: string;
  street?: string;
  houseNumber?: string;
  corpus?: string;
  flat?: string;
}): string {
  const parts: string[] = [];
  if (address.postalCode) parts.push(address.postalCode);
  if (address.region) parts.push(`${address.region} обл.`);
  if (address.city) parts.push(`г. ${address.city}`);
  if (address.street) {
    let streetPart = `ул. ${address.street}`;
    if (address.houseNumber) streetPart += `, д. ${address.houseNumber}`;
    if (address.corpus) streetPart += `, корп. ${address.corpus}`;
    if (address.flat) streetPart += `, кв. ${address.flat}`;
    parts.push(streetPart);
  }
  return parts.join(", ");
}

/** Проверяет, является ли строка почтовым индексом РФ (6 цифр). */
export function isValidPostalCode(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}

/** Проверяет, является ли строка ИНН (10 или 12 цифр). */
export function isValidInn(value: string): boolean {
  return /^\d{10}$|^\d{12}$/.test(value.trim());
}

/** Проверяет, является ли строка адресом электронной почты. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
