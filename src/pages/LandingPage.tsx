import { Link } from "react-router-dom";
import { Card } from "../components/Card";

const stages = [
  {
    title: "Опишите ситуацию",
    text: "Начните с описания проблемы обычными словами. Из сообщения создаётся дело.",
  },
  {
    title: "Пройдите AI-интервью",
    text: "AI уточнит детали и превратит ответы в факты с указанием источников.",
  },
  {
    title: "Выберите способ решения",
    text: "AI покажет возможные варианты действий и объяснит основания каждого.",
  },
  {
    title: "Отслеживайте результат",
    text: "Дело показывает, кто должен действовать, какое событие ожидается и есть ли срок.",
  },
  {
    title: "Получите помощь юриста при необходимости",
    text: "Если требуется профессиональная проверка, дело передаётся юристу.",
  },
];

export function LandingPage() {
  return (
    <div className="stack">
      <section className="hero">
        <h1>Юридические дела — от проблемы до результата</h1>
        <p className="hero__subtitle">
          AI помогает разобраться в ситуации, подготовить необходимые действия и сопровождать дело. Юрист
          подключается там, где требуется профессиональная проверка.
        </p>
        <div className="btn-row">
          <Link to="/cases" className="btn btn--primary">
            Открыть прототип
          </Link>
          <Link to="/cases/new" className="btn">
            Создать новое дело
          </Link>
        </div>
        <p className="subtle">
          Демонстрационный прототип. Все данные синтетические, отправка документов является симуляцией, настоящей
          авторизации нет.
        </p>
      </section>

      <section className="section">
        <h2 className="section__title">Как это работает</h2>
        <ol className="steps">
          {stages.map((stage, index) => (
            <li key={stage.title} className="steps__item">
              <span className="steps__number">{index + 1}</span>
              <div>
                <strong>{stage.title}</strong>
                <p className="small muted" style={{ margin: 0 }}>
                  {stage.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid grid--two">
        <Card title="Что показывает прототип" tone="accent">
          <ul className="small">
            <li>Карточку дела с текущим этапом и ожидаемым событием</li>
            <li>Факты с источниками и состоянием подтверждения</li>
            <li>Объяснимые рекомендации AI с основаниями</li>
            <li>Документы в mock-просмотрщике и историю дела</li>
            <li>Передачу дела юристу и переписку с ним</li>
          </ul>
        </Card>
        <Card title="Что намеренно не сделано" tone="warning">
          <ul className="small">
            <li>Backend, база данных и настоящая авторизация</li>
            <li>Реальные LLM API, OCR и обработка документов</li>
            <li>Реальная отправка юридически значимых документов</li>
            <li>Электронная подпись и интеграции с судами</li>
            <li>Юридические расчёты и оценка судебной перспективы</li>
          </ul>
        </Card>
      </section>

      <Card title="Демонстрационные дела" meta="Открывайте их, чтобы увидеть состояние дела без прохождения сценария заново">
        <div className="btn-row">
          <Link to="/cases/LC-2026-001" className="btn">
            LC-2026-001 — возврат за неисправный товар
          </Link>
          <Link to="/cases/LC-2026-002" className="btn">
            LC-2026-002 — противоречие в данных
          </Link>
          <Link to="/cases/new" className="btn btn--primary">
            Пройти сценарий с нуля
          </Link>
        </div>
        <p className="subtle" style={{ marginTop: 12, marginBottom: 0 }}>
          Режим юриста включается переключателем роли в шапке.
        </p>
      </Card>

      <p className="subtle">
        Прототип не даёт юридических гарантий: предложения AI — это возможные варианты действий, а не заключение.
      </p>
    </div>
  );
}