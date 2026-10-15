import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { Route, Routes, StaticRouter } from "react-router-dom";
import { ShipmentStoreProvider } from "../src/app/ShipmentStore";
import { AppShell } from "../src/app/AppShell";
import { DashboardPage } from "../src/pages/DashboardPage";
import { CreateShipmentPage } from "../src/pages/CreateShipmentPage";
import { ShipmentsPage } from "../src/pages/ShipmentsPage";
import { ShipmentDetailsPage } from "../src/pages/ShipmentDetailsPage";
import { DraftsPage } from "../src/pages/DraftsPage";
import { ProfilePage } from "../src/pages/ProfilePage";
import { NotFoundPage } from "../src/pages/NotFoundPage";
import { Notice } from "../src/components/Notice";
import { Card } from "../src/components/Card";
import { Button } from "../src/components/Button";
import { ConfirmDialog } from "../src/components/shipment/ConfirmDialog";
import { StatusBadge } from "../src/components/shipment/StatusBadge";
import { ShipmentTimeline } from "../src/components/shipment/ShipmentTimeline";
import { EmptyState } from "../src/components/shipment/EmptyState";
import { PrototypeNotice } from "../src/components/shipment/PrototypeNotice";
import { KeyValueList } from "../src/components/KeyValueList";

/**
 * Дымовой тест рендеринга: проверяет, что все страницы и компоненты
 * отображаются без ошибок. Запуск: npm run test:render
 */

type RouteDef = {
  path: string;
  element: any;
  markers?: string[];
  params?: Record<string, string>;
};

const routes: RouteDef[] = [
  {
    path: "/",
    element: DashboardPage,
    markers: ["Досудебные претензии через Почту России", "Отправить претензию", "Мои черновики"],
  },
  {
    path: "/create",
    element: CreateShipmentPage,
    markers: ["Новое отправление", "Загрузите PDF", "Документ", "Отправитель и получатель", "Отправка"],
  },
  {
    path: "/shipments",
    element: ShipmentsPage,
    markers: ["Отправления", "Создать отправление"],
  },
  {
    path: "/shipments/new",
    element: ShipmentDetailsPage,
    markers: ["Отправление не найдено"],
  },
  {
    path: "/drafts",
    element: DraftsPage,
    markers: ["Черновики"],
  },
  {
    path: "/profile",
    element: ProfilePage,
    markers: ["Профиль отправителя", "Сохранить"],
  },
  { path: "/unknown", element: NotFoundPage, markers: ["Страница не найдена"] },
];

let failures = 0;

for (const route of routes) {
  const path = route.params
    ? Object.entries(route.params).reduce(
        (acc, [key, value]) => acc.replace(`:${key}`, value),
        route.path,
      )
    : route.path;
  try {
    const Page = route.element;
    const html = renderToString(
      createElement(
        StaticRouter,
        { location: path } as never,
        createElement(
          ShipmentStoreProvider,
          null,
          createElement(
            AppShell,
            null,
            createElement(
              Routes,
              null,
              createElement(Route, {
                key: "route",
                path: route.path,
                element: createElement(Page as never, (route.params ?? {}) as never),
              }),
            ),
          ),
        ),
      ),
    );
    const size = html.length;
    for (const marker of route.markers ?? []) {
      if (!html.includes(marker)) {
        failures += 1;
        console.log(`FAIL  ${path}: не найден ожидаемый фрагмент «${marker}»`);
      }
    }
    console.log(`ok    ${path.padEnd(34)} ${route.element.name} (${size} символов)`);
    if (size < 500) {
      failures += 1;
      console.log(`FAIL  ${path}: подозрительно мало разметки`);
    }
  } catch (error) {
    failures += 1;
    console.log(`FAIL  ${path} — ${(error as Error).message}`);
  }
}

const components = [
  ["Notice", Notice, { tone: "attention" as const, title: "Проверка" }, "Уведомление"],
  ["Card", Card, { title: "Карточка" }, "Содержимое"],
  ["Button", Button, { children: "Кнопка" }, undefined],
  ["ConfirmDialog", ConfirmDialog, { open: true, title: "Диалог", confirmLabel: "ОК", onConfirm: () => {}, onCancel: () => {} }, "Содержимое"],
  ["StatusBadge", StatusBadge, { status: "DELIVERED" }, undefined],
  ["ShipmentTimeline", ShipmentTimeline, { events: [] }, undefined],
  ["EmptyState", EmptyState, { title: "Пусто" }, undefined],
  ["PrototypeNotice", PrototypeNotice, { variant: "inline" }, undefined],
  ["KeyValueList", KeyValueList, { rows: [{ label: "Ключ", value: "Значение" }] }, undefined],
];

for (const [name, Component, props, children] of components) {
  try {
    renderToString(
      createElement(ShipmentStoreProvider, null, createElement(Component as never, props as never, children as never)),
    );
    console.log(`ok    компонент ${name}`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL  компонент ${name} — ${(error as Error).message}`);
  }
}

if (failures > 0) {
  console.log(`\nОшибок рендеринга: ${failures}`);
  process.exit(1);
}
console.log("\nВсе страницы и компоненты отрисованы без ошибок.");
