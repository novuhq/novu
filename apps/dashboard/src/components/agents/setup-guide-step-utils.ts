import type { ICredentials } from '@novu/shared';

export type StepStatus = 'completed' | 'current' | 'upcoming';

export function deriveStepStatus(stepIndex: number, firstIncompleteStep: number): StepStatus {
  if (stepIndex < firstIncompleteStep) return 'completed';
  if (stepIndex === firstIncompleteStep) return 'current';

  return 'upcoming';
}

/**
 * Returns true when at least one string credential field has been filled in.
 * Boolean fields (secure, requireTls, etc.) are excluded — their default false
 * value should not count as "credentials saved".
 */
export function hasIntegrationCredentials(credentials: ICredentials | undefined): boolean {
  if (!credentials) return false;

  return Object.values(credentials).some((v) => typeof v === 'string' && v.length > 0);
}
