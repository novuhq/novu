import { currentUser } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DASHBOARD_HOME } from '@/components/dashboard/nav';
import { Panel } from '@/components/site/panel';
import { SiteFrame } from '@/components/site/site-frame';
import { buttonClassName } from '@/components/ui/button';
import type { HumanRegion } from '@/lib/human-accounts-api';
import { accountHasAgent } from '@/lib/human-agent-api';

import { ClaimForm } from './claim-form';

export const metadata: Metadata = {
  title: 'Keep your setup',
  robots: { index: false, follow: false },
  // The claim token is in the URL; keep it out of the Referer.
  referrer: 'origin',
};

/**
 * Opened from the link an agent gets once its keyless setup runs out of free messages
 * (`…/claim?token=…`, plus `&region=eu` from the EU API). Signing up comes first. An account that
 * already has an agent can't take another setup in, so it's told so instead of being offered the move.
 */
export default async function ClaimPage(props: PageProps<'/claim'>) {
  const searchParams = await props.searchParams;
  const token = typeof searchParams.token === 'string' ? searchParams.token : '';
  const region: HumanRegion = searchParams.region === 'eu' ? 'eu' : 'us';

  const user = await currentUser();
  if (!user && token) {
    const claimPath = `/claim?${new URLSearchParams({ token, ...(region === 'eu' ? { region } : {}) })}`;
    redirect(`/sign-up?${new URLSearchParams({ redirect_url: claimPath })}`);
  }

  const hasAgent = user && token ? await accountHasAgent(user) : false;

  return (
    <SiteFrame className="px-4 py-14 md:px-8 md:py-20">
      <Panel
        eyebrow="your setup"
        title={
          <>
            Keep <em className="font-display tracking-tight text-accent">this setup</em>
          </>
        }
        description={
          !token
            ? 'This page needs the link your agent sent you. Open it from there.'
            : hasAgent
              ? 'This link moves a setup made without an account into a Human account.'
              : 'Move the agent, channels and contacts you set up without an account into your Human account.'
        }
      >
        {token && !hasAgent && <ClaimForm token={token} region={region} />}
        {hasAgent && (
          <div className="flex flex-col items-start gap-4">
            <p
              role="alert"
              className="rounded-md bg-accent/10 px-3 py-2 text-sm tracking-tight text-foreground ring-1 ring-accent/40"
            >
              Your Human account already has an agent, so this setup can’t be moved into it. Nothing was changed: your
              account keeps the agent, channels and contacts it has, and the setup made without an account stays where
              it is.
            </p>
            <a href={DASHBOARD_HOME} className={buttonClassName('secondary')}>
              Go to your dashboard
            </a>
          </div>
        )}
      </Panel>
    </SiteFrame>
  );
}
