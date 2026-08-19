import { ChatProviderIdEnum } from '@novu/shared';
import { getProviderSquareIconFileName } from './provider-square-icon';

// User-facing agent surfaces (the channel carousel, the onboarding personalize step) brand the
// Sendblue channel as "iMessage". Everywhere else keeps the canonical Sendblue name via
// getAgentChannelDisplayName, so the rebrand lives here rather than at each call site.
export const AGENT_IMESSAGE_LABEL = 'iMessage';

const AGENT_IMESSAGE_ICON_FILE = 'imessages';

/** Square icon filename for a conversational channel, honouring the iMessage rebrand of Sendblue/Photon. */
export function getAgentChannelIconFileName(providerId: string): string {
  if (providerId === ChatProviderIdEnum.Sendblue || providerId === ChatProviderIdEnum.PhotonImessage) {
    return AGENT_IMESSAGE_ICON_FILE;
  }

  return getProviderSquareIconFileName(providerId);
}
