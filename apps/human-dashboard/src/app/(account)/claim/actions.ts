'use server';

import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { ensureStoredBackingAccount, readStoredBackingAccount } from '@/lib/human-account';
import { claimKeylessSetup, type HumanRegion, REGION_NAMES } from '@/lib/human-accounts-api';
import { accountHasAgent } from '@/lib/human-agent-api';
import { HumanApiError } from '@/lib/human-api-error';

export type ClaimFormState = { error?: string };

/** Claim tokens are 32 URL-safe characters (`@novu/shared` `isConnectClaimTokenFormat`). */
const CLAIM_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

/** Moves the keyless setup from the claim link into the signed-in operator's Human account. */
export async function claimSetupAction(_previous: ClaimFormState, formData: FormData): Promise<ClaimFormState> {
  const user = await currentUser();
  if (!user) {
    return { error: 'Your session has ended. Sign in again to keep this setup.' };
  }

  const token = String(formData.get('token') ?? '');
  const region: HumanRegion = formData.get('region') === 'eu' ? 'eu' : 'us';

  if (!CLAIM_TOKEN_PATTERN.test(token)) {
    return { error: 'This link isn’t valid. Open the newest link your agent sent you.' };
  }

  const stored = readStoredBackingAccount(user);
  if (stored && stored.region !== region) {
    return {
      error: `This setup was made in the ${REGION_NAMES[region]} region, but your Human account is in the ${REGION_NAMES[stored.region]} region, so it can’t be moved there.`,
    };
  }

  // The page doesn't offer the move to an account with an agent; this is the same answer for a stale tab.
  if (await accountHasAgent(user)) {
    return { error: ACCOUNT_HAS_AGENT_MESSAGE };
  }

  try {
    await ensureStoredBackingAccount(user, region);
    await claimKeylessSetup(
      region,
      { humanUserId: user.id, firstName: user.firstName, lastName: user.lastName },
      token
    );
  } catch (error) {
    console.error('Failed to claim the keyless setup', error);

    return { error: describeClaimError(error) };
  }

  redirect('/account?claimed=1');
}

const ACCOUNT_HAS_AGENT_MESSAGE = 'Your Human account already has an agent, so this setup can’t be moved into it.';

function describeClaimError(error: unknown): string {
  if (error instanceof HumanApiError) {
    if (error.code === 'claim_agent_exists') {
      return ACCOUNT_HAS_AGENT_MESSAGE;
    }

    // The claim's own messages ("already been used", "expired", …) are written for people.
    if (error.status === 400 || error.status === 404 || error.status === 409) {
      return error.message;
    }
  }

  return 'Something went wrong while keeping your setup. Please try again.';
}
