'use server';

import { currentUser } from '@clerk/nextjs/server';

import { ensureStoredBackingAccount, readStoredBackingAccount } from '@/lib/human-account';
import {
  approveCliLogin,
  claimKeylessSetup,
  HumanAccountsApiError,
  type HumanRegion,
  REGION_NAMES,
} from '@/lib/human-accounts-api';

export type CliLoginFormState = {
  approved?: boolean;
  /** The setup made without an account moved into the Human account on the way. */
  keptSetup?: boolean;
  error?: string;
  /** That setup can't be kept, but logging in without it still works. */
  canSkipClaim?: boolean;
};

/** Device codes of the Novu API's CLI login requests (`CLI_DEVICE_CODE_PATTERN` there). */
const DEVICE_CODE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

/** Claim tokens are 32 URL-safe characters (`@novu/shared` `isConnectClaimTokenFormat`). */
const CLAIM_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

const GENERIC_ERROR = 'Something went wrong while logging in. Please try again.';

/**
 * Approves `human login` for the signed-in operator. With a claim token, the CLI's setup made without an
 * account first moves into the Human account, so the CLI carries on with the same contacts and channels.
 */
export async function approveCliLoginAction(
  _previous: CliLoginFormState,
  formData: FormData
): Promise<CliLoginFormState> {
  const user = await currentUser();
  if (!user) {
    return { error: 'Your session has ended. Sign in again to log in.' };
  }

  const code = String(formData.get('code') ?? '');
  const claim = String(formData.get('claim') ?? '');
  const keepSetup = Boolean(claim) && formData.get('keepSetup') !== 'no';
  const region: HumanRegion = formData.get('region') === 'eu' ? 'eu' : 'us';

  if (!DEVICE_CODE_PATTERN.test(code) || (claim && !CLAIM_TOKEN_PATTERN.test(claim))) {
    return { error: 'This link isn’t valid. Run human login again for a new one.' };
  }

  const stored = readStoredBackingAccount(user);
  if (stored && stored.region !== region) {
    return {
      error: `Your human CLI uses the ${REGION_NAMES[region]} region, but your Human account is in the ${REGION_NAMES[stored.region]} region. Point the CLI at the ${REGION_NAMES[stored.region]} API and run human login again.`,
    };
  }

  const identity = { humanUserId: user.id, firstName: user.firstName, lastName: user.lastName };

  try {
    await ensureStoredBackingAccount(user, region);
  } catch (error) {
    console.error('Failed to set up the Human account for a CLI login', error);

    return { error: GENERIC_ERROR };
  }

  if (keepSetup) {
    try {
      await claimKeylessSetup(region, identity, claim);
    } catch (error) {
      console.error('Failed to keep the keyless setup during a CLI login', error);

      return describeClaimError(error);
    }
  }

  try {
    await approveCliLogin(region, { ...identity, email: user.primaryEmailAddress?.emailAddress }, code);
  } catch (error) {
    console.error('Failed to approve the CLI login', error);

    return { error: describeLoginError(error) };
  }

  return { approved: true, keptSetup: keepSetup };
}

function describeClaimError(error: unknown): CliLoginFormState {
  if (error instanceof HumanAccountsApiError) {
    if (error.code === 'claim_agent_exists') {
      return {
        error:
          'Your Human account already has a setup, so the one on your computer can’t be added to it. You can still log in; that setup stays behind.',
        canSkipClaim: true,
      };
    }

    // The claim's own messages ("already been used", "expired", …) are written for people.
    if (error.status === 400 || error.status === 404 || error.status === 409) {
      return { error: `${error.message} You can still log in without keeping that setup.`, canSkipClaim: true };
    }
  }

  return { error: 'Something went wrong while keeping your setup. Please try again.' };
}

function describeLoginError(error: unknown): string {
  if (error instanceof HumanAccountsApiError && error.status === 404) {
    return 'This login request expired or was already used. Run human login again.';
  }

  return GENERIC_ERROR;
}
