import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="stack">
      <h1>Страница не найдена</h1>
      <p className="muted">Проверьте адрес или вернитесь к списку дел.</p>
      <div className="btn-row">
        <Link to="/" className="btn btn--primary">
          На главную
        </Link>
        <Link to="/cases" className="btn">
          Мои дела
        </Link>
      </div>
    </div>
  );
}