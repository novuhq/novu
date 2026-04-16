export type StepStatus = 'completed' | 'current' | 'upcoming';

export function deriveStepStatus(stepIndex: number, firstIncompleteStep: number): StepStatus {
  if (stepIndex < firstIncompleteStep) return 'completed';
  if (stepIndex === firstIncompleteStep) return 'current';

  return 'upcoming';
}
