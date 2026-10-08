'use server';

import { requireHumanAccount } from '@/lib/human-account';
import { readAgentStatus } from '@/lib/human-agent-status';

/**
 * How far the agent's setup got right now. The Agent page asks every few seconds while the operator runs
 * `human setup` in their terminal, and reloads itself once the answer differs from what it shows.
 */
export async function readAgentStatusAction(): Promise<string> {
  const account = await requireHumanAccount({ returnTo: '/agent' });

  return readAgentStatus(account);
}
