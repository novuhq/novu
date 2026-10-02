import { auth } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Command } from '@/components/site/command';
import { Panel } from '@/components/site/panel';
import { SiteFrame } from '@/components/site/site-frame';
import type { HumanRegion } from '@/lib/human-accounts-api';

import { CliLoginForm } from './cli-login-form';

export const metadata: Metadata = {
  title: 'Log in to human',
  robots: { index: false, follow: false },
  // The login code and claim token are in the URL; keep them out of the Referer.
  referrer: 'origin',
};

/**
 * Opened by `human login` (`…/cli/login?code=…`, plus `&region=eu` from the EU API). When the CLI has a
 * setup made without an account, `&claim=…` carries its claim token, so logging in also keeps that setup.
 */
export default async function CliLoginPage(props: PageProps<'/cli/login'>) {
  const searchParams = await props.searchParams;
  const code = typeof searchParams.code === 'string' ? searchParams.code : '';
  const claim = typeof searchParams.claim === 'string' ? searchParams.claim : '';
  const region: HumanRegion = searchParams.region === 'eu' ? 'eu' : 'us';

  const { userId } = await auth();
  if (!userId && code) {
    const loginPath = `/cli/login?${new URLSearchParams({
      code,
      ...(claim ? { claim } : {}),
      ...(region === 'eu' ? { region } : {}),
    })}`;
    // Someone keeping a setup made without an account is usually new; anyone else likely has an account.
    redirect(`${claim ? '/sign-up' : '/sign-in'}?${new URLSearchParams({ redirect_url: loginPath })}`);
  }

  return (
    <SiteFrame className="px-4 py-14 md:px-8 md:py-20">
      <Panel
        eyebrow="human login"
        title={
          claim ? (
            <>
              Keep your setup and <em className="font-display tracking-tight text-accent">log in</em>
            </>
          ) : (
            <>
              Log in to <em className="font-display tracking-tight text-accent">human</em>
            </>
          )
        }
        description={<Description code={code} claim={claim} />}
      >
        {code && <CliLoginForm code={code} claim={claim} region={region} />}
      </Panel>
    </SiteFrame>
  );
}

function Description({ code, claim }: { code: string; claim: string }) {
  if (!code) {
    return (
      <>
        This page needs the link that <Command>human login</Command> prints. Run it in your terminal.
      </>
    );
  }

  return (
    <>
      {claim
        ? 'Moves the agent, channels and contacts you set up without an account into your Human account, and lets the human CLI on your computer use it.'
        : 'Lets the human CLI on your computer use your Human account, so your agents can reach you and your contacts.'}{' '}
      Only continue if you just ran <Command>human login</Command> yourself.
    </>
  );
}
