import { createHash } from 'node:crypto';
import { type Contact, getContact, listContacts } from '../api/agent-inbox';
import { type ApiClient, ApiError } from '../api/client';
import { CLI_COMMAND } from '../config';
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

function localPart(email: string): string {
  const address = email.trim().toLowerCase();

  return address.slice(0, address.indexOf('@'));
}

/** Matches the API's `maskEmail`: a single contact's email channel only ever shows the address like this. */
export function maskEmail(email: string): string {
  const address = email.trim();
  const at = address.indexOf('@');

  return at <= 0 ? '***' : `${address.charAt(0)}***@${address.slice(at + 1)}`;
}

/**
 * Only an email channel this relay verified binds an address to a contact. The profile email is a shared
 * field anyone can set, so it is never taken as proof that the contact owns the mailbox.
 */
function hasVerifiedAddress(contact: Contact, email: string): boolean {
  const address = email.trim().toLowerCase();

  return (contact.channels ?? []).some(
    (channel) => channel.via === 'email' && channel.address?.toLowerCase() === address
  );
}

/** Whether this relay verified exactly this address for the named contact. Others with it don't matter. */
export async function hasVerifiedEmail(
  client: ApiClient,
  agentIdentifier: string,
  contactId: string,
  email: string
): Promise<boolean> {
  const { data } = await listContacts(client, { subscriberId: contactId, agentIdentifier });

  return data.some((contact) => contact.id === contactId && hasVerifiedAddress(contact, email));
}

/** The contact this relay verified the address for. More than one is ambiguous, so it refuses to pick. */
export async function findContactByEmail(
  client: ApiClient,
  agentIdentifier: string,
  email: string
): Promise<Contact | null> {
  const matches: Contact[] = [];
  let after: string | undefined;

  for (let page = 0; page < MAX_CONTACT_PAGES; page++) {
    const result = await listContacts(client, { limit: 100, agentIdentifier, ...(after ? { after } : {}) });
    matches.push(...result.data.filter((contact) => hasVerifiedAddress(contact, email)));

    if (!result.next) {
      break;
    }

    after = result.next;
  }

  if (matches.length > 1) {
    throw new Error(
      `${email} is verified for more than one contact (${matches.map((contact) => contact.id).join(', ')}). Pass the contact id instead.`
    );
  }

  return matches[0] ?? null;
}

/**
 * Whether a new contact for `email` may use `id`: nobody has it yet, or it is the contact an earlier invite
 * made for this same address and is still waiting for the click. Then the invite is sent to it again
 * instead of making a second contact. A single contact shows its address only masked, so the mask stands
 * in for the address; that is safe because only an address whose own name is the plain id is offered it.
 */
async function idFitsNewcomer(client: ApiClient, id: string, agentIdentifier: string, email: string): Promise<boolean> {
  let contact: Contact;
  try {
    contact = await getContact(client, id, agentIdentifier);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return true;
    }

    throw err;
  }

  const channel = contact.channels?.find((candidate) => candidate.via === 'email');

  return channel !== undefined && channel.status !== 'verified' && channel.address === maskEmail(email);
}

export interface EmailContact {
  id: string;
  /** False when this relay has not verified the address for anyone, so `id` is the one to invite. */
  exists: boolean;
}

/**
 * Who an email address stands for: the contact this relay verified it for, or the id to invite it as.
 * The plain id from the address is used unless it belongs to someone else, or `reserved` holds it
 * (another new address in the same command).
 */
export async function resolveEmailContact(
  client: ApiClient,
  agentIdentifier: string,
  email: string,
  reserved: ReadonlySet<string> = new Set()
): Promise<EmailContact> {
  const existing = await findContactByEmail(client, agentIdentifier, email);
  if (existing) {
    return { id: existing.id, exists: true };
  }

  // The plain id goes only to an address whose name is already a clean id (`alice`, not `bob+dev`), so the
  // plain id and the mask together point at one address. Any other address gets the id with its hash.
  const plainId = contactIdFromEmail(email);
  const candidates =
    plainId === localPart(email) ? [plainId, contactIdFromEmail(email, true)] : [contactIdFromEmail(email, true)];

  for (const id of candidates) {
    if (!reserved.has(id) && (await idFitsNewcomer(client, id, agentIdentifier, email))) {
      return { id, exists: false };
    }
  }

  throw new Error(
    `Could not pick a contact id for ${email}. Choose one: ${CLI_COMMAND} contact invite <id> --via email --email ${email}`
  );
}
