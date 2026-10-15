import type { Metadata } from 'next';

import { PutToWork } from '@/components/dashboard/put-to-work';
import { SetupNotFinishedBanner } from '@/components/dashboard/setup-banners';
import { type HumanAccount, requireHumanAccount } from '@/lib/human-account';
import { isHumanApiNotFound } from '@/lib/human-api-error';
import { listChannels } from '@/lib/human-channels-api';
import { countInboxThreads, getInboxThread, listInboxThreads } from '@/lib/human-inbox-api';
import { isSetupUnfinished, loadSetupSummary, requireSetUpAgent } from '@/lib/human-onboarding';
import { INBOX_PATH, type InboxCounts, type InboxView as InboxViewState, parseInboxParams } from '@/lib/inbox';

import { InboxView } from './inbox-view';
import type { ThreadLoad } from './thread-drawer';

export const metadata: Metadata = {
  title: 'Inbox',
};

/**
 * The dashboard's home: every thread the agent is in, on every channel, as the agent sees them from its
 * terminal. The tab, channel and search are in the address (`?tab=`, `?channel=`, `?q=`), and so is the
 * thread open in the drawer (`?thread=`), so a link or a reload opens the same view.
 *
 * Read-only: the operator looks, the agent's host answers. Nothing here marks a thread read.
 *
 * What the onboarding leaves behind shows here too: the way back into a setup that was skipped, and the
 * list of first things to do once it's done.
 */
export default async function InboxPage(props: PageProps<'/inbox'>) {
  const account = await requireHumanAccount({ returnTo: INBOX_PATH });
  const { view, threadId } = parseInboxParams(await props.searchParams);
  const setupProgress = await requireSetUpAgent(account);
  const [setup, page, counts, initialThread] = await Promise.all([
    loadSetupSummary(account, setupProgress),
    listInboxThreads(account, view),
    countInboxThreads(account, view),
    threadId ? loadInitialThread(account, threadId) : null,
  ]);
  const { agent } = setup;
  // The list and the counts are read side by side, so a first thread can make it into the list after the
  // counts came back at zero: the empty inbox only shows when the list is empty too.
  const empty =
    page.threads.length === 0 && hasNoThreads(view, counts)
      ? { listening: await countListeningChannels(account) }
      : null;

  return (
    <>
      {isSetupUnfinished(setup.step) && (
        <SetupNotFinishedBanner handle={agent.handle} step={setup.step} waiting={setup.waiting} />
      )}
      <InboxView
        view={view}
        page={page}
        counts={counts}
        agent={{ handle: agent.handle, address: agent.address, paused: setupProgress.agent.settings.paused }}
        empty={empty}
        initialThread={initialThread}
        renderedAt={new Date().toISOString()}
      />
      {!isSetupUnfinished(setup.step) && !setup.checklist.hidden && (
        <PutToWork
          handle={agent.handle}
          address={agent.address}
          cardLink={agent.cardLink}
          done={setup.checklist.done}
          secondChannelConnected={setup.secondChannelConnected}
        />
      )}
    </>
  );
}

/**
 * Whether the agent has no thread at all, rather than none in this view. The counts tell it whenever the
 * view leaves one of its two filters at "all": the tabs are counted within the channel, the channels
 * within the tab. A search always has its own answer.
 */
function hasNoThreads(view: InboxViewState, counts: InboxCounts): boolean {
  if (view.search) {
    return false;
  }

  if (!view.channel) {
    return counts.tabs.all === 0;
  }

  return view.tab === 'all' && counts.channels.all === 0;
}

/** The thread a link opens. One that is gone, or fails, opens the drawer on what went wrong. */
async function loadInitialThread(account: HumanAccount, threadId: string): Promise<{ id: string; load: ThreadLoad }> {
  try {
    return { id: threadId, load: { status: 'ready', view: await getInboxThread(account, threadId) } };
  } catch (error) {
    if (isHumanApiNotFound(error)) {
      return { id: threadId, load: { status: 'error', error: 'This thread is gone. It may have been deleted.' } };
    }

    console.error('Failed to load the thread the address opens', error);

    return { id: threadId, load: { status: 'error', error: 'We couldn’t load this thread. Try again in a moment.' } };
  }
}

/**
 * The channels people can reach the agent on: its address, and Telegram and Slack once connected. `null`
 * when they couldn't be read: the empty inbox then leaves the number out rather than guess it.
 */
async function countListeningChannels(account: HumanAccount): Promise<number | null> {
  try {
    const channels = await listChannels(account);
    const listening = channels.filter((channel) => channel.via && channel.active && channel.connected);

    return new Set(listening.map((channel) => channel.via)).size;
  } catch (error) {
    console.error('Failed to count the channels for the empty inbox', error);

    return null;
  }
}
