import { type AgentInboxApi, AgentInboxApiError } from './agent-inbox-api';

const MAX_CONTACT_PAGES = 5;
const CONTACTS_PAGE_SIZE = 100;

type Contact = {
  id: string;
  email?: string;
  channels?: Array<{ via: string; status?: 'unverified' | 'pending' | 'verified'; address?: string }>;
};

type ContactsPage = {
  data: Contact[];
  next: string | null;
};

/** `alice@acme.com` is an email address; `alice` is a contact id. */
export function isEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function localPart(email: string): string {
  const address = email.trim().toLowerCase();

  return address.slice(0, address.indexOf('@'));
}

async function shortHash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 6);
}

/** Produces the same stable contact ids as the CLI without depending on Node's crypto module. */
export async function contactIdFromEmail(email: string, withSuffix = false): Promise<string> {
  const address = email.trim().toLowerCase();
  const local = localPart(address);
  const base =
    local
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '')
      .slice(0, 50) || 'contact';

  return withSuffix ? `${base}-${await shortHash(address)}` : base;
}

export function maskEmail(email: string): string {
  const address = email.trim();
  const at = address.indexOf('@');

  return at <= 0 ? '***' : `${address.charAt(0)}***@${address.slice(at + 1)}`;
}

function hasVerifiedAddress(contact: Contact, email: string): boolean {
  const address = email.trim().toLowerCase();

  return (contact.channels ?? []).some(
    (channel) => channel.via === 'email' && channel.address?.toLowerCase() === address
  );
}

async function listContacts(api: AgentInboxApi, after?: string): Promise<ContactsPage> {
  const page = await api.getRaw<{ data?: Contact[]; next?: string | null }>('/v1/contacts', {
    limit: CONTACTS_PAGE_SIZE,
    after,
  });

  return { data: Array.isArray(page.data) ? page.data : [], next: page.next ?? null };
}

/** Finds a verified address while bounding MCP call latency to five contact pages. */
export async function findContactByEmail(api: AgentInboxApi, email: string): Promise<Contact | null> {
  const matches: Contact[] = [];
  let after: string | undefined;

  for (let pageNumber = 0; pageNumber < MAX_CONTACT_PAGES; pageNumber++) {
    const page = await listContacts(api, after);
    matches.push(...page.data.filter((contact) => hasVerifiedAddress(contact, email)));

    if (!page.next) {
      if (matches.length > 1) {
        throw new AgentInboxApiError(
          409,
          `${email} is verified for more than one contact (${matches.map((contact) => contact.id).join(', ')}). Pass a contact id instead.`
        );
      }

      return matches[0] ?? null;
    }

    after = page.next;
  }

  throw new AgentInboxApiError(
    409,
    `Could not safely search every contact for ${email}. Call the contacts tool and pass the contact id instead.`
  );
}

async function getContact(api: AgentInboxApi, id: string): Promise<Contact | null> {
  try {
    return await api.get<Contact>(`/v1/contacts/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof AgentInboxApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

async function idFitsNewcomer(api: AgentInboxApi, id: string, email: string): Promise<boolean> {
  const contact = await getContact(api, id);
  if (!contact) {
    return true;
  }

  const emailChannel = contact.channels?.find((channel) => channel.via === 'email');

  return emailChannel !== undefined && emailChannel.status !== 'verified' && emailChannel.address === maskEmail(email);
}

async function resolveEmailContact(
  api: AgentInboxApi,
  email: string,
  reserved: ReadonlySet<string>
): Promise<{ id: string; exists: boolean }> {
  const existing = await findContactByEmail(api, email);
  if (existing) {
    return { id: existing.id, exists: true };
  }

  const plainId = await contactIdFromEmail(email);
  const candidates =
    plainId === localPart(email)
      ? [plainId, await contactIdFromEmail(email, true)]
      : [await contactIdFromEmail(email, true)];

  for (const id of candidates) {
    if (!reserved.has(id) && (await idFitsNewcomer(api, id, email))) {
      return { id, exists: false };
    }
  }

  throw new AgentInboxApiError(
    409,
    `Could not pick a contact id for ${email}. Use the invite tool with a contact id, then send to that id.`
  );
}

/**
 * Resolves email addresses to verified contact ids. New addresses receive a verification email,
 * but the message itself is not sent until verification succeeds and the caller retries.
 */
export async function resolveEmailRecipients(
  api: AgentInboxApi,
  recipients: string[],
  isReply: boolean
): Promise<string[]> {
  if (!recipients.some(isEmailAddress)) {
    return recipients;
  }

  const resolved: string[] = [];
  const newcomers: Array<{ id: string; email: string }> = [];

  for (const recipient of recipients) {
    if (!isEmailAddress(recipient)) {
      resolved.push(recipient);
      continue;
    }

    const reserved = new Set(newcomers.map((newcomer) => newcomer.id));
    const contact = await resolveEmailContact(api, recipient, reserved);
    if (contact.exists) {
      resolved.push(contact.id);
    } else if (isReply) {
      throw new AgentInboxApiError(
        409,
        `${recipient} is not one of your contacts, so it cannot be in this conversation.`
      );
    } else {
      newcomers.push({ id: contact.id, email: recipient });
    }
  }

  if (newcomers.length > 0) {
    for (const newcomer of newcomers) {
      await api.post('/v1/contacts/verifications', {
        subscriberId: newcomer.id,
        via: 'email',
        address: newcomer.email,
      });
    }

    const who = newcomers.map((newcomer) => newcomer.email).join(', ');
    throw new AgentInboxApiError(
      409,
      `Your message was not sent: ${who} ${newcomers.length === 1 ? 'is' : 'are'} not verified yet. A verification email is on its way; send again once ${newcomers.length === 1 ? 'they have' : 'the recipients have'} clicked it.`
    );
  }

  return resolved;
}
