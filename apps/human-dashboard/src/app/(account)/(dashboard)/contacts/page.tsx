import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/dashboard/page-header';
import { type HumanAccount, requireHumanAccount } from '@/lib/human-account';
import { getRelayAgent } from '@/lib/human-agent-api';
import { type Contact, listContactsPage } from '@/lib/human-contacts-api';
import { findOperatorContactId } from '@/lib/human-operator';

import { ContactsTable } from './contacts-table';
import { InviteBanner } from './invite-banner';

export const metadata: Metadata = {
  title: 'Contacts',
};

const CONTACTS_PATH = '/contacts';
const PAGE_SIZE = 50;

/** The API's cursor is the id of the last contact on a page: 24 hex characters. */
const CURSOR_PATTERN = /^[a-f0-9]{24}$/i;

/** What the relay agent is called until the operator names it (the Agent page, NV-8966). */
const UNNAMED_AGENT_NAME = 'Human';

/**
 * The people the operator's agent can ask. The API pages with a cursor that only goes forward, so
 * `?after=` holds the cursor of every page opened so far: the last one is the page shown, and
 * "Previous" drops it.
 */
export default async function ContactsPage(props: PageProps<'/contacts'>) {
  const account = await requireHumanAccount({ returnTo: CONTACTS_PATH });
  const { after } = await props.searchParams;
  const cursors = (Array.isArray(after) ? after : [after]).filter(
    (cursor): cursor is string => typeof cursor === 'string' && CURSOR_PATTERN.test(cursor)
  );

  const [page, operatorContactId, agentName] = await Promise.all([
    listContactsPage(account, { after: cursors.at(-1), limit: PAGE_SIZE }),
    findOperatorContactId(account),
    loadAgentName(account),
  ]);

  // The API answers a cursor it no longer knows (that contact was removed since) with an empty page.
  // Step back a page rather than show an empty list while earlier contacts remain.
  if (cursors.length > 0 && page.contacts.length === 0) {
    redirect(pageHref(cursors.slice(0, -1)));
  }

  return (
    <>
      <PageHeader title="Contacts" description={`People ${agentName} can ask. You're here by default.`} />
      <InviteBanner />
      <ContactsTable
        contacts={operatorFirst(page.contacts, operatorContactId)}
        operatorContactId={operatorContactId}
        agentName={agentName}
        rangeLabel={describeRange(cursors.length, page.contacts.length, page.next !== null)}
        previousHref={cursors.length > 0 ? pageHref(cursors.slice(0, -1)) : null}
        nextHref={page.next ? pageHref([...cursors, page.next]) : null}
      />
    </>
  );
}

/** The agent's name is only wording here, so the page still loads when it can't be read. */
async function loadAgentName(account: HumanAccount): Promise<string> {
  try {
    const name = (await getRelayAgent(account))?.name?.trim();

    return name && name !== UNNAMED_AGENT_NAME ? name : 'your agent';
  } catch (error) {
    console.error('Failed to load the relay agent for the Contacts page', error);

    return 'your agent';
  }
}

/** The API lists the newest contact first, which puts the operator last; their row leads the page it's on. */
function operatorFirst(contacts: Contact[], operatorContactId: string | null): Contact[] {
  return [...contacts].sort((a, b) => Number(b.id === operatorContactId) - Number(a.id === operatorContactId));
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
