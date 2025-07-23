interface StepperProps {
  currentStep: number;
  totalSteps: number;
}

export function Stepper({ currentStep, totalSteps }: StepperProps) {
  return (
    <div
      className="flex flex-col items-end gap-2 p-3"
      role="progressbar"
      aria-label="Onboarding progress"
      aria-valuenow={currentStep}
      aria-valuemin={0}
      aria-valuemax={totalSteps}
    >
      <div className="flex h-1 w-[100px] gap-1">
        {Array.from({ length: totalSteps }).map((_, idx) => (
          <div
            key={idx}
            className={`h-1 flex-1 rounded-full transition-colors ${
              idx < currentStep ? 'bg-foreground-950' : 'bg-foreground-950/10'
            }`}
          />
        ))}
      </div>
      <span className="text-foreground-600 text-xs font-medium leading-4">
        {currentStep}/{totalSteps}
      </span>
    </div>
  );
}
