import 'server-only';

import { cache } from 'react';

import type { HumanAccount } from './human-account';
import { requestForAccount, requestPageForAccount } from './human-api-key';
import type { InboxCounts, InboxThread, InboxThreadsPage, InboxThreadView, InboxView } from './inbox';

/** Threads on one page of the list. The API takes up to 100. */
const PAGE_SIZE = 50;

/** Messages the drawer reads at once, the most the API gives. Older ones load on request. */
const MESSAGES_PAGE_SIZE = 100;

/**
 * The inbox shows every thread the agent is in, strangers' too: a receipt from a shop or a code from a
 * sign-up is mail the agent got. The API lists only threads with a contact unless asked otherwise.
 */
const SENDERS = 'all';

type ApiThreadsPage = { data?: InboxThread[]; next?: string | null };

/** One page of the threads in a view, newest activity first. */
export async function listInboxThreads(
  account: HumanAccount,
  view: InboxView,
  { after }: { after?: string } = {}
): Promise<InboxThreadsPage> {
  const page = await requestPageForAccount<ApiThreadsPage>(account, '/v1/human/inbox', {
    query: { ...viewQuery(view), limit: PAGE_SIZE, after },
  });

  return { threads: Array.isArray(page?.data) ? page.data : [], next: page?.next || null };
}

/**
 * The numbers on the tabs and the channel filter. A tab is counted within the chosen channel and search,
 * and a channel within the chosen tab and search.
 */
export function countInboxThreads(account: HumanAccount, view: InboxView): Promise<InboxCounts> {
  return loadCounts(account, view.tab, view.channel ?? '', view.search?.trim() ?? '');
}

/** Read once per request for the same view, so the sidebar and the page share it. */
const loadCounts = cache(
  (account: HumanAccount, tab: InboxView['tab'], channel: string, search: string): Promise<InboxCounts> =>
    requestForAccount<InboxCounts>(account, '/v1/human/inbox/counts', {
      query: viewQuery({ tab, channel, search }),
    })
);

/**
 * How many threads have something the agent hasn't read: the number on Inbox in the sidebar. The sidebar
 * goes without it rather than fail the page.
 */
export async function countUnreadThreads(account: HumanAccount): Promise<number> {
  try {
    const counts = await countInboxThreads(account, { tab: 'all' });

    return counts.tabs?.unread ?? 0;
  } catch (error) {
    console.error('Failed to count the unread threads', error);

    return 0;
  }
}

/**
 * A thread with its messages, oldest first, its system lines and its Details. `before` is the oldest
 * message already shown, for the page before it.
 *
 * Reading a thread here doesn't mark it read, and the request doesn't say it comes from a host: the
 * operator looking at their agent's inbox is not the agent attending to it.
 */
export async function getInboxThread(
  account: HumanAccount,
  threadId: string,
  { before }: { before?: string } = {}
): Promise<InboxThreadView> {
  return requestForAccount<InboxThreadView>(account, `/v1/human/inbox/${encodeURIComponent(threadId)}`, {
    query: { include: 'system', limit: MESSAGES_PAGE_SIZE, before },
  });
}

function viewQuery(view: InboxView) {
  return {
    senders: SENDERS,
    // Always named, `all` too: without a tab the API lists only open threads, as the CLI does by default,
    // while the All tab and its count take in the resolved ones.
    tab: view.tab,
    channel: view.channel || undefined,
    search: view.search?.trim() || undefined,
  };
}
