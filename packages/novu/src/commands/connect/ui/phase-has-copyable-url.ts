import type { Phase } from './store';

/** Phases that show a copyable URL — pause the orb so URL lines stay stable between redraws. */
export function phaseHasCopyableUrl(phase: Phase): boolean {
  switch (phase.kind) {
    case 'auth':
      return Boolean(phase.dashboardUrl);
    case 'waiting-slack':
    case 'telegram-link-token':
    case 'telegram-test':
    case 'whatsapp-signup-ready':
    case 'whatsapp-signup-waiting':
    case 'slack-oauth-ready':
    case 'email-ready':
    case 'sendblue-intro':
    case 'sendblue-credential':
    case 'sendblue-webhook-manual':
    case 'sendblue-test-phone':
    case 'sendblue-test-waiting':
    case 'dashboard-channel-ready':
    case 'agent-chat-handoff':
      return true;
    case 'whatsapp-test':
      return Boolean(phase.waMeUrl);
    default:
      return false;
  }
}
