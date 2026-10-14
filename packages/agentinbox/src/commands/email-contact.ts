import { createHash } from 'node:crypto';
import { type Contact, getContact, listContacts } from '../api/agent-inbox';
import { type ApiClient, ApiError } from '../api/client';
import { parseEmailAddress } from './link-channel';

/** Enough pages to cover every contact the API lets one environment list (100 per page). */
const MAX_CONTACT_PAGES = 50;

/** `alice@acme.com` is an email address; `alice` is a contact id. */
export function isEmailAddress(value: string): boolean {
  return value.includes('@') && parseEmailAddress(value) !== null;
}

/**
 * The contact id an email address gets: the part before the `@`, lowercased, with anything but
 * letters, digits, dots, dashes and underscores turned into dashes. With `withSuffix`, a short hash of
 * the whole address is added, so `alice@acme.com` and `alice@gmail.com` stay two contacts, and asking
 * twice for the same address gives the same id.
 */
export function contactIdFromEmail(email: string, withSuffix = false): string {
  const address = email.trim().toLowerCase();
  const local = address.slice(0, address.indexOf('@'));
  const base =
    local
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '')
      .slice(0, 50) || 'contact';

  if (!withSuffix) {
    return base;
  }

  return `${base}-${createHash('sha256').update(address).digest('hex').slice(0, 6)}`;
}

function hasAddress(contact: Contact, email: string): boolean {
  const address = email.trim().toLowerCase();

  return (
    contact.email?.toLowerCase() === address ||
    (contact.channels ?? []).some((channel) => channel.via === 'email' && channel.address?.toLowerCase() === address)
  );
}

/** The contact that already has this email address, on its profile or as its email channel. */
export async function findContactByEmail(
  client: ApiClient,
  agentIdentifier: string,
  email: string
): Promise<Contact | null> {
  let after: string | undefined;

  for (let page = 0; page < MAX_CONTACT_PAGES; page++) {
    const result = await listContacts(client, { limit: 100, agentIdentifier, ...(after ? { after } : {}) });
    const match = result.data.find((contact) => hasAddress(contact, email));

    if (match) {
      return match;
    }

    if (!result.next) {
      return null;
    }

    after = result.next;
  }

  return null;
}

async function contactExists(client: ApiClient, id: string, agentIdentifier: string): Promise<boolean> {
  try {
    await getContact(client, id, agentIdentifier);

    return true;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return false;
    }

    throw err;
  }
}

export interface EmailContact {
  id: string;
  /** False when no contact has this address yet, so `id` is the one a new contact gets. */
  exists: boolean;
}

/**
 * Who an email address stands for: the contact that has it, or the id a new contact for it gets.
 * The plain id from the address is used unless another contact already has it.
 */
export async function resolveEmailContact(
  client: ApiClient,
  agentIdentifier: string,
  email: string
): Promise<EmailContact> {
  const existing = await findContactByEmail(client, agentIdentifier, email);
  if (existing) {
    return { id: existing.id, exists: true };
  }

  const id = contactIdFromEmail(email);
  if (!(await contactExists(client, id, agentIdentifier))) {
    return { id, exists: false };
  }

  return { id: contactIdFromEmail(email, true), exists: false };
}
