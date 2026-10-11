'use server';

import { currentUser } from '@clerk/nextjs/server';

import { readStoredBackingAccount, type StoredBackingAccount, storeBackingAccount } from '@/lib/human-account';
import { approveCliLogin, denyCliLogin, type HumanRegion, REGION_NAMES } from '@/lib/human-accounts-api';
import { HumanApiError } from '@/lib/human-api-error';
import { claimPastSignUp } from '@/lib/human-claim';

import { normalizeUserCode } from './user-code';

export type CliLoginRequest = {
  /** The code from the link, or what was typed when the link had none. */
  userCode: string;
  region: HumanRegion;
  /** Claim token of the setup made without an account, when logging in should move it into the account. */
  claim?: string;
};

export type ApproveCliLoginResult =
  | {
      status: 'approved';
      /** The setup made without an account moved into the Human account on the way. */
      keptSetup: boolean;
      /** The login worked, but the dashboard couldn't be told where the setup lives. */
      accountPageBehind: boolean;
    }
  /** Nothing is waiting for the code anymore: it ran out, was denied, or was used. */
  | { status: 'expired' }
  | {
      status: 'error';
      message: string;
      /** That setup can't be kept, but approving without it still works. */
      canSkipClaim?: boolean;
    };

export type DenyCliLoginResult =
  | { status: 'denied' }
  /** Nothing waited for the code anymore, so nothing was denied: it ran out, was denied before, or was approved. */
  | { status: 'expired' }
  | { status: 'error'; message: string };

/** Claim tokens are 32 URL-safe characters (`@novu/shared` `isConnectClaimTokenFormat`). */
const CLAIM_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

const SESSION_ENDED = 'Your session has ended. Reload this page and sign in again.';

/** An approval is at work on the login. Moments later it's either approved, or waiting again. */
const BEING_APPROVED = 'This login is being approved somewhere else right now. Try again in a moment.';

/**
 * Approves the `human login` waiting for the code, so that CLI gets the key of the signed-in person's Human
 * account. Only ever runs from the Approve button: the code in the link shows which login this is, it doesn't
 * approve it. With a claim token, the CLI's setup made without an account first moves into the Human account,
 * so the CLI carries on with the same contacts and channels. The API checks the code before it creates or
 * moves anything.
 */
export async function approveCliLoginAction(request: CliLoginRequest): Promise<ApproveCliLoginResult> {
  const user = await currentUser();
  if (!user) {
    return { status: 'error', message: SESSION_ENDED };
  }

  const userCode = normalizeUserCode(String(request.userCode ?? ''));
  if (!userCode) {
    return { status: 'error', message: 'Enter the 8-letter code from your terminal, like BCDF-GHJK.' };
  }

  const claim = String(request.claim ?? '');
  if (claim && !CLAIM_TOKEN_PATTERN.test(claim)) {
    return { status: 'error', message: 'This link isn’t valid. Run human login again for a new one.' };
  }

  const region: HumanRegion = request.region === 'eu' ? 'eu' : 'us';
  const stored = readStoredBackingAccount(user);
  if (stored && stored.region !== region) {
    return {
      status: 'error',
      message: `Your human CLI uses the ${REGION_NAMES[region]} region, but your Human account is in the ${REGION_NAMES[stored.region]} region. Point the CLI at the ${REGION_NAMES[stored.region]} API and run human login again.`,
    };
  }

  let account: Awaited<ReturnType<typeof approveCliLogin>>;
  try {
    // A refused claim leaves the login waiting, so trying again is safe.
    account = await claimPastSignUp(user, () =>
      approveCliLogin(
        region,
        {
          humanUserId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.primaryEmailAddress?.emailAddress,
        },
        { userCode, claimToken: claim || undefined }
      )
    );
  } catch (error) {
    console.error('Failed to approve the CLI login', error);

    return describeApproveError(error);
  }

  // The CLI is logged in at this point, so a failed write here must not read as a failed login.
  const remembered =
    Boolean(stored) ||
    (await rememberBackingAccount(user.id, { region, organizationId: account.organizationId, userId: account.userId }));

  return { status: 'approved', keptSetup: account.keptSetup, accountPageBehind: !remembered };
}

/**
 * Ends the `human login` waiting for the code: the code stops working and the terminal is told it was denied.
 * Nothing is created or moved. A login that is already gone is not reported as denied: it may be gone because
 * it was approved in another tab, and then the terminal was let in.
 */
export async function denyCliLoginAction(request: Omit<CliLoginRequest, 'claim'>): Promise<DenyCliLoginResult> {
  const user = await currentUser();
  if (!user) {
    return { status: 'error', message: SESSION_ENDED };
  }

  const userCode = normalizeUserCode(String(request.userCode ?? ''));
  if (!userCode) {
    // Without a code there's no login to end, and none that this page could approve by accident.
    return { status: 'denied' };
  }

  let denied: boolean;
  try {
    ({ denied } = await denyCliLogin(request.region === 'eu' ? 'eu' : 'us', userCode));
  } catch (error) {
    console.error('Failed to deny the CLI login', error);

    return {
      status: 'error',
      message:
        error instanceof HumanApiError && error.code === 'cli_login_being_approved'
          ? BEING_APPROVED
          : 'Couldn’t deny this login just now. Try again, or close your terminal.',
    };
  }

  return denied ? { status: 'denied' } : { status: 'expired' };
}

/** Tries twice, since the dashboard shows nothing until this is saved. */
async function rememberBackingAccount(userId: string, account: StoredBackingAccount): Promise<boolean> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await storeBackingAccount(userId, account);

      return true;
    } catch (error) {
      console.error(`Failed to remember the backing organization after a CLI login (attempt ${attempt})`, error);
    }
  }

  return false;
}

function describeApproveError(error: unknown): ApproveCliLoginResult {
  if (error instanceof HumanApiError) {
    if (error.code === 'cli_login_not_found') {
      return { status: 'expired' };
    }

    if (error.code === 'cli_login_being_approved') {
      return { status: 'error', message: BEING_APPROVED };
    }

    if (error.code === 'claim_agent_exists') {
      return {
        status: 'error',
        message:
          'Your Human account’s agent is already in use, so the setup on your computer can’t be moved into it. You can still approve; that setup stays behind.',
        canSkipClaim: true,
      };
    }

    // The claim's own messages ("already been used", "expired", …) are written for people.
    if (error.code.startsWith('claim_')) {
      return {
        status: 'error',
        message: `${error.message} You can still approve without keeping that setup.`,
        canSkipClaim: true,
      };
    }
  }

  return { status: 'error', message: 'Something went wrong while logging in. Please try again.' };
}
