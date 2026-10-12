import 'server-only';

import type { HumanAccount } from './human-account';
import { requestForAccount, requestPageForAccount } from './human-api-key';

const DEFAULT_PAGE_SIZE = 50;
/** `MAX_CONTACTS_LIMIT` of the API. */
const MAX_PAGE_SIZE = 100;

export type Contact = {
  /** What agents pass to `--to`. */
  id: string;
  /** First and last name, falling back to the id. */
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  /** Where the relay agent can reach them, one entry per kind of channel. Empty until they connect one. */
  channels: ContactChannel[];
  /** The channel used when a question doesn't name one. */
  defaultVia?: ContactChannelVia;
  /** `joined` once they're reachable on a channel; `invite_sent` until then. */
  status: ContactStatus;
  /** The newest invite link that still works. Missing when none was sent, or it expired or was declined. */
  invite?: ContactInvite;
  createdAt: string;
  updatedAt: string;
};

export type ContactChannelVia = 'telegram' | 'slack' | 'email';

export type ContactChannel = {
  via: ContactChannelVia;
  /** ISO timestamp when they connected it. Email has none. */
  connectedAt?: string;
  isDefault: boolean;
};

export type ContactStatus = 'joined' | 'invite_sent';

export type ContactInvite = {
  /** The invite page to send them. */
  url?: string;
  /** ISO timestamp when the link stops working. */
  expiresAt: string;
};

export type ContactsPage = {
  contacts: Contact[];
  /** Pass it as `after` for the next page; `null` on the last one. */
  next: string | null;
};

export type RemovedContact = {
  id: string;
  /** How many open questions to them were cancelled. */
  canceledInteractions: number;
};

type ApiContact = Omit<Contact, 'name' | 'channels' | 'status'> & {
  channels?: ContactChannel[];
  status?: ContactStatus;
};

/** One page of the operator's contacts. */
export async function listContactsPage(
  account: HumanAccount,
  { after, limit = DEFAULT_PAGE_SIZE }: { after?: string; limit?: number } = {}
): Promise<ContactsPage> {
  const page = await requestPageForAccount<{ data?: ApiContact[]; next?: string | null }>(
    account,
    '/v1/human/contacts',
    { query: { limit: Math.min(Math.max(limit, 1), MAX_PAGE_SIZE), after } }
  );
  const contacts = Array.isArray(page?.data) ? page.data : [];

  return { contacts: contacts.map(toContact), next: page?.next || null };
}

/**
 * Removes a contact for good: their invite links stop working, the open questions to them are cancelled
 * and agents can no longer reach them.
 */
export function removeContact(account: HumanAccount, contactId: string): Promise<RemovedContact> {
  return requestForAccount<RemovedContact>(account, `/v1/human/contacts/${encodeURIComponent(contactId)}`, {
    method: 'DELETE',
  });
}

function toContact(contact: ApiContact): Contact {
  return {
    id: contact.id,
    name: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    channels: Array.isArray(contact.channels) ? contact.channels : [],
    defaultVia: contact.defaultVia,
    status: contact.status === 'joined' ? 'joined' : 'invite_sent',
    invite: contact.invite,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  };
}
