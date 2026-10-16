import { wizardStepLabels } from "../../types/labels";

interface WizardStepperProps {
  steps: number;
  currentStep: number;
  completedSteps: number[];
}

/**
 * Визуальная временная шкала шагов мастера создания отправления.
 * docs/prototype2.md §7.
 */
export function WizardStepper({ steps, currentStep, completedSteps }: WizardStepperProps) {
  return (
    <nav className="stepper" aria-label="Этапы создания отправления">
      <ol className="stepper__list">
        {Array.from({ length: steps }).map((_, index) => {
          const isCompleted = completedSteps.includes(index);
          const isCurrent = index === currentStep;
          const label = wizardStepLabels[index] ?? `Шаг ${index + 1}`;
          const statusClass = isCurrent
            ? "stepper__step--current"
            : isCompleted
              ? "stepper__step--done"
              : "";

          return (
            <li key={index} className={`stepper__step ${statusClass}`}>
              <div className={`stepper__marker ${isCurrent ? "stepper__marker--active" : ""}`}>
                {index + 1}
              </div>
              <span className="stepper__label">{label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
