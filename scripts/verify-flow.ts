import { shipmentService } from "../src/lib/shipmentService";
import { resetShipmentCounter } from "../src/data/ids";
import { defaultSenderProfile } from "../src/data/sender";
import type { ShipmentDraft } from "../src/types/domain";

let failures = 0;
let checks = 0;

function check(label: string, condition: boolean | undefined, detail?: string): void {
  const passed = Boolean(condition);
  checks += 1;
  if (!passed) {
    failures += 1;
    console.log(`FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    console.log(`ok    ${label}`);
  }
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

const draft: ShipmentDraft = {
  id: `draft-test-${Date.now()}`,
  createdAt: todayString(),
  updatedAt: todayString(),
  currentStep: 3,
  completedSteps: [0, 1, 2, 3],
  document: {
    id: "doc-test-001",
    name: "Претензия_тестовая.pdf",
    size: 120_000,
    mimeType: "application/pdf",
    pageCount: 2,
    uploadedAt: todayString(),
  },
  sender: {
    type: "ul",
    code: "CODE_TEST",
    name: "ООО «Тестовая Firma»",
    email: "test@example.com",
    organization: {
      name: "ООО «Тестовая Firma»",
      inn: "7701234567",
    },
    address: {
      postalCode: "123456",
      region: "Москва",
      city: "г. Москва",
      street: "ул. Тестовая",
      houseNumber: "1",
    },
    addressString: "123456, г. Москва, ул. Тестовая, д. 1",
  },
  recipient: {
    type: "fiz",
    countryCodeOKSM: 643,
    person: {
      firstName: "Иван",
      lastName: "Иванов",
      patronymic: "Иванович",
    },
    address: {
      postalCode: "654321",
      region: "Омская обл.",
      city: "г. Омск",
      street: "пр-кт Мира",
      houseNumber: "57",
      flat: "66",
    },
    addressString: "644077, обл. Омская, г. Омск, пр-кт Мира, д. 57, кв. 66",
  },
};

console.log("=== 1. Сервис отправлений ===");
resetShipmentCounter();
shipmentService.resetDemo();
shipmentService.initSeedData();

const shipments = shipmentService.getShipments();
check("seed-отправления созданы", shipments.length > 0, `${shipments.length}`);

const draftsBefore = shipmentService.getDrafts();
check("черновики загружены", draftsBefore.length >= 0);

const draftId = `draft-test-${Date.now()}`;
void draftId;
const createdDraft = shipmentService.createDraft(draft);
check("черновик создан с ID", createdDraft.id.startsWith("draft-"));
check("через createDraft черновик сохранён", shipmentService.getDrafts().length > draftsBefore.length);

const retrieved = shipmentService.getDraft(createdDraft.id);
check("черновик находим по ID", retrieved?.id === createdDraft.id);

console.log("\n=== 2. Демонстрационная отправка ===");
const outcome = await shipmentService.submitShipment(draft);
check("отправка возвращает результат", Boolean(outcome.data));
check("статус DELIVERED", outcome.data?.status === "DELIVERED", outcome.data?.status);
check("ШПИ сгенерирован", Boolean(outcome.data?.mailId));
check("запрос-код сгенерирован", Boolean(outcome.data?.requestCode));
check("события созданы", outcome.data?.events.length > 0, `${outcome.data?.events.length}`);
check("события имеют shipmentId", outcome.data?.events.every((e) => Boolean(e.shipmentId)));
check("помечено как демонстрация", outcome.data?.isDemo === true);
check("уведомление демонстрационное", outcome.notice?.message.includes("не отправлено"));
check("ожидаемое событие установлено", Boolean(outcome.data?.expectedEvent));

console.log("\n=== 3. Удаление отправления ===");
const toDelete = shipmentService.getShipments()[0];
if (toDelete) {
  const delOutcome = shipmentService.deleteShipment(toDelete.id);
  check("удаление прошло успешно", delOutcome.data === true);
  check("отправление удалено из списка", !shipmentService.getShipment(toDelete.id));
}

console.log("\n=== 4. Черновики ===");
const draftToDelete = createdDraft.id;
const draftDelOutcome = shipmentService.deleteDraft(draftToDelete);
check("черновик удалён", draftDelOutcome.data === true);
check("через getDraft не находится", shipmentService.getDraft(draftToDelete) === undefined);

console.log("\n=== 5. Профиль отправителя ===");
const profile = shipmentService.getSenderProfile();
check("профиль загружен", Boolean(profile.name));
const saved = shipmentService.saveSenderProfile({ ...profile, name: "Тестовое ООО" });
check("профиль сохраняется", saved.data?.name === "Тестовое ООО");
shipmentService.resetDemo();
check("после сброса профиль возвращён к дефолту", shipmentService.getSenderProfile().name === defaultSenderProfile.name);

console.log(`\nПроверок: ${checks}, ошибок: ${failures}`);
if (failures > 0) process.exit(1);
