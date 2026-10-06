import 'server-only';

import type { HumanAccount } from './human-account';
import { RELAY_AGENT_IDENTIFIER } from './human-agent-api';
import { isHumanApiNotFound } from './human-api-error';
import { requestForAccount } from './human-api-key';

/** The most links the API returns at once; a relay has a handful. */
const CHANNELS_LIMIT = 100;

export type ChannelVia = 'telegram' | 'slack' | 'email';

export type Channel = {
  identifier: string;
  label: string;
  active: boolean;
  /** Missing for a provider the relay isn't expected to have. */
  via?: ChannelVia;
};

type AgentIntegrationLink = {
  integration: { identifier: string; providerId: string; channel?: string; active?: boolean };
};

const CHANNEL_LABELS: Record<ChannelVia, string> = { telegram: 'Telegram', slack: 'Slack', email: 'Email' };

/** The channels connected to the operator's relay agent. */
export async function listChannels(account: HumanAccount): Promise<Channel[]> {
  let links: AgentIntegrationLink[];

  try {
    links = await requestForAccount<AgentIntegrationLink[]>(
      account,
      `/v1/agents/${RELAY_AGENT_IDENTIFIER}/integrations`,
      { query: { limit: CHANNELS_LIMIT } }
    );
  } catch (error) {
    // A 404 means there's no relay yet: nothing has been set up in this account.
    if (isHumanApiNotFound(error)) {
      return [];
    }

    throw error;
  }

  return (Array.isArray(links) ? links : []).map(({ integration }) => {
    const via = channelVia(integration.providerId, integration.channel);

    return {
      identifier: integration.identifier,
      label: via ? CHANNEL_LABELS[via] : integration.providerId,
      active: integration.active !== false,
      via,
    };
  });
}

function channelVia(providerId: string, channel?: string): ChannelVia | undefined {
  if (providerId.includes('telegram')) return 'telegram';
  if (providerId.includes('slack')) return 'slack';
  if (channel === 'email') return 'email';

  return undefined;
}
