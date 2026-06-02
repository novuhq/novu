import { AnalyticService } from '../../../services/analytics.service';

export const WIZARD_EVENTS = {
  STARTED: 'Wizard Started',
  AUTH_COMPLETED: 'Wizard Auth Completed',
  SCREEN_BOOTSTRAP: 'Wizard Screen Bootstrap',
  SCREEN_RUN: 'Wizard Screen Run',
  SCREEN_MCP: 'Wizard Screen Mcp',
  SCREEN_OUTRO: 'Wizard Screen Outro',
  MCP_INSTALLED: 'Wizard Mcp Installed',
  REPORT_WRITTEN: 'Wizard Report Written',
  COMPLETED: 'Wizard Completed',
  CANCELLED: 'Wizard Cancelled',
  ERROR: 'Wizard Error',
} as const;

export type WizardEvent = (typeof WIZARD_EVENTS)[keyof typeof WIZARD_EVENTS];

export function trackWizard(
  analytics: AnalyticService,
  anonymousId: string | undefined,
  event: WizardEvent | string,
  data: Record<string, unknown> = {}
): void {
  if (!anonymousId) return;

  analytics.track({
    identity: { anonymousId },
    event,
    data,
  });
}
