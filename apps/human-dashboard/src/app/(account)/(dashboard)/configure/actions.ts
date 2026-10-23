'use server';

import { currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

import { CONFIGURE_PATH, DASHBOARD_HOME } from '@/components/dashboard/nav';
import { AGENT_REACHES, type AgentSettings, type AgentSettingsChange } from '@/lib/agent-settings';
import { isToolId } from '@/lib/ai-tools';
import {
  type AgentHost,
  type CodeStatusResult,
  type ConnectCodeResult,
  type HostStatus,
  NEVER_CHECKED,
} from '@/lib/host-status';
import { readHumanAccount, requireHumanAccount } from '@/lib/human-account';
import { AGENT_NOT_SET_UP_MESSAGE, deleteAgent, updateAgentSettings } from '@/lib/human-agent-api';
import { readAgentStatus } from '@/lib/human-agent-status';
import { isHumanApiNotFound, isHumanApiRefusal } from '@/lib/human-api-error';
import { createConnectCode, readConnectCode, readHostStatus } from '@/lib/human-hosts-api';
import { updateOnboardingState } from '@/lib/human-onboarding';
import { listConnectedTools } from '@/lib/human-tools-api';
import { HANDLE_MAX_LENGTH } from '@/lib/onboarding';

/** What `connect` takes as the agent, as the API checks it (`AGENT_HANDLE_PATTERN`). */
const HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A one-time code as the API hands it out: two groups of four letters, as `BCDF-GHJK`. */
const CODE_PATTERN = /^[A-Z]{4}-[A-Z]{4}$/;

export type AgentSettingsResult = { ok: true; settings: AgentSettings } | { ok: false; error: string };

export type DeleteAgentResult = { ok: true } | { ok: false; error: string };

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
 * Changes one setting of the agent: who can reach it, or whether it is paused. Answers with every setting
 * as the API has it now. The Inbox follows: its paused banner comes and goes with the pause.
 */
export async function updateAgentSettingsAction(change: AgentSettingsChange): Promise<AgentSettingsResult> {
  // The change comes from the browser, so only the two settings this block has get through.
  const checked = checkChange(change);
  if (!checked) {
    return { ok: false, error: 'This setting can’t be changed.' };
  }

  const account = await requireHumanAccount({ returnTo: CONFIGURE_PATH });

  try {
    const settings = await updateAgentSettings(account, checked);
    revalidatePath(CONFIGURE_PATH);
    revalidatePath(DASHBOARD_HOME);

    return { ok: true, settings };
  } catch (error) {
    if (isHumanApiNotFound(error)) {
      return { ok: false, error: AGENT_NOT_SET_UP_MESSAGE };
    }

    if (isHumanApiRefusal(error)) {
      return { ok: false, error: (error as Error).message };
    }

    console.error('Failed to change a setting of the agent', error);

    return { ok: false, error: 'Couldn’t save that. Try again.' };
  }
}

/**
 * Deletes the agent, then forgets how far the operator got in the onboarding. That record belongs to the
 * deleted agent: kept, it would take the next agent past the steps it hasn't done (its test, its host).
 * The page then sends the operator to the onboarding, where the dashboard starts without an agent.
 */
export async function deleteAgentAction(): Promise<DeleteAgentResult> {
  const account = await requireHumanAccount({ returnTo: CONFIGURE_PATH });

  try {
    await deleteAgent(account);
  } catch (error) {
    console.error('Failed to delete the agent', error);

    return { ok: false, error: 'Something went wrong while deleting your agent. Please try again.' };
  }

  try {
    await updateOnboardingState(() => ({}));
  } catch (error) {
    // The agent is gone either way; the onboarding then only knows less than it should.
    console.error('Failed to reset the onboarding after deleting the agent', error);
  }

  // Every page and the sidebar showed the agent that is gone.
  revalidatePath('/', 'layout');

  return { ok: true };
}

/**
 * A one-time code for "Connect another agent", for the agent as the page names it. The drawer asks when it
 * opens, shortly before the code runs out, and when the API says the one it shows ran out.
 */
export async function createConnectCodeAction(handle: string): Promise<ConnectCodeResult> {
  if (!isHandle(handle)) {
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

/**
 * What became of a code "Connect another agent" showed: the drawer asks every few seconds while it waits,
 * as a host that comes in the way another one already did shows only in its code. `unknown` for a code the
 * API doesn't know for this agent; `null` when it couldn't be asked, and the drawer simply asks again.
 */
export async function readConnectCodeStatusAction(handle: string, code: string): Promise<CodeStatusResult> {
  if (!isHandle(handle) || typeof code !== 'string' || !CODE_PATTERN.test(code)) {
    return 'unknown';
  }

  const account = await requireHumanAccount({ returnTo: '/configure' });

  try {
    return (await readConnectCode(account, handle, code))?.status ?? 'unknown';
  } catch (error) {
    console.error('Failed to read what became of a connect code', error);

    return null;
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

/**
 * Each host with its last check, for the Agent setup row once a check newer than any it shows comes in. Like
 * `readHostCheckAction` it runs in the background: a failure throws, and a session that ended doesn't send
 * the operator to sign in from here.
 */
export async function readHostsAction(): Promise<AgentHost[]> {
  const user = await currentUser();
  const account = user && readHumanAccount(user);
  if (!account) {
    throw new Error('Not signed in');
  }

  return (await readHostStatus(account)).hosts;
}

function isHandle(handle: unknown): handle is string {
  return typeof handle === 'string' && handle.length <= HANDLE_MAX_LENGTH && HANDLE_PATTERN.test(handle);
}

function checkChange(change: AgentSettingsChange): AgentSettingsChange | null {
  if (!change || typeof change !== 'object') {
    return null;
  }

  if ('reach' in change && AGENT_REACHES.includes(change.reach)) {
    return { reach: change.reach };
  }

  if ('paused' in change && typeof change.paused === 'boolean') {
    return { paused: change.paused };
  }

  return null;
}
