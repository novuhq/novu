import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AgentSetupBanner } from '@/components/dashboard/agent-setup-banner';
import { PageHeader } from '@/components/dashboard/page-header';
import { requireHumanAccount } from '@/lib/human-account';
import { DEFAULT_AGENT_NAME, getRelayAgent, type RelayAgent } from '@/lib/human-agent-api';
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

/**
 * The people the operator's agent can ask. The API pages with a cursor that only goes forward, so
 * `?after=` holds the cursor of every page opened so far: the last one is the page shown, and
 * "Previous" drops it.
 *
 * Until `human setup` has made the agent, nobody can be asked or invited: the list stays empty and a
 * banner sends the operator to the Agent page.
 */
export default async function ContactsPage(props: PageProps<'/contacts'>) {
  const account = await requireHumanAccount({ returnTo: CONTACTS_PATH });
  const { after } = await props.searchParams;
  const cursors = (Array.isArray(after) ? after : [after]).filter(
    (cursor): cursor is string => typeof cursor === 'string' && CURSOR_PATTERN.test(cursor)
  );

  const agent = await getRelayAgent(account);
  if (!agent) {
    return (
      <>
        <PageHeader title="Contacts" description="People your agent can ask." />
        <AgentSetupBanner>
          Contacts are the people your agent can ask. Once it&apos;s set up, you&apos;re the first one and you invite
          the others here.
        </AgentSetupBanner>
        <ContactsTable
          contacts={[]}
          operatorContactId={null}
          agentName="your agent"
          rangeLabel={describeRange(0, 0, false)}
          previousHref={null}
          nextHref={null}
        />
      </>
    );
  }

  const agentName = sentenceName(agent);
  const [page, operatorContactId] = await Promise.all([
    listContactsPage(account, { after: cursors.at(-1), limit: PAGE_SIZE }),
    findOperatorContactId(account),
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

/** The agent's name inside a sentence: its own, or "your agent" until the operator names it. */
function sentenceName(agent: RelayAgent): string {
  const name = agent.name?.trim();

  return name && name !== DEFAULT_AGENT_NAME ? name : 'your agent';
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
