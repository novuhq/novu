import 'server-only';

import type { User } from '@clerk/nextjs/server';

import { readHumanAccount } from './human-account';
import { listChannels } from './human-channels-api';
import { listContactsPage } from './human-contacts-api';
import { findOperatorContactId } from './human-operator';

/**
 * Whether the operator's agent is already in use: it has a channel, or a contact besides the operator.
 * Every account gets an agent at sign-up, and a setup made without an account can only take the place of
 * one nobody used yet, so the claim and CLI login pages check this before offering the move. The API
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

    return channels.length > 0 || contacts.contacts.some((contact) => contact.id !== operatorContactId);
  } catch (error) {
    console.error("Failed to check whether the account's agent is in use", error);

    return false;
  }
}
