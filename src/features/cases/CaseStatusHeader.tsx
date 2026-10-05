import type { Case } from "../../types/domain";
import { flagLabels, flagMarkers, flagTone, stageLabels, stageProgressLabels, stageProgressOrder, stageTone } from "../../types/labels";
import { Badge } from "../../components/Button";
import { getStageProgress } from "../../lib/workflow";

/** Где я сейчас: этап дела и дополнительные признаки состояния. */
export function CaseStatusHeader({ caseItem }: { caseItem: Case }) {
  const { index, total } = getStageProgress(caseItem);
  const percent = total === 0 ? 0 : Math.round((index / total) * 100);

  return (
    <section className="case-status">
      <div className="case-status__labels">
        <span className="case-status__caption">Текущий этап дела</span>
        <div className="case-status__stage">
          <Badge tone={stageTone[caseItem.stage]} marker="●">
            {stageLabels[caseItem.stage]}
          </Badge>
          {caseItem.flags.map((flag) => (
            <Badge key={flag} tone={flagTone[flag]} marker={flagMarkers[flag]}>
              {flagLabels[flag]}
            </Badge>
          ))}
        </div>
      </div>

      <ol className="stage-track" aria-label="Этапы дела">
        {stageProgressOrder.map((stage, position) => {
          const reached = position <= index;
          const current = position === index;
          return (
            <li
              key={stage}
              className={`stage-track__step ${reached ? "stage-track__step--done" : ""} ${
                current ? "stage-track__step--current" : ""
              }`}
            >
              <span className="stage-track__dot" aria-hidden="true" />
              <span className="stage-track__label">{stageProgressLabels[stage]}</span>
            </li>
          );
        })}
      </ol>

      <div className="progress-track" aria-hidden="true">
        <div className="progress-track__fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="subtle">
        Этап {index + 1} из {total + 1}. Дополнительные признаки не заменяют основной этап, а уточняют его.
      </p>
    </section>
  );
}