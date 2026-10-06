import { auth } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Panel } from '@/components/site/panel';
import { SiteFrame } from '@/components/site/site-frame';
import type { HumanRegion } from '@/lib/human-accounts-api';

import { ClaimForm } from './claim-form';

export const metadata: Metadata = {
  title: 'Keep your setup',
  robots: { index: false, follow: false },
  // The claim token is in the URL; keep it out of the Referer.
  referrer: 'origin',
};

/**
 * Opened from the link an agent gets once its keyless setup runs out of free messages
 * (`…/claim?token=…`, plus `&region=eu` from the EU API). Signing up comes first.
 */
export default async function ClaimPage(props: PageProps<'/claim'>) {
  const searchParams = await props.searchParams;
  const token = typeof searchParams.token === 'string' ? searchParams.token : '';
  const region: HumanRegion = searchParams.region === 'eu' ? 'eu' : 'us';

  const { userId } = await auth();
  if (!userId && token) {
    const claimPath = `/claim?${new URLSearchParams({ token, ...(region === 'eu' ? { region } : {}) })}`;
    redirect(`/sign-up?${new URLSearchParams({ redirect_url: claimPath })}`);
  }

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
          token
            ? 'Move the agent, channels and contacts you set up without an account into your Human account.'
            : 'This page needs the link your agent sent you. Open it from there.'
        }
      >
        {token && <ClaimForm token={token} region={region} />}
      </Panel>
    </SiteFrame>
  );
}
