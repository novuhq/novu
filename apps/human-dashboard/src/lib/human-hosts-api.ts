import 'server-only';

import { cache } from 'react';

import type { ConnectCode, ConnectCodeCheck, HostStatus } from './host-status';
import type { HostId } from './hosts';
import type { HumanAccount } from './human-account';
import { isHumanApiNotFound } from './human-api-error';
import { requestForAccount } from './human-api-key';

/**
 * Whether a host reads the agent's mail: each host by name, the way it came in, and when it last checked
 * the inbox. Pages and the drawers' checks read it fresh every time.
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
 *
 * `host` is the host picker's tab the code is shown on: each host gets a code of its own, and a host that
 * uses it without saying which one it is counts as that host.
 */
export function createConnectCode(account: HumanAccount, handle: string, host?: HostId): Promise<ConnectCode> {
  return requestForAccount<ConnectCode>(account, '/v1/human/agent/connect-codes', {
    method: 'POST',
    body: host ? { handle, host } : { handle },
  });
}

/**
 * What became of a code made for the agent `handle` names: unused, used by a host, or expired. Asking only
 * reads it, so it never counts as a wrong try. `null` when the API doesn't know it for this agent (it lets a
 * code go an hour after making it); any other failure throws.
 */
export async function readConnectCode(
  account: HumanAccount,
  handle: string,
  code: string
): Promise<ConnectCodeCheck | null> {
  try {
    // In the body, never the address: an unused code works as a key, and addresses end up in logs.
    return await requestForAccount<ConnectCodeCheck>(account, '/v1/human/agent/connect-codes/status', {
      method: 'POST',
      body: { handle, code },
    });
  } catch (error) {
    if (isHumanApiNotFound(error)) {
      return null;
    }

    throw error;
  }
}
