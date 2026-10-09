import 'server-only';

import type { HumanAccount } from './human-account';
import { getRelayAgent } from './human-agent-api';
import { type ChannelVia, listChannels } from './human-channels-api';

type ConnectedChannel = { via: ChannelVia; connected: boolean };

/** What the Agent page says before `human setup` has made the agent. */
const NOT_SET_UP = 'none';

/**
 * How far the agent's setup got, as one short string: whether the agent exists and which of its
 * channels work. The Agent page is rendered with it and keeps asking for it while the operator finishes
 * the setup in their terminal; a different answer means there is something new to show.
 */
export function describeAgentStatus(agentId: string | null, channels: ConnectedChannel[]): string {
  if (!agentId) {
    return NOT_SET_UP;
  }

  const connected = channels.filter((channel) => channel.connected).map((channel) => channel.via);

  return [agentId, ...[...new Set(connected)].sort()].join('|');
}

/** The same string, read fresh and with as few calls as it takes. */
export async function readAgentStatus(account: HumanAccount): Promise<string> {
  const agent = await getRelayAgent(account);
  if (!agent) {
    return NOT_SET_UP;
  }

  const channels = await listChannels(account);

  return describeAgentStatus(
    agent.id,
    channels.flatMap((channel) =>
      channel.via && channel.active ? [{ via: channel.via, connected: channel.connected }] : []
    )
  );
}
