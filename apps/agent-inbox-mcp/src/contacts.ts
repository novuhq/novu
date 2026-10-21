import type { AgentInboxApi } from './agent-inbox-api';

/** A page as long as one of `contact list` in the CLI. */
export const DEFAULT_CONTACTS_LIMIT = 50;
export const MAX_CONTACTS_LIMIT = 100;

type ContactRow = { id: string; firstName?: string; lastName?: string; email?: string };
type ContactsPage = { data?: ContactRow[]; next?: string | null };

/**
 * One page of contacts for `contact_list`, a line each, as `contact list` prints them in the CLI: the id to
 * pass as `to`, the name and the email, with the operator marked `(you)`. A cursor for the next page ends it.
 */
export async function contactListText(
  api: AgentInboxApi,
  { limit, after }: { limit?: number; after?: string }
): Promise<string> {
  const [page, operator] = await Promise.all([
    // `getRaw`: the API already answers `{ data, next }`, and unwrapping would throw `next` away.
    api.getRaw<ContactsPage>('/v1/contacts', { limit: limit ?? DEFAULT_CONTACTS_LIMIT, ...(after ? { after } : {}) }),
    // Only marks the operator's line: without it, the list is still right.
    api
      .get<{ subscriberId?: string }>('/v1/operator')
      .catch(() => null),
  ]);
  const contacts = page?.data ?? [];

  if (contacts.length === 0) {
    return after
      ? 'No more contacts.'
      : 'There is nobody to reach yet. Set up Agent Inbox on agentinbox.md, or use contact_invite.';
  }

  const lines = contacts.map((contact) => {
    const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ');
    const self = contact.id === operator?.subscriberId ? ' (you)' : '';

    return `${[contact.id, name, contact.email].filter(Boolean).join(' · ')}${self}`;
  });

  if (page?.next) {
    lines.push(`\nMore: call contact_list with after: "${page.next}".`);
  }

  return lines.join('\n');
}
