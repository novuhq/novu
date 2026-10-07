import 'server-only';

import type { User } from '@clerk/nextjs/server';

import { type HumanAccount, readHumanAccount } from './human-account';
import { isHumanApiNotFound } from './human-api-error';
import { requestForAccount } from './human-api-key';

/** The relay agent `human setup` creates; the claim keeps its identifier. */
export const RELAY_AGENT_IDENTIFIER = 'human-relay';

export type RelayAgent = {
  identifier: string;
  name: string;
  active: boolean;
  description?: string;
};

/** The agent that carries messages between the operator's agents and their contacts, or `null` before any setup. */
export async function getRelayAgent(account: HumanAccount): Promise<RelayAgent | null> {
  try {
    const agent = await requestForAccount<RelayAgent>(account, `/v1/agents/${RELAY_AGENT_IDENTIFIER}`);

    return {
      identifier: agent.identifier,
      name: agent.name,
      active: agent.active !== false,
      description: agent.description,
    };
  } catch (error) {
    if (isHumanApiNotFound(error)) {
      return null;
    }

    throw error;
  }
}

/**
 * Whether the operator's account already has its agent. A setup made without an account can only move
 * into an account that has none, so the claim and CLI login pages check this before offering it.
 * A failed lookup counts as "no": the API refuses the move itself when there is one.
 */
export async function accountHasAgent(user: User): Promise<boolean> {
  const account = readHumanAccount(user);
  if (!account) {
    return false;
  }

  try {
    return (await getRelayAgent(account)) !== null;
  } catch (error) {
    console.error('Failed to check whether the account has an agent', error);

    return false;
  }
}
