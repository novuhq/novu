import 'server-only';

import { clerkClient, currentUser, type User } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { ensureBackingAccount, type HumanRegion } from './human-accounts-api';
import { HumanApiError } from './human-api-error';

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

  return {
    ...(await ensureStoredBackingAccount(user, DEFAULT_REGION)),
    humanUserId: user.id,
  };
});

/**
 * What the sign-up webhook runs for a new operator (`app/api/webhooks/clerk`): the account, remembered on
 * the Clerk user. A dashboard visit that got there first leaves nothing to do. The agent is not made
 * here: the operator creates it with `human setup`, as the Agent page asks them to.
 */
export async function ensureAccountForSignUp(humanUserId: string): Promise<void> {
  const clerk = await clerkClient();
  const user = await clerk.users.getUser(humanUserId);

  await ensureStoredBackingAccount(user, DEFAULT_REGION);
}

/** How long to wait for an account that the sign-up webhook is creating at this very moment. */
const BUSY_RETRIES = 5;
const BUSY_RETRY_MS = 1000;

/**
 * The signed-in operator's backing account. It's there from sign-up; a first visit that gets ahead of
 * the sign-up webhook creates it itself, so the dashboard never opens on a missing one. Sends signed-out
 * visitors to `/sign-in`, and back to `returnTo` afterwards.
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
 * Makes sure an operator has a backing organization and the dashboard knows where it lives. The sign-up
 * webhook runs this; so does the first dashboard visit of an operator it hasn't reached, and nothing does
 * once the account is remembered. The API call is safe to repeat, so a webhook that is late, or can't
 * reach a local dashboard at all, leaves nothing missing.
 *
 * The account starts without an agent. `human setup` creates it, or a claim brings its own.
 */
export async function ensureStoredBackingAccount(user: User, regionForNewAccount: HumanRegion) {
  const stored = readStoredBackingAccount(user);
  if (stored) {
    return stored;
  }

  const created = await ensureBackingAccountWhenFree(regionForNewAccount, {
    humanUserId: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
  });
  const account: StoredBackingAccount = {
    region: regionForNewAccount,
    organizationId: created.organizationId,
    userId: created.userId,
  };

  return storeBackingAccount(user.id, account);
}

/** The API answers "busy" while another request, usually the webhook, is creating the same account. */
async function ensureBackingAccountWhenFree(...args: Parameters<typeof ensureBackingAccount>) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await ensureBackingAccount(...args);
    } catch (error) {
      if (!(error instanceof HumanApiError) || error.code !== 'human_account_busy' || attempt > BUSY_RETRIES) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, BUSY_RETRY_MS));
    }
  }
}

/** Remembers where the operator's backing organization lives, for the dashboard. */
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
