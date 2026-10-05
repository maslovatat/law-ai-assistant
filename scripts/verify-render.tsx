import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { Route, Routes, StaticRouter } from "react-router";
import { StoreProvider } from "../src/app/CaseStore";
import { AppShell } from "../src/app/AppShell";
import { LandingPage } from "../src/pages/LandingPage";
import { UserCasesPage } from "../src/pages/UserCasesPage";
import { NewCasePage } from "../src/pages/NewCasePage";
import { UserCasePage } from "../src/pages/UserCasePage";
import { LawyerQueuePage } from "../src/pages/LawyerQueuePage";
import { LawyerCasePage } from "../src/pages/LawyerCasePage";
import { NotFoundPage } from "../src/pages/NotFoundPage";
import { Notice } from "../src/components/Notice";
import { Card } from "../src/components/Card";
import { Button } from "../src/components/Button";
import { Dialog } from "../src/components/Dialog";
import { Tabs } from "../src/components/Tabs";
import { KeyValueList } from "../src/components/KeyValueList";
import { PrototypeNotice, MockSimulationNotice } from "../src/components/PrototypeNotice";

/**
 * Дымовой тест рендеринга: проверяет, что все страницы и компоненты
 * отображаются без ошибок. Запуск: npm run test:render
 */

const routes = [
  {
    path: "/",
    element: LandingPage,
    markers: ["Юридические дела — от проблемы до результата", "Открыть прототип", "Опишите ситуацию"],
  },
  {
    path: "/cases",
    element: UserCasesPage,
    markers: ["Мои дела", "LC-2026-001", "LC-2026-002", "Противоречие в данных о покупке"],
  },
  {
    path: "/cases/new",
    element: NewCasePage,
    markers: ["Опишите, что произошло", "Создать дело и начать интервью"],
  },
  {
    path: "/cases/:caseId",
    element: UserCasePage,
    params: { caseId: "LC-2026-001" },
    markers: ["Проверка юристом", "Что ожидается сейчас", "Что мы узнали", "Документы дела", "Проверка"],
  },
  {
    path: "/cases/:caseId",
    element: UserCasePage,
    params: { caseId: "LC-2026-002" },
    markers: ["Обнаружено противоречие", "Чек (копия).pdf", "Уточнить дату покупки", "10.08.2026", "12.08.2026"],
  },
  {
    path: "/lawyer/queue",
    element: LawyerQueuePage,
    markers: ["Кабинет юриста", "Очередь", "Открыть дело"],
  },
  {
    path: "/lawyer/cases/:caseId",
    element: LawyerCasePage,
    params: { caseId: "LC-2026-001" },
    markers: [
      "Краткое описание",
      "Что было сделано по делу",
      "История дела",
      "Почему дело передано",
      "Предложение AI и решение юриста",
      "Действия юриста",
      "Проверка",
      "Общение",
    ],
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
          StoreProvider,
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
  ["Dialog", Dialog, { open: true, title: "Диалог", confirmLabel: "ОК", onConfirm: () => {}, onCancel: () => {} }, "Содержимое"],
  ["Tabs", Tabs, { items: [{ id: "a", label: "A" }], active: "a", onChange: () => {} }, undefined],
  ["KeyValueList", KeyValueList, { rows: [{ label: "Ключ", value: "Значение" }] }, undefined],
  ["PrototypeNotice", PrototypeNotice, {}, undefined],
  ["MockSimulationNotice", MockSimulationNotice, {}, undefined],
];

for (const [name, Component, props, children] of components) {
  try {
    renderToString(
      createElement(StoreProvider, null, createElement(Component as never, props as never, children as never)),
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