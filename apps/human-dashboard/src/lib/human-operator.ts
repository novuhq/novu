import 'server-only';

import { randomBytes } from 'node:crypto';
import { clerkClient, currentUser } from '@clerk/nextjs/server';

import type { HumanAccount } from './human-account';
import { listAllContacts } from './human-contacts-api';

/** Lives beside the backing account in the Human Clerk user's private metadata, so it goes when the account does. */
const METADATA_KEY = 'novu';

/** The contact id `human setup` makes up for the operator on their computer: `human_` and 12 hex characters. */
const CLI_OPERATOR_CONTACT_PATTERN = /^human_[0-9a-f]{12}$/;

/**
 * The operator's own contact: the "you" row in Contacts, and who a channel is tried out on while it's
 * being set up. The API keeps no record of which contact that is, so the dashboard remembers it. Until
 * it has, the oldest contact made by `human setup` is taken to be the operator, so a setup that started
 * in the CLI isn't doubled. `null` when there's neither.
 */
export async function findOperatorContactId(account: HumanAccount): Promise<string | null> {
  const stored = await readStoredOperatorContactId();
  if (stored) {
    return stored;
  }

  const madeByCli = (await listAllContacts(account))
    .filter((contact) => CLI_OPERATOR_CONTACT_PATTERN.test(contact.id))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return madeByCli[0]?.id ?? null;
}

/** Same lookup, but a contact id is made up and remembered when the operator has none yet. */
export async function resolveOperatorContactId(account: HumanAccount): Promise<string> {
  const stored = await readStoredOperatorContactId();
  if (stored) {
    return stored;
  }

  const contactId = (await findOperatorContactId(account)) ?? `human_${randomBytes(6).toString('hex')}`;
  const clerk = await clerkClient();
  // Clerk merges metadata, so the backing account under the same key stays as it is.
  await clerk.users.updateUserMetadata(account.humanUserId, {
    privateMetadata: { [METADATA_KEY]: { operatorContactId: contactId } },
  });

  return contactId;
}

async function readStoredOperatorContactId(): Promise<string | null> {
  const user = await currentUser();
  const stored = user?.privateMetadata?.[METADATA_KEY] as { operatorContactId?: unknown } | undefined;

  return typeof stored?.operatorContactId === 'string' && stored.operatorContactId ? stored.operatorContactId : null;
}
