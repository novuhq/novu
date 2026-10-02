'use server';

import { currentUser } from '@clerk/nextjs/server';

import { readStoredBackingAccount, storeBackingAccount } from '@/lib/human-account';
import { approveCliLogin, HumanAccountsApiError, type HumanRegion, REGION_NAMES } from '@/lib/human-accounts-api';

export type CliLoginFormState = {
  approved?: boolean;
  /** The setup made without an account moved into the Human account on the way. */
  keptSetup?: boolean;
  error?: string;
  /** That setup can't be kept, but logging in without it still works. */
  canSkipClaim?: boolean;
  /** What was typed, so the field keeps it after an error. */
  userCode?: string;
};

/** Letters of the codes `human login` prints (`CLI_USER_CODE_ALPHABET` in `@novu/shared`). */
const USER_CODE_LETTERS = /^[BCDFGHJKLMNPQRSTVWXZ]{8}$/;

/** Claim tokens are 32 URL-safe characters (`@novu/shared` `isConnectClaimTokenFormat`). */
const CLAIM_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

const GENERIC_ERROR = 'Something went wrong while logging in. Please try again.';

/**
 * Approves the `human login` waiting for the code the operator typed. With a claim token, the CLI's setup made
 * without an account first moves into the Human account, so the CLI carries on with the same contacts and
 * channels. The API checks the code before it creates or moves anything.
 */
export async function approveCliLoginAction(
  _previous: CliLoginFormState,
  formData: FormData
): Promise<CliLoginFormState> {
  const user = await currentUser();
  if (!user) {
    return { error: 'Your session has ended. Sign in again to log in.' };
  }

  const typedCode = String(formData.get('userCode') ?? '');
  const claim = String(formData.get('claim') ?? '');
  const keepSetup = Boolean(claim) && formData.get('keepSetup') !== 'no';
  const region: HumanRegion = formData.get('region') === 'eu' ? 'eu' : 'us';

  const userCode = normalizeUserCode(typedCode);
  if (!userCode) {
    return { error: 'Enter the 8-letter code from your terminal, like BCDF-GHJK.', userCode: typedCode };
  }

  if (claim && !CLAIM_TOKEN_PATTERN.test(claim)) {
    return { error: 'This link isn’t valid. Run human login again for a new one.' };
  }

  const stored = readStoredBackingAccount(user);
  if (stored && stored.region !== region) {
    return {
      error: `Your human CLI uses the ${REGION_NAMES[region]} region, but your Human account is in the ${REGION_NAMES[stored.region]} region. Point the CLI at the ${REGION_NAMES[stored.region]} API and run human login again.`,
    };
  }

  let account: Awaited<ReturnType<typeof approveCliLogin>>;
  try {
    account = await approveCliLogin(
      region,
      {
        humanUserId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.primaryEmailAddress?.emailAddress,
      },
      { userCode, claimToken: keepSetup ? claim : undefined }
    );
  } catch (error) {
    console.error('Failed to approve the CLI login', error);

    return { ...describeLoginError(error), userCode };
  }

  if (!stored) {
    try {
      await storeBackingAccount(user.id, {
        region,
        organizationId: account.organizationId,
        userId: account.userId,
      });
    } catch (error) {
      // The CLI is logged in already; the account page catches up on the next login or claim.
      console.error('Failed to remember the backing organization after a CLI login', error);
    }
  }

  return { approved: true, keptSetup: account.keptSetup };
}

/** Accepts the code however it's typed: any case, with or without the dash or spaces. */
function normalizeUserCode(input: string): string | null {
  const letters = input.toUpperCase().replace(/[^A-Z]/g, '');

  return USER_CODE_LETTERS.test(letters) ? `${letters.slice(0, 4)}-${letters.slice(4)}` : null;
}

function describeLoginError(error: unknown): CliLoginFormState {
  if (error instanceof HumanAccountsApiError) {
    if (error.code === 'cli_login_not_found') {
      return {
        error:
          'That code doesn’t match a login waiting in a terminal. Check it, or run human login again for a new one.',
      };
    }

    if (error.code === 'claim_agent_exists') {
      return {
        error:
          'Your Human account already has a setup, so the one on your computer can’t be added to it. You can still log in; that setup stays behind.',
        canSkipClaim: true,
      };
    }

    // The claim's own messages ("already been used", "expired", …) are written for people.
    if (error.code?.startsWith('claim_')) {
      return { error: `${error.message} You can still log in without keeping that setup.`, canSkipClaim: true };
    }
  }

  return { error: GENERIC_ERROR };
}
