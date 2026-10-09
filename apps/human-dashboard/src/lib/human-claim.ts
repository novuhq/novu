import 'server-only';

import type { User } from '@clerk/nextjs/server';

import { readHumanAccount } from './human-account';
import { HumanApiError } from './human-api-error';
import { listChannels } from './human-channels-api';
import { listContactsPage } from './human-contacts-api';
import { findOperatorContactId } from './human-operator';

/**
 * Whether the operator's agent is already in use: it has a channel, a contact besides the operator, or
 * an email the operator saved for it.
 * An account may have an agent already (from `human setup`, or from sign-up for accounts made when that
 * still created one), and a setup made without an account can only take the place of one nobody used
 * yet, so the claim and CLI login pages check this before offering the move. The API
 * applies the same rule (`HumanAccountAgentService`) and has the last word; a failed lookup here counts
 * as "not in use" and leaves the answer to it.
 */
export async function isAccountAgentInUse(user: User): Promise<boolean> {
  const account = readHumanAccount(user);
  if (!account) {
    return false;
  }

  try {
    const [channels, operatorContactId, contacts] = await Promise.all([
      listChannels(account),
      findOperatorContactId(account),
      listContactsPage(account, { limit: 2 }),
    ]);

    return (
      channels.length > 0 ||
      contacts.contacts.some((contact) => contact.id !== operatorContactId || Boolean(contact.email))
    );
  } catch (error) {
    console.error("Failed to check whether the account's agent is in use", error);

    return false;
  }
}

/** Long enough for whatever is making the account's agent at this very moment to finish. */
const SIGN_UP_SETTLE_MS = 1500;

/**
 * Runs a claim, and once more when the API says the account has an agent although nobody uses it. That
 * happens when an agent is made in the middle of the claim, by a `human setup` in another terminal: it
 * gets in the claim's way. By the second try that setup is done and its untouched agent steps aside.
 */
export async function claimPastSignUp<T>(user: User, claim: () => Promise<T>): Promise<T> {
  try {
    return await claim();
  } catch (error) {
    const agentInTheWay = error instanceof HumanApiError && error.code === 'claim_agent_exists';
    if (!agentInTheWay || (await isAccountAgentInUse(user))) {
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, SIGN_UP_SETTLE_MS));

    return claim();
  }
}
