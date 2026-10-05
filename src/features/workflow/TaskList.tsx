import type { Case } from "../../types/domain";
import { taskStatusLabels, taskStatusTone, actorLabels } from "../../types/labels";
import { Badge } from "../../components/Button";

/** Задачи дела: кто ответственный, к какому сроку, в каком статусе. */
export function TaskList({ caseItem }: { caseItem: Case }) {
  if (caseItem.tasks.length === 0) {
    return <p className="empty">Задач по делу пока нет.</p>;
  }

  return (
    <ul className="task-list">
      {caseItem.tasks.map((task) => (
        <li key={task.id} className="task-list__item">
          <div className="task-list__head">
            <strong>{task.title}</strong>
            <Badge tone={taskStatusTone[task.status]} marker={task.status === "done" ? "✓" : "☐"}>
              {taskStatusLabels[task.status]}
            </Badge>
          </div>
          {task.description ? <p className="small muted">{task.description}</p> : null}
          <div className="task-list__meta subtle">
            Ответственный: {actorLabels[task.assignee]}
            {task.dueDate ? ` · срок: ${task.dueDate}` : ""}
            {task.completedAt ? ` · выполнено: ${task.completedAt}` : ""}
          </div>
          {task.result ? <p className="small">Результат: {task.result}</p> : null}
        </li>
      ))}
    </ul>
  );
}