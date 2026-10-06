import 'server-only';

import type { HumanAccount } from './human-account';
import { notAvailableYet } from './human-api';
import { requestPageForAccount } from './human-api-key';

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
  createdAt: string;
  updatedAt: string;
};

export type ContactsPage = {
  contacts: Contact[];
  /** Pass it as `after` for the next page; `null` on the last one. */
  next: string | null;
};

/** Which channels a contact connected, and which one is their default. */
export type ContactChannelStatus = {
  via: 'telegram' | 'slack' | 'email';
  connected: boolean;
  isDefault: boolean;
};

type ApiContact = Omit<Contact, 'name'>;

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

/** Every contact, following the cursor to the last page. */
export async function listAllContacts(account: HumanAccount): Promise<Contact[]> {
  const contacts: Contact[] = [];
  let after: string | undefined;

  do {
    const page = await listContactsPage(account, { after, limit: MAX_PAGE_SIZE });
    contacts.push(...page.contacts);
    // A cursor that doesn't move would loop forever.
    after = page.next && page.next !== after ? page.next : undefined;
  } while (after);

  return contacts;
}

/** Not in the API yet. */
export async function removeContact(_account: HumanAccount, _contactId: string): Promise<void> {
  notAvailableYet('Removing a contact');
}

/** Not in the API yet: contacts come back without their channels. */
export async function listContactChannels(_account: HumanAccount, _contactId: string): Promise<ContactChannelStatus[]> {
  notAvailableYet('Seeing a contact’s channels');
}

function toContact(contact: ApiContact): Contact {
  return {
    id: contact.id,
    name: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  };
}
