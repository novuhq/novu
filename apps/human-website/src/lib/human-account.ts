import 'server-only';

import { clerkClient, type User } from '@clerk/nextjs/server';

import { ensureBackingAccount, type HumanRegion } from './human-accounts-api';

/** Where the operator's backing organization lives, kept in the Human Clerk user's private metadata. */
export type StoredBackingAccount = {
  region: HumanRegion;
  organizationId: string;
  userId: string;
};

const METADATA_KEY = 'novu';

export function readStoredBackingAccount(user: User): StoredBackingAccount | null {
  const stored = user.privateMetadata?.[METADATA_KEY] as Partial<StoredBackingAccount> | undefined;

  if (
    (stored?.region === 'us' || stored?.region === 'eu') &&
    typeof stored.organizationId === 'string' &&
    typeof stored.userId === 'string'
  ) {
    return { region: stored.region, organizationId: stored.organizationId, userId: stored.userId };
  }

  return null;
}

/**
 * Makes sure the signed-in operator has a backing organization. It's only created when something needs it
 * (today: the first claim), so the region comes from that claim link instead of being fixed at sign-up.
 * Later calls reuse what's stored.
 */
export async function ensureStoredBackingAccount(user: User, regionForNewAccount: HumanRegion) {
  const stored = readStoredBackingAccount(user);
  if (stored) {
    return stored;
  }

  const account = await ensureBackingAccount(regionForNewAccount, {
    humanUserId: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
  });
  const created: StoredBackingAccount = {
    region: regionForNewAccount,
    organizationId: account.organizationId,
    userId: account.userId,
  };

  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(user.id, { privateMetadata: { [METADATA_KEY]: created } });

  return created;
}

/**
 * Forgets the backing organization once it's deleted, so a Human account whose own deletion then fails
 * looks like a fresh sign-up and deleting it again is safe.
 */
export async function forgetStoredBackingAccount(userId: string) {
  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(userId, { privateMetadata: { [METADATA_KEY]: null } });
}
