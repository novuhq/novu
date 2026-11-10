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
   * The business number is linked, but the operator hasn't proved their own WhatsApp number with a code yet.
   * `reconnect` carries the Meta ids while the flow can run: the number is saved before Meta's webhook is set
   * up, so a setup that failed halfway is fixed by connecting again.
   */
  | { step: 'verify'; displayPhoneNumber?: string; reconnect?: MetaIds }
  /** The business number is linked and the operator's own number is bound to it. */
  | { step: 'connected'; displayPhoneNumber?: string; operatorPhoneNumber?: string; reconnect?: MetaIds }
  | { step: 'unknown' };

type MetaIds = { appId: string; configId: string };

type WhatsAppSetupResponse = {
  enabled: boolean;
  available: boolean;
  reason?: 'feature_disabled' | 'missing_platform_config';
  appId?: string;
  configId?: string;
  connected: boolean;
  businessConnected?: boolean;
  displayPhoneNumber?: string;
  operatorNumberBound?: boolean;
  operatorPhoneNumber?: string;
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

  const business = {
    ...(setup.displayPhoneNumber ? { displayPhoneNumber: setup.displayPhoneNumber } : {}),
    ...(ids ? { reconnect: ids } : {}),
  };

  if (setup.connected) {
    return {
      step: 'connected',
      ...business,
      ...(setup.operatorPhoneNumber ? { operatorPhoneNumber: setup.operatorPhoneNumber } : {}),
    };
  }

  if (setup.businessConnected) {
    return { step: 'verify', ...business };
  }

  return ids ? { step: 'connect', ...ids } : { step: 'unavailable' };
}
