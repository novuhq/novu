'use server';

import { revalidatePath } from 'next/cache';

import { CONFIGURE_PATH, DASHBOARD_HOME } from '@/components/dashboard/nav';
import { AGENT_REACHES, type AgentSettings, type AgentSettingsChange } from '@/lib/agent-settings';
import { isToolId } from '@/lib/ai-tools';
import { requireHumanAccount } from '@/lib/human-account';
import { AGENT_NOT_SET_UP_MESSAGE, deleteAgent, updateAgentSettings } from '@/lib/human-agent-api';
import { readAgentStatus } from '@/lib/human-agent-status';
import { isHumanApiNotFound, isHumanApiRefusal } from '@/lib/human-api-error';
import { updateOnboardingState } from '@/lib/human-onboarding';
import { listConnectedTools } from '@/lib/human-tools-api';

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
