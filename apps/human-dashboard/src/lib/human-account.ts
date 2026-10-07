import 'server-only';

import { clerkClient, currentUser, type User } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { ensureBackingAccount, type HumanRegion } from './human-accounts-api';
import { HumanApiError } from './human-api-error';
import { ensureOperatorContact, findOperatorContactId } from './human-operator';

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
    ...(await ensureStoredBackingAccount(user, DEFAULT_REGION, { withAgent: true })),
    humanUserId: user.id,
  };
});

/** How long to wait for an account that the sign-up webhook is creating at this very moment. */
const BUSY_RETRIES = 5;
const BUSY_RETRY_MS = 1000;

/**
 * The signed-in operator's backing account. It's there from sign-up; a first visit that gets ahead of
 * the sign-up webhook creates it itself, so the dashboard never opens on a missing one. Sends signed-out visitors to `/sign-in`, and back to `returnTo` afterwards.
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
 * Makes sure the dashboard knows the signed-in operator's backing organization. The sign-up webhook of
 * the Human Clerk app creates it together with the agent (`POST /v1/human/webhooks/clerk`); this is what
 * the dashboard does the first time it meets an operator, and never again once it's remembered. The calls
 * are the webhook's own two and safe to repeat, so a webhook that is late, or can't reach a local API at
 * all, leaves nothing missing.
 *
 * A claim brings its own agent, so it asks for the account alone.
 */
export async function ensureStoredBackingAccount(
  user: User,
  regionForNewAccount: HumanRegion,
  { withAgent = false }: { withAgent?: boolean } = {}
) {
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

  if (withAgent) {
    const operator = { ...account, humanUserId: user.id };
    // A contact that exists keeps its name: the operator may have chosen it in the CLI.
    const hasContact = Boolean(await findOperatorContactId(operator));
    await ensureOperatorContact(operator, hasContact ? {} : { firstName: user.firstName, lastName: user.lastName });
  }

  // Remembered last, so a visit that failed halfway starts over instead of leaving an account without an agent.
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
