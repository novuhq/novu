import type { Phase } from './store';

/** Phases that show a long URL users may need to copy while the orb keeps animating. */
export function phaseHasCopyableUrl(phase: Phase): boolean {
  switch (phase.kind) {
    case 'auth':
      return Boolean(phase.dashboardUrl);
    case 'waiting-slack':
    case 'slack-setup-link':
    case 'telegram-link-token':
    case 'telegram-test':
    case 'dashboard-channel-ready':
      return true;
    default:
      return false;
  }
}
