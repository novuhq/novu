import type { Phase } from './store';

/** Phases that show a long URL users may need to copy while the orb keeps animating. */
export function phaseHasCopyableUrl(phase: Phase): boolean {
  switch (phase.kind) {
    case 'auth':
      return Boolean(phase.dashboardUrl);
    case 'waiting-slack':
    case 'telegram-link-token':
    case 'telegram-test':
    case 'whatsapp-signup-waiting':
    case 'dashboard-channel-ready':
      return true;
    case 'whatsapp-test':
      return Boolean(phase.waMeUrl);
    default:
      return false;
  }
}
