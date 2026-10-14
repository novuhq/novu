import type { Metadata } from 'next';

import { PageHeader } from '@/components/dashboard/page-header';
import { PutToWork } from '@/components/dashboard/put-to-work';
import { SetupNotFinishedBanner } from '@/components/dashboard/setup-banners';
import { requireHumanAccount } from '@/lib/human-account';
import { isSetupUnfinished, loadSetupSummary, requireSetUpAgent } from '@/lib/human-onboarding';

export const metadata: Metadata = {
  title: 'Inbox',
};

/**
 * The dashboard's home. The threads and the thread drawer come with NV-9036; until then the page says
 * where the agent's messages are, so the new navigation has somewhere to land.
 *
 * What the onboarding leaves behind shows here already: the way back into a setup that was skipped, and
 * the list of first things to do once it's done.
 */
export default async function InboxPage() {
  const account = await requireHumanAccount({ returnTo: '/inbox' });
  const setup = await loadSetupSummary(account, await requireSetUpAgent(account));
  const { agent } = setup;

  return (
    <>
      {isSetupUnfinished(setup.step) && (
        <SetupNotFinishedBanner handle={agent.handle} step={setup.step} waiting={setup.waiting} />
      )}
      <PageHeader title="Inbox" description="Every message your agent gets, on every channel." />
      <p className="rounded-lg border border-border px-5 py-4.5 text-[13px] leading-4.5 text-secondary">
        The threads will show up here soon. For now your agent reads them from its terminal.
      </p>
      {!isSetupUnfinished(setup.step) && !setup.checklist.hidden && (
        <PutToWork
          handle={agent.handle}
          address={agent.address}
          cardLink={agent.cardLink}
          done={setup.checklist.done}
          telegramConnected={setup.telegramConnected}
        />
      )}
    </>
  );
}
