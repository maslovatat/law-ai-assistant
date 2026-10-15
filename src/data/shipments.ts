import type { Shipment, ShipmentDraft } from "../types/domain";
import { formatDisplayDate } from "../lib/mock/clock";
import { generateMailId, generateRequestId, generateShipmentId } from "./ids";

/**
 * Синтетические демонстрационные отправления (docs/prototype2.md §15).
 * Все данные — вымышленные; ни ФИО, ни адреса, ни ШПИ не соответствуют реальным.
 */
export function createSeedShipments(): Shipment[] {
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = formatDisplayDate(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const todayDisplay = formatDisplayDate(today);

  const shipments: Shipment[] = [
    // 1. Демонстрационное отправление в пути
    {
      id: generateShipmentId(),
      requestCode: generateRequestId(),
      mailId: generateMailId(),
      sender: {
        type: "ul",
        code: "CODE_55",
        name: "ООО «Юридическая Фирма «Защита Прав»»",
        email: "claims@ur-firm-zashchita.ru",
        addressString: "125009, г. Москва, ул. Тверская, д. 7",
        organization: {
          name: "ООО «Юридическая Фирма «Защита Прав»»",
          inn: "7700000001",
        },
      },
      recipient: {
        type: "fiz",
        countryCodeOKSM: 643,
        addressString: "644077, Омская обл., г. Омск, пр. Мира, д. 57, кв. 66",
        person: {
          firstName: "Кирилл",
          lastName: "Кузнецов",
          patronymic: "Викторович",
        },
      },
      document: {
        id: "doc-001",
        name: "Претензия_о_неисправности_товара.pdf",
        size: 352_000,
        mimeType: "application/pdf",
        pageCount: 3,
        uploadedAt: sevenDaysAgo,
      },
      status: "IN_TRANSIT",
      apiStatus: "IN_PROGRESS",
      apiSubStatus: "DELIVERY",
      createdAt: sevenDaysAgo,
      updatedAt: todayDisplay,
      isDemo: true,
      expectedEvent: {
        id: "ev-exp-001",
        title: "Подтверждение доставки получателем",
        description: "Ожидается подпись получателя или подтверждение онлайн-доставки.",
        responsible: "recipient",
        deadline: "25.10.2026",
      },
      events: [
        {
          id: generateShipmentId(),
          shipmentId: "",
          type: "document_added",
          title: "Документ добавлен",
          description: "Файл «Претензия_о_неисправности_товара.pdf» загружен.",
          date: sevenDaysAgo,
          timestamp: `${sevenDaysAgo}T10:00:00`,
          initiator: "user",
          isDemo: true,
        },
        {
          id: generateShipmentId(),
          shipmentId: "",
          type: "sender_filled",
          title: "Отправитель и получатель заполнены",
          date: sevenDaysAgo,
          timestamp: `${sevenDaysAgo}T10:05:00`,
          initiator: "user",
          isDemo: true,
        },
        {
          id: generateShipmentId(),
          shipmentId: "",
          type: "shipment_verified",
          title: "Отправление проверено",
          date: sevenDaysAgo,
          timestamp: `${sevenDaysAgo}T10:10:00`,
          initiator: "system",
          isDemo: true,
        },
        {
          id: generateShipmentId(),
          shipmentId: "",
          type: "shipment_sent",
          title: "Демонстрационная операция завершена",
          description: "Демонстрационный режим. Письмо не отправлено.",
          date: sevenDaysAgo,
          timestamp: `${sevenDaysAgo}T10:15:00`,
          initiator: "system",
          isDemo: true,
        },
        {
          id: generateShipmentId(),
          shipmentId: "",
          type: "accepted_by_system",
          title: "Принято системой",
          description: "Демонстрационный статус: запрос принят в обработку.",
          date: sevenDaysAgo,
          timestamp: `${sevenDaysAgo}T10:16:00`,
          initiator: "system",
          isDemo: true,
        },
        {
          id: generateShipmentId(),
          shipmentId: "",
          type: "in_transit",
          title: "В пути",
          description: "Демонстрационный статус доставки.",
          date: sevenDaysAgo,
          timestamp: `${sevenDaysAgo}T10:20:00`,
          initiator: "system",
          isDemo: true,
        },
      ],
      mailRank: 4,
      shipmentType: "REGISTERED",
    },

    // 2. Демонстрационное отправление Вручено
    {
      id: generateShipmentId(),
      requestCode: generateRequestId(),
      mailId: generateMailId(),
      sender: {
        type: "ul",
        code: "CODE_55",
        name: "ООО «Юридическая Фирма «Защита Прав»»",
        email: "claims@ur-firm-zashchita.ru",
        addressString: "125009, г. Москва, ул. Тверская, д. 7",
        organization: {
          name: "ООО «Юридическая Фирма «Защита Прав»»",
          inn: "7700000001",
        },
      },
      recipient: {
        type: "ul",
        countryCodeOKSM: 643,
        addressString: "622001, Свердловская обл., г. Нижний Тагил, ул. Красноармейская, д. 42",
        organization: {
          name: "ООО «Оплата-Сервис»",
          inn: "7700000051",
        },
      },
      document: {
        id: "doc-002",
        name: "Досудебная_претензия_по_аренде.pdf",
        size: 280_000,
        mimeType: "application/pdf",
        pageCount: 2,
        uploadedAt: "2026.09.20",
      },
      status: "DELIVERED",
      apiStatus: "ONLINE_DELIVERED",
      createdAt: "2026.09.20",
      updatedAt: "2026.09.25",
      isDemo: true,
      events: [
        {
          type: "document_added",
          title: "Документ добавлен",
          description: "Файл «Досудебная_претензия_по_аренде.pdf» загружен.",
          date: "2026.09.20",
          timestamp: "2026-09-20T14:00:00",
          initiator: "user",
          isDemo: true,
          id: generateShipmentId(),
          shipmentId: "",
        },
        {
          type: "sender_filled",
          title: "Отправитель и получатель заполнены",
          date: "2026.09.20",
          timestamp: "2026-09-20T14:05:00",
          initiator: "user",
          isDemo: true,
          id: generateShipmentId(),
          shipmentId: "",
        },
        {
          type: "shipment_verified",
          title: "Отправление проверено",
          date: "2026.09.20",
          timestamp: "2026-09-20T14:10:00",
          initiator: "system",
          isDemo: true,
          id: generateShipmentId(),
          shipmentId: "",
        },
        {
          type: "shipment_sent",
          title: "Демонстрационная операция завершена",
          description: "Демонстрационный режим. Письмо не отправлено.",
          date: "2026.09.21",
          timestamp: "2026-09-21T09:00:00",
          initiator: "system",
          isDemo: true,
          id: generateShipmentId(),
          shipmentId: "",
        },
        {
          type: "accepted_by_system",
          title: "Принято системой",
          description: "Демонстрационный статус: запрос принят в обработку.",
          date: "2026.09.21",
          timestamp: "2026-09-21T09:01:00",
          initiator: "system",
          isDemo: true,
          id: generateShipmentId(),
          shipmentId: "",
        },
        {
          type: "in_transit",
          title: "В пути",
          description: "Демонстрационный статус доставки.",
          date: "2026.09.22",
          timestamp: "2026-09-22T10:00:00",
          initiator: "system",
          isDemo: true,
          id: generateShipmentId(),
          shipmentId: "",
        },
        {
          type: "delivered",
          title: "Вручено",
          description: "Демонстрационный статус: письмо доставлено получателю.",
          date: "2026.09.25",
          timestamp: "2026-09-25T11:30:00",
          initiator: "post",
          isDemo: true,
          id: generateShipmentId(),
          shipmentId: "",
        },
      ],
      mailRank: 4,
      shipmentType: "REGISTERED",
    },

    // 3. Подготовленное отправление (черновик, но почти готово)
    {
      id: generateShipmentId(),
      requestCode: generateRequestId(),
      sender: {
        type: "ul",
        code: "CODE_55",
        name: "ООО «Юридическая Фирма «Защита Прав»»",
        email: "claims@ur-firm-zashchita.ru",
        addressString: "125009, г. Москва, ул. Тверская, д. 7",
        organization: {
          name: "ООО «Юридическая Фирма «Защита Прав»»",
          inn: "7700000001",
        },
      },
      recipient: {
        type: "fiz",
        countryCodeOKSM: 643,
        addressString: "644077, Российская Федерация, обл Омская, г Омск, пр-кт Мира, д. 57, кв. 66",
        person: {
          firstName: "Игорь",
          lastName: "Николаев",
          patronymic: "Юрьевич",
        },
      },
      document: {
        id: "doc-003",
        name: "Претензия_по_качеству_услуг.pdf",
        size: 180_000,
        mimeType: "application/pdf",
        pageCount: 1,
        uploadedAt: "2026.10.03",
      },
      status: "PREPARED",
      createdAt: "2026.10.03",
      updatedAt: "2026.10.04",
      isDemo: false,
      events: [],
      mailRank: 8,
      shipmentType: "REGISTERED",
    },

    // 4. Отправление, требующее внимания
    {
      id: generateShipmentId(),
      requestCode: generateRequestId(),
      mailId: generateMailId(),
      sender: {
        type: "fiz",
        code: "CODE_99",
        name: "Сидорова Анна Петровна",
        email: "anna.sidorova@example.com",
        addressString: "121059, г. Москва, ул. Тверская, д. 10",
        individual: {
          firstName: "Анна",
          lastName: "Сидорова",
          patronymic: "Петровна",
        },
      },
      recipient: {
        type: "fiz",
        countryCodeOKSM: 643,
        addressString: "101000, г. Москва, ул. Тверская, д. 10",
        person: {
          firstName: "Петр",
          lastName: "Иванов",
          patronymic: "Сергеевич",
        },
      },
      document: {
        id: "doc-004",
        name: "Претензия_о_браке_смартфона.pdf",
        size: 450_000,
        mimeType: "application/pdf",
        pageCount: 4,
        uploadedAt: "2026.10.01",
      },
      status: "REQUIRES_ATTENTION",
      apiStatus: "FAILED",
      createdAt: "2026.10.01",
      updatedAt: "2026.10.01",
      isDemo: true,
      events: [
        {
          type: "document_added",
          title: "Документ добавлен",
          date: "2026.10.01",
          timestamp: "2026-10-01T12:00:00",
          initiator: "user",
          isDemo: true,
          id: generateShipmentId(),
          shipmentId: "",
        },
        {
          type: "sender_filled",
          title: "Отправитель и получатель заполнены",
          date: "2026.10.01",
          timestamp: "2026-10-01T12:05:00",
          initiator: "user",
          isDemo: true,
          id: generateShipmentId(),
          shipmentId: "",
        },
        {
          type: "shipment_verified",
          title: "Отправление проверено",
          date: "2026.10.01",
          timestamp: "2026-10-01T12:10:00",
          initiator: "system",
          isDemo: true,
          id: generateShipmentId(),
          shipmentId: "",
        },
        {
          type: "shipment_sent",
          title: "Демонстрационная операция завершена",
          description: "Демонстрационный режим. Письмо не отправлено.",
          date: "2026.10.01",
          timestamp: "2026-10-01T12:15:00",
          initiator: "system",
          isDemo: true,
          id: generateShipmentId(),
          shipmentId: "",
        },
        {
          type: "attention_required",
          title: "Требует внимания",
          description: "Демонстрационная ошибка: индекс получателя не найден в ФИАС. Проверьте почтовый индекс.",
          date: "2026.10.01",
          timestamp: "2026-10-01T12:16:00",
          initiator: "system",
          isDemo: true,
          id: generateShipmentId(),
          shipmentId: "",
        },
      ],
      mailRank: 8,
      shipmentType: "REGISTERED",
      expectedEvent: {
        id: "ev-exp-004",
        title: "Исправить данные получателя",
        description: "Почтовый индекс 101000 не прошёл проверку. Уточните адрес.",
        responsible: "user",
      },
    },
  ];

  // Link events to their shipments
  for (const shipment of shipments) {
    for (const event of shipment.events) {
      event.shipmentId = shipment.id;
    }
  }

  return shipments;
}

/** Синтетические черновики для демонстрации страницы черновиков. */
export function createSeedDrafts(): ShipmentDraft[] {
  const now = new Date().toISOString().slice(0, 10);
  const nowDisplay = formatDisplayDate(now);
  const twoDaysAgo = formatDisplayDate(
    new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );

  return [
    {
      id: "draft-001",
      createdAt: "2026.09.28",
      updatedAt: nowDisplay,
      currentStep: 1,
      completedSteps: [0, 1],
      document: {
        id: "doc-draft-001",
        name: "Претензия_о_гарантии.pdf",
        size: 220_000,
        mimeType: "application/pdf",
        pageCount: 2,
        uploadedAt: "2026.09.28",
      },
      sender: {
        type: "ul",
        code: "CODE_55",
        name: "ООО «Юридическая Фирма «Защита Прав»»",
        email: "claims@ur-firm-zashchita.ru",
        addressString: "125009, г. Москва, ул. Тверская, д. 7",
        organization: {
          name: "ООО «Юридическая Фирма «Защита Прав»»",
          inn: "7700000001",
        },
      },
      recipient: {
        type: "fiz",
        countryCodeOKSM: 643,
        addressString: "644077, Омская обл., г. Омск, пр. Мира, д. 57, кв. 66",
        person: {
          firstName: "Кирилл",
          lastName: "Кузнецов",
          patronymic: "Викторович",
        },
      },
    },
    {
      id: "draft-002",
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
      currentStep: 0,
      completedSteps: [],
      document: {
        id: "doc-draft-002",
        name: "Заявление_о_возврате.pdf",
        size: 150_000,
        mimeType: "application/pdf",
        pageCount: 1,
        uploadedAt: twoDaysAgo,
      },
    },
  ];
}
