import { currentUser } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Stage } from '@/components/site/stage';
import { findCliLogin, type HumanRegion, type PendingCliLogin } from '@/lib/human-accounts-api';
import { HumanApiError } from '@/lib/human-api-error';
import { isAccountAgentInUse } from '@/lib/human-claim';

import { CliLogin } from './cli-login';
import { normalizeUserCode } from './user-code';

export const metadata: Metadata = {
  title: 'Authorize the human CLI',
  robots: { index: false, follow: false },
  // The login code and a claim token can be in the URL; keep them out of the Referer.
  referrer: 'origin',
};

/**
 * Opened by `human login` (`…/cli/login?code=BCDF-GHJK`, plus `&region=eu` from the EU API). The page shows
 * the code and the computer's name to compare with the terminal, and the signed-in person approves or denies.
 * The code in the link only says which login this is: opening the page approves nothing, and a code that was
 * denied, used or ran out shows the expired card. Links from older CLIs have no code; it's typed then.
 * When the CLI has a setup made without an account, `claim=…` carries its claim token, so approving also
 * keeps that setup. An account whose agent is already in use can't take that setup in: the page says so
 * and approving only logs the CLI in.
 */
export default async function CliLoginPage(props: PageProps<'/cli/login'>) {
  const searchParams = await props.searchParams;
  const linkedCode = typeof searchParams.code === 'string' ? searchParams.code : '';
  const claim = typeof searchParams.claim === 'string' ? searchParams.claim : '';
  const region: HumanRegion = searchParams.region === 'eu' ? 'eu' : 'us';

  const user = await currentUser();
  if (!user) {
    const query = new URLSearchParams({
      ...(linkedCode ? { code: linkedCode } : {}),
      ...(claim ? { claim } : {}),
      ...(region === 'eu' ? { region } : {}),
    });
    const loginPath = query.size > 0 ? `/cli/login?${query}` : '/cli/login';

    // Someone keeping a setup made without an account is usually new; anyone else likely has an account.
    redirect(`${claim ? '/sign-up' : '/sign-in'}?${new URLSearchParams({ redirect_url: loginPath })}`);
  }

  // Anything in `code` that isn't a code is never shown or sent on: such a link has nothing to approve.
  const userCode = normalizeUserCode(linkedCode);
  const login = userCode ? await readLogin(region, userCode) : null;
  const expired = Boolean(linkedCode) && !login;
  const cannotKeepSetup = !expired && Boolean(claim) && (await isAccountAgentInUse(user));

  return (
    <Stage aside={user.primaryEmailAddress?.emailAddress}>
      <CliLogin
        userCode={login?.userCode ?? ''}
        machineName={login?.machineName}
        region={region}
        claim={cannotKeepSetup ? '' : claim}
        cannotKeepSetup={cannotKeepSetup}
        email={user.primaryEmailAddress?.emailAddress}
        expired={expired}
      />
    </Stage>
  );
}

/**
 * The login waiting for the code, or null once nothing waits for it. When the API can't be asked, the card
 * is still shown, without the computer's name: Approve asks again, and says so if the login is gone.
 */
async function readLogin(region: HumanRegion, userCode: string): Promise<PendingCliLogin | null> {
  try {
    return await findCliLogin(region, userCode);
  } catch (error) {
    if (error instanceof HumanApiError && error.code === 'cli_login_not_found') {
      return null;
    }

    console.error('Failed to look up the CLI login', error);

    return { userCode };
  }
}
