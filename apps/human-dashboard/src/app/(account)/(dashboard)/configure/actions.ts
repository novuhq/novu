'use server';

import { currentUser } from '@clerk/nextjs/server';

import { isToolId } from '@/lib/ai-tools';
import { type ConnectCodeResult, type HostStatus, NEVER_CHECKED } from '@/lib/host-status';
import { readHumanAccount, requireHumanAccount } from '@/lib/human-account';
import { readAgentStatus } from '@/lib/human-agent-status';
import { isHumanApiRefusal } from '@/lib/human-api-error';
import { createConnectCode, readHostStatus } from '@/lib/human-hosts-api';
import { listConnectedTools } from '@/lib/human-tools-api';
import { HANDLE_MAX_LENGTH } from '@/lib/onboarding';

/** What `connect` takes as the agent, as the API checks it (`AGENT_HANDLE_PATTERN`). */
const HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * How far the agent's setup got right now. The Agent page asks every few seconds while the operator runs
 * `setup` in their terminal, and reloads itself once the answer differs from what it shows.
 */
export async function readAgentStatusAction(): Promise<string> {
  const account = await requireHumanAccount({ returnTo: '/configure' });

  return readAgentStatus(account);
}

/** Whether an AI tool has signed in to the account. Its connect drawer asks while it's open. */
export async function checkToolConnectedAction(tool: string): Promise<boolean> {
  if (!isToolId(tool)) {
    return false;
  }

  const account = await requireHumanAccount({ returnTo: '/configure' });

  return (await listConnectedTools(account)).includes(tool);
}

/**
 * A one-time code for "Connect another agent", for the agent as the page names it. The drawer asks when it
 * opens, again shortly before the code runs out, and now and then to learn whether it was used: the API
 * hands the same code back until then.
 */
export async function createConnectCodeAction(handle: string): Promise<ConnectCodeResult> {
  if (typeof handle !== 'string' || handle.length > HANDLE_MAX_LENGTH || !HANDLE_PATTERN.test(handle)) {
    return { ok: false, error: 'This agent can’t be connected by name. Check its address on this page.' };
  }

  const account = await requireHumanAccount({ returnTo: '/configure' });

  try {
    const code = await createConnectCode(account, handle);

    return { ok: true, code, expiresInMs: Date.parse(code.expiresAt) - Date.now() };
  } catch (error) {
    if (isHumanApiRefusal(error) && error instanceof Error) {
      return { ok: false, error: error.message };
    }

    console.error('Failed to get a connect code', error);

    return { ok: false, error: 'We couldn’t get a code just now.' };
  }
}

/** Whether a host reads the agent's mail, and when it last checked. The connect drawers ask while they're open. */
export async function readHostStatusAction(): Promise<HostStatus | null> {
  const account = await requireHumanAccount({ returnTo: '/configure' });

  try {
    return await readHostStatus(account);
  } catch (error) {
    console.error('Failed to read the host status', error);

    return null;
  }
}

/**
 * When a host last checked the inbox, for a page that waits for one: it reloads once the answer differs.
 * A failure throws, and the page simply asks again. It runs in the background, so a session that ended
 * doesn't send the operator to sign in from here: the next page they open does.
 */
export async function readHostCheckAction(): Promise<string> {
  const user = await currentUser();
  const account = user && readHumanAccount(user);
  if (!account) {
    throw new Error('Not signed in');
  }

  return (await readHostStatus(account)).lastCheckedAt ?? NEVER_CHECKED;
}
