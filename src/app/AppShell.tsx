import type { ReactNode } from "react";
import { NavLink, Link } from "react-router-dom";
import { useStore } from "./CaseStore";
import { mockNotice } from "../types/labels";

export function AppShell({ children }: { children: ReactNode }) {
  const { state, dispatch } = useStore();
  const isLawyer = state.role === "lawyer";

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <Link to="/" className="app-brand">
            <span className="app-brand__name">Сопровождение юридических дел</span>
            <span className="app-brand__mode">Демонстрационный прототип</span>
          </Link>

          <nav className="app-nav" aria-label="Основная навигация">
            {isLawyer ? (
              <>
                <NavLink
                  to="/lawyer/queue"
                  className={({ isActive }) =>
                    `app-nav__link ${isActive ? "app-nav__link--active" : ""}`
                  }
                >
                  Очередь дел
                </NavLink>
                <NavLink
                  to="/lawyer/cases/LC-2026-001"
                  className={({ isActive }) =>
                    `app-nav__link ${isActive ? "app-nav__link--active" : ""}`
                  }
                >
                  Дело LC-2026-001
                </NavLink>
              </>
            ) : (
              <>
                <NavLink
                  to="/cases"
                  className={({ isActive }) =>
                    `app-nav__link ${isActive ? "app-nav__link--active" : ""}`
                  }
                >
                  Мои дела
                </NavLink>
                <NavLink
                  to="/cases/new"
                  className={({ isActive }) =>
                    `app-nav__link ${isActive ? "app-nav__link--active" : ""}`
                  }
                >
                  Новое дело
                </NavLink>
              </>
            )}
          </nav>

          <div className="row">
            <label className="field__label" htmlFor="role-switcher">
              Роль
            </label>
            <select
              id="role-switcher"
              className="select"
              style={{ width: "auto" }}
              value={state.role}
              onChange={(event) => dispatch({ type: "setRole", role: event.target.value as "user" | "lawyer" })}
            >
              <option value="user">Пользователь</option>
              <option value="lawyer">Юрист</option>
            </select>
            <button type="button" className="btn btn--sm" onClick={() => dispatch({ type: "resetDemo" })}>
              Сбросить демо
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">{children}</main>

      <footer className="app-footer">
        <div className="app-footer__inner">
          <span>{mockNotice}</span>
          <span>
            Режим: {isLawyer ? "Кабинет юриста" : "Пользователь"}. Настоящей авторизации нет — роль переключается в
            демонстрационных целях.
          </span>
        </div>
      </footer>
    </div>
  );
}