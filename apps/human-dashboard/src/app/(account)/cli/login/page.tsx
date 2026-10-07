import { SignOutButton } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Command } from '@/components/site/command';
import { Panel } from '@/components/site/panel';
import { SiteFrame } from '@/components/site/site-frame';
import type { HumanRegion } from '@/lib/human-accounts-api';
import { accountHasAgent } from '@/lib/human-agent-api';

import { CliLoginForm } from './cli-login-form';

export const metadata: Metadata = {
  title: 'Log in to human',
  robots: { index: false, follow: false },
  // A claim token can be in the URL; keep it out of the Referer.
  referrer: 'origin',
};

/**
 * Opened by `human login` (`…/cli/login`, plus `?region=eu` from the EU API). The operator types the code the
 * terminal shows, so a link someone else sends can't log anyone in. When the CLI has a setup made without an
 * account, `claim=…` carries its claim token, so logging in also keeps that setup. An account that already
 * has an agent can't take that setup in: the page says so and only logs the CLI in.
 */
export default async function CliLoginPage(props: PageProps<'/cli/login'>) {
  const searchParams = await props.searchParams;
  const claim = typeof searchParams.claim === 'string' ? searchParams.claim : '';
  const region: HumanRegion = searchParams.region === 'eu' ? 'eu' : 'us';
  const query = new URLSearchParams({ ...(claim ? { claim } : {}), ...(region === 'eu' ? { region } : {}) });
  const loginPath = query.size > 0 ? `/cli/login?${query}` : '/cli/login';

  const user = await currentUser();
  if (!user) {
    // Someone keeping a setup made without an account is usually new; anyone else likely has an account.
    redirect(`${claim ? '/sign-up' : '/sign-in'}?${new URLSearchParams({ redirect_url: loginPath })}`);
  }

  const email = user.primaryEmailAddress?.emailAddress;
  const cannotKeepSetup = Boolean(claim) && (await accountHasAgent(user));
  const keepsSetup = Boolean(claim) && !cannotKeepSetup;

  return (
    <SiteFrame className="px-4 py-14 md:px-8 md:py-20">
      <Panel
        eyebrow="human login"
        title={
          keepsSetup ? (
            <>
              Keep your setup and <em className="font-display tracking-tight text-accent">log in</em>
            </>
          ) : (
            <>
              Log in to <em className="font-display tracking-tight text-accent">human</em>
            </>
          )
        }
        description={
          <>
            {keepsSetup
              ? 'Moves the agent, channels and contacts you set up without an account into your Human account, and lets the human CLI on your computer use it.'
              : 'Lets the human CLI on your computer use your Human account, so your agents can reach you and your contacts.'}{' '}
            Enter the code <Command>human login</Command> shows in your terminal. If you didn&apos;t just run it
            yourself, close this page.
          </>
        }
      >
        {cannotKeepSetup && (
          <p
            role="alert"
            className="mb-4 rounded-md bg-accent/10 px-3 py-2 text-sm tracking-tight text-foreground ring-1 ring-accent/40"
          >
            Your Human account already has an agent, so the setup on your computer can’t be moved into it. You can still
            log in: the CLI will then use your account’s agent, and that setup stays behind.
          </p>
        )}
        <CliLoginForm claim={keepsSetup ? claim : ''} region={region} />
        {email && (
          <p className="mt-6 text-sm tracking-tight text-foreground/60">
            Signed in as {email}.{' '}
            <SignOutButton redirectUrl={loginPath}>
              <button type="button" className="cursor-pointer underline underline-offset-4 hover:text-foreground">
                Use another account
              </button>
            </SignOutButton>
          </p>
        )}
      </Panel>
    </SiteFrame>
  );
}
