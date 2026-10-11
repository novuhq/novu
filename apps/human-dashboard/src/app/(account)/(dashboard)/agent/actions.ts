'use server';

import { isToolId } from '@/lib/ai-tools';
import { requireHumanAccount } from '@/lib/human-account';
import { readAgentStatus } from '@/lib/human-agent-status';
import { listConnectedTools } from '@/lib/human-tools-api';

/**
 * How far the agent's setup got right now. The Agent page asks every few seconds while the operator runs
 * `human setup` in their terminal, and reloads itself once the answer differs from what it shows.
 */
export async function readAgentStatusAction(): Promise<string> {
  const account = await requireHumanAccount({ returnTo: '/agent' });

  return readAgentStatus(account);
}

/** Whether an AI tool has signed in to the account. Its connect drawer asks while it's open. */
export async function checkToolConnectedAction(tool: string): Promise<boolean> {
  if (!isToolId(tool)) {
    return false;
  }

  const account = await requireHumanAccount({ returnTo: '/agent' });

  return (await listConnectedTools(account)).includes(tool);
}
