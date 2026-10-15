let shipmentCounter = 0;

export function generateShipmentId(): string {
  shipmentCounter += 1;
  const date = new Date();
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `SP-${year}${month}${day}-${String(shipmentCounter).padStart(4, "0")}`;
}

export function generateRequestId(): string {
  const hex = crypto.randomUUID();
  return `req_${hex}`;
}

/**
 * Генерирует синтетический ШПИ (Штриховой Почтовый Идентификатор).
 * Внутрироссийский ШПИ содержит 14 цифр (docs/Pamyatka_API_otpravitelya_IS_EPS.pdf §7.2.1).
 * Формат: индекс предприятия приёма (6 цифр) + месяц печати (2 цифры) +
 * уникальный номер (5 цифр) + контрольная цифра (1 цифра).
 */
export function generateMailId(): string {
  const postalPrefix = "142117"; // синтетический индекс отправляющего отделения
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const uniqueNum = String(10000 + Math.floor(Math.random() * 90000)).slice(-5);
  const raw = `${postalPrefix}${month}${uniqueNum}`;
  const checkDigit = computeCheckDigit(raw);
  return `${raw}${checkDigit}`;
}

/** Вычисление контрольной цифры ШПИ по алгоритму ИС ЭПС (пункт 7.2.1). */
function computeCheckDigit(barcode: string): string {
  let sumOdd = 0;
  let sumEven = 0;
  for (let i = 0; i < barcode.length; i++) {
    const digit = parseInt(barcode[i], 10);
    if (i % 2 === 0) {
      sumOdd += digit;
    } else {
      sumEven += digit;
    }
  }
  const total = sumOdd * 3 + sumEven;
  const remainder = total % 10;
  return remainder === 0 ? "0" : String(10 - remainder);
}

export function resetShipmentCounter(): void {
  shipmentCounter = 0;
}
