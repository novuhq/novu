import 'server-only';

import { cache } from 'react';

import type { ConnectCode, HostStatus } from './host-status';
import type { HumanAccount } from './human-account';
import { requestForAccount } from './human-api-key';

/**
 * Whether a host reads the agent's mail: the hosts that came in through the CLI or the MCP server, and
 * when each last checked the inbox. Pages and the drawers' checks read it fresh every time.
 */
export function readHostStatus(account: HumanAccount): Promise<HostStatus> {
  return requestForAccount<HostStatus>(account, '/v1/human/agent/hosts');
}

/**
 * The same, for a page that can do without it: `null` when it can't be read just now, and the page then
 * leaves the status out rather than guess it. The shell and the page of one request share a single lookup.
 */
export const loadHostStatus = cache(async (account: HumanAccount): Promise<HostStatus | null> => {
  try {
    return await readHostStatus(account);
  } catch (error) {
    console.error('Failed to load the host status', error);

    return null;
  }
});

/**
 * A one-time code for `agentinbox connect <handle> --code <code>`. Asked again while the last one is
 * unused and has a few minutes left, the API hands that one back; a used one is never handed out again.
 */
export function createConnectCode(account: HumanAccount, handle: string): Promise<ConnectCode> {
  return requestForAccount<ConnectCode>(account, '/v1/human/agent/connect-codes', {
    method: 'POST',
    body: { handle },
  });
}
