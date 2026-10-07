import 'server-only';

import { clerkClient, currentUser, type User } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { ensureBackingAccount, type HumanRegion } from './human-accounts-api';

/** Where the operator's backing organization lives, kept in the Human Clerk user's private metadata. */
export type StoredBackingAccount = {
  region: HumanRegion;
  organizationId: string;
  userId: string;
};

/** The signed-in operator's backing account. It's what every data helper takes, and holds no key. */
export type HumanAccount = StoredBackingAccount & { humanUserId: string };

const METADATA_KEY = 'novu';

/** A backing organization made by a dashboard visit has no claim link or CLI to take its region from. */
const DEFAULT_REGION: HumanRegion = 'us';

const loadHumanAccount = cache(async (): Promise<HumanAccount | null> => {
  const user = await currentUser();
  if (!user) {
    return null;
  }

  return { ...(await ensureStoredBackingAccount(user, DEFAULT_REGION)), humanUserId: user.id };
});

/**
 * The signed-in operator's backing account, created on their first visit so the dashboard never
 * opens on a missing one. Sends signed-out visitors to `/sign-in`, and back to `returnTo` afterwards.
 *
 * Server components of one request share a single lookup, so each of them can call this.
 */
export async function requireHumanAccount({ returnTo }: { returnTo?: string } = {}): Promise<HumanAccount> {
  const account = await loadHumanAccount();
  if (!account) {
    redirect(returnTo ? `/sign-in?${new URLSearchParams({ redirect_url: returnTo })}` : '/sign-in');
  }

  return account;
}

/** The operator's backing account if they already have one. Never creates it. */
export function readHumanAccount(user: User): HumanAccount | null {
  const stored = readStoredBackingAccount(user);

  return stored && { ...stored, humanUserId: user.id };
}

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
 * (a claim, or the first dashboard visit), so the region comes from that claim link instead of being fixed
 * at sign-up. Later calls reuse what's stored.
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

  return storeBackingAccount(user.id, {
    region: regionForNewAccount,
    organizationId: account.organizationId,
    userId: account.userId,
  });
}

/** Remembers where the operator's backing organization lives, for the account page. */
export async function storeBackingAccount(userId: string, account: StoredBackingAccount) {
  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(userId, { privateMetadata: { [METADATA_KEY]: account } });

  return account;
}

/**
 * Forgets the backing organization once it's deleted, so a Human account whose own deletion then fails
 * looks like a fresh sign-up and deleting it again is safe.
 */
export async function forgetStoredBackingAccount(userId: string) {
  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(userId, { privateMetadata: { [METADATA_KEY]: null } });
}
