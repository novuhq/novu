import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/dashboard/page-header';
import { buildChannelPrompt } from '@/lib/agent-setup-prompt';
import { requireHumanAccount } from '@/lib/human-account';
import { agentDisplayName } from '@/lib/human-agent-api';
import { listChannels } from '@/lib/human-channels-api';
import { type Contact, listContactsPage } from '@/lib/human-contacts-api';
import { handleOf, requireSetUpAgent } from '@/lib/human-onboarding';
import { resolveNovuApiUrl } from '@/lib/novu-api';

import { ContactsTable } from './contacts-table';
import { InviteBanner } from './invite-banner';

export const metadata: Metadata = {
  title: 'Contacts',
};

const CONTACTS_PATH = '/contacts';
const PAGE_SIZE = 50;

/** The API's cursor is the id of the last contact on a page: 24 hex characters. */
const CURSOR_PATTERN = /^[a-f0-9]{24}$/i;

/**
 * The people the operator's agent can message (`5.1 · Contacts`), with their own row opening their contact
 * card. The API pages with a cursor that only goes forward, so `?after=` holds the cursor of every page
 * opened so far: the last one is the page shown, and "Previous" drops it.
 *
 * Without an agent nobody can be asked or invited, so an operator who has none yet is sent to the
 * onboarding, which makes it.
 */
export default async function ContactsPage(props: PageProps<'/contacts'>) {
  const account = await requireHumanAccount({ returnTo: CONTACTS_PATH });
  const { after } = await props.searchParams;
  const cursors = (Array.isArray(after) ? after : [after]).filter(
    (cursor): cursor is string => typeof cursor === 'string' && CURSOR_PATTERN.test(cursor)
  );

  const { agent, state, user } = await requireSetUpAgent(account);
  const channels = await listChannels(account).catch(() => []);
  const emailAddress = channels.find((channel) => channel.via === 'email' && channel.active)?.address;
  const handle = handleOf(agent, state, emailAddress);
  const page = await listContactsPage(account, { after: cursors.at(-1), limit: PAGE_SIZE });

  // The API answers a cursor it no longer knows (that contact was removed since) with an empty page.
  // Step back a page rather than show an empty list while earlier contacts remain.
  if (cursors.length > 0 && page.contacts.length === 0) {
    redirect(pageHref(cursors.slice(0, -1)));
  }

  const prompts = { apiUrl: resolveNovuApiUrl(account.region) };

  return (
    <>
      <PageHeader title="Contacts" description={`People ${handle} can message. Their messages skip screening.`} />
      <InviteBanner />
      <ContactsTable
        contacts={operatorFirst(page.contacts)}
        pageKey={cursors.at(-1) ?? 'first'}
        agentHandle={handle}
        rangeLabel={describeRange(cursors.length, page.contacts.length, page.next !== null)}
        previousHref={cursors.length > 0 ? pageHref(cursors.slice(0, -1)) : null}
        nextHref={page.next ? pageHref([...cursors, page.next]) : null}
        card={{
          signInEmail: user?.primaryEmailAddress?.emailAddress ?? null,
          telegramPrompt: buildChannelPrompt(prompts, 'telegram', handle),
          slackPrompt: buildChannelPrompt(prompts, 'slack', handle),
          slackAppName: agentDisplayName(agent),
        }}
      />
    </>
  );
}

/** The API lists the newest contact first, which puts the operator last; their row leads the page it's on. */
function operatorFirst(contacts: Contact[]): Contact[] {
  return [...contacts].sort((a, b) => Number(b.isOperator) - Number(a.isOperator));
}

/** "1–3 of 3" on the last page. Before it the API gives no total, so it reads "1–50 of 50+". */
function describeRange(pagesBefore: number, shown: number, hasMore: boolean): string {
  const before = pagesBefore * PAGE_SIZE;

  if (shown === 0) {
    return `0 of ${before}`;
  }

  const last = before + shown;

  return `${before + 1}–${last} of ${last}${hasMore ? '+' : ''}`;
}

function pageHref(cursors: string[]): string {
  const query = new URLSearchParams(cursors.map((cursor) => ['after', cursor]));

  return query.size > 0 ? `${CONTACTS_PATH}?${query}` : CONTACTS_PATH;
}
