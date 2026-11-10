import 'server-only';

import type { HumanAccount } from './human-account';
import { RELAY_AGENT_IDENTIFIER } from './human-agent-api';
import { requestForAccount } from './human-api-key';

/**
 * Where the WhatsApp drawer opens. `hidden` means WhatsApp isn't offered to this account at all, so no row
 * shows; `unavailable` means it is, but this deployment can't run the Facebook flow; `unknown` means it
 * couldn't be read just now and the drawer asks again itself.
 */
export type WhatsAppSetupState =
  | { step: 'hidden' }
  | { step: 'unavailable' }
  | { step: 'connect'; appId: string; configId: string }
  /**
   * `reconnect` carries the Meta ids while the flow can run: the number is saved before Meta's webhook is set
   * up, so a setup that failed halfway reads as connected and is fixed by connecting again.
   */
  | { step: 'connected'; displayPhoneNumber?: string; reconnect?: { appId: string; configId: string } }
  | { step: 'unknown' };

type WhatsAppSetupResponse = {
  enabled: boolean;
  available: boolean;
  reason?: 'feature_disabled' | 'missing_platform_config';
  appId?: string;
  configId?: string;
  connected: boolean;
  displayPhoneNumber?: string;
};

/** How far the WhatsApp setup got. Nothing is created here, and a failed read never fails the page. */
export async function readWhatsAppSetup(account: HumanAccount): Promise<WhatsAppSetupState> {
  try {
    const setup = await requestForAccount<WhatsAppSetupResponse>(account, '/v1/human/agent/whatsapp', {
      query: { agentIdentifier: RELAY_AGENT_IDENTIFIER },
    });

    return toWhatsAppSetupState(setup);
  } catch (error) {
    console.error('Failed to read the WhatsApp setup', error);

    return { step: 'unknown' };
  }
}

export function toWhatsAppSetupState(setup: WhatsAppSetupResponse): WhatsAppSetupState {
  if (!setup.enabled) {
    return { step: 'hidden' };
  }

  const ids =
    setup.available && setup.appId && setup.configId ? { appId: setup.appId, configId: setup.configId } : null;

  if (setup.connected) {
    return {
      step: 'connected',
      ...(setup.displayPhoneNumber ? { displayPhoneNumber: setup.displayPhoneNumber } : {}),
      ...(ids ? { reconnect: ids } : {}),
    };
  }

  return ids ? { step: 'connect', ...ids } : { step: 'unavailable' };
}
