'use server';

import { currentUser } from '@clerk/nextjs/server';

import { type HumanAccount, readHumanAccount } from '@/lib/human-account';
import { isHumanApiNotFound } from '@/lib/human-api-error';
import { getInboxThread, listInboxThreads } from '@/lib/human-inbox-api';
import { type InboxThreadsPage, type InboxThreadView, type InboxView, parseInboxParams } from '@/lib/inbox';

const SESSION_ENDED = 'Your session has ended. Sign in again to continue.';

/** Longer than any id the API hands out; anything longer isn't one. */
const MAX_ID_LENGTH = 200;

export type LoadThreadResult = { ok: true; view: InboxThreadView } | { ok: false; error: string };

export type LoadThreadsResult = { ok: true; page: InboxThreadsPage } | { ok: false; error: string };

/**
 * A thread for the drawer, or the page of messages before `before`. Only reads: the thread stays unread
 * for the agent, whatever the operator looks at.
 */
export async function loadThreadAction(threadId: string, before?: string): Promise<LoadThreadResult> {
  const account = await readSignedInAccount();
  if (!account) {
    return { ok: false, error: SESSION_ENDED };
  }

  if (!isId(threadId) || (before !== undefined && !isId(before))) {
    return { ok: false, error: 'This thread can’t be opened.' };
  }

  try {
    return { ok: true, view: await getInboxThread(account, threadId, { before }) };
  } catch (error) {
    if (isHumanApiNotFound(error)) {
      return { ok: false, error: 'This thread is gone. It may have been deleted.' };
    }

    console.error('Failed to load an inbox thread', error);

    return { ok: false, error: 'We couldn’t load this thread. Try again in a moment.' };
  }
}

/** The page of threads after `after`, in the view the list shows. */
export async function loadMoreThreadsAction(view: InboxView, after: string): Promise<LoadThreadsResult> {
  const account = await readSignedInAccount();
  if (!account) {
    return { ok: false, error: SESSION_ENDED };
  }

  if (!isId(after)) {
    return { ok: false, error: 'There are no more threads to show.' };
  }

  // The view comes from the browser, so it goes through the same checks as the page's address.
  const { view: checked } = parseInboxParams({ tab: view?.tab, channel: view?.channel, q: view?.search });

  try {
    return { ok: true, page: await listInboxThreads(account, checked, { after }) };
  } catch (error) {
    console.error('Failed to load more inbox threads', error);

    return { ok: false, error: 'We couldn’t load more threads. Try again in a moment.' };
  }
}

async function readSignedInAccount(): Promise<HumanAccount | null> {
  const user = await currentUser();

  return user ? readHumanAccount(user) : null;
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_ID_LENGTH;
}
