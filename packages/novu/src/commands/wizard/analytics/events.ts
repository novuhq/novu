import { AnalyticService } from '../../../services/analytics.service';

export const WIZARD_EVENTS = {
  STARTED: 'Wizard Started',
  AUTH_COMPLETED: 'Wizard Auth Completed',
  STEP: 'Wizard Step',
  COMPLETED: 'Wizard Completed',
  CANCELLED: 'Wizard Cancelled',
  ERROR: 'Wizard Error',
} as const;

export type WizardEvent = (typeof WIZARD_EVENTS)[keyof typeof WIZARD_EVENTS];

export function trackWizard(
  analytics: AnalyticService,
  anonymousId: string | undefined,
  event: WizardEvent,
  data: Record<string, unknown> = {}
): void {
  if (!anonymousId) return;

  analytics.track({
    identity: { anonymousId },
    event,
    data,
  });
}
