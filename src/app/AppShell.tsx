import type { ReactNode } from "react";
import { NavLink, Link } from "react-router-dom";
import { useStore } from "./ShipmentStore";
import { demoNoticeText, mockDisclaimer } from "../types/labels";

export function AppShell({ children }: { children: ReactNode }) {
  const { state, dispatch } = useStore();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <Link to="/" className="app-brand">
            <span className="app-brand__name">Досудебные претензии через Почту России</span>
            <span className="app-brand__mode">Демонстрационный прототип</span>
          </Link>

          <nav className="app-nav" aria-label="Основная навигация">
            <NavLink to="/" className={({ isActive }) => `app-nav__link ${isActive ? "app-nav__link--active" : ""}`}>
              Главная
            </NavLink>
            <NavLink to="/create" className={({ isActive }) => `app-nav__link ${isActive ? "app-nav__link--active" : ""}`}>
              Новая отправка
            </NavLink>
            <NavLink to="/shipments" className={({ isActive }) => `app-nav__link ${isActive ? "app-nav__link--active" : ""}`}>
              Отправления
            </NavLink>
            <NavLink to="/drafts" className={({ isActive }) => `app-nav__link ${isActive ? "app-nav__link--active" : ""}`}>
              Черновики
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => `app-nav__link ${isActive ? "app-nav__link--active" : ""}`}>
              Профиль
            </NavLink>
          </nav>

          <button type="button" className="btn btn--sm" onClick={() => dispatch({ type: "resetDemo" })}>
            Сбросить демо
          </button>
        </div>
      </header>

      <main className="app-main">
        {state.notice ? (
          <div className="notice" role="status">
            <span className="notice__marker">i</span>
            <div>
              <strong>{state.notice.title}</strong>
              <br />
              {state.notice.message}
            </div>
            <button
              type="button"
              className="notice__close"
              onClick={() => dispatch({ type: "dismissNotice" })}
              aria-label="Закрыть уведомление"
            />
          </div>
        ) : null}

        {children}
      </main>

      <footer className="app-footer">
        <div className="app-footer__inner">
          <span>{demoNoticeText}</span>
          <span>{mockDisclaimer}</span>
        </div>
      </footer>
    </div>
  );
}
