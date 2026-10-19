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
  /** Their email and how far its confirmation got. Missing when no address is known for them. */
  emailVerification?: ContactEmail;
  /** `joined` once they're reachable on a channel; `invite_sent` until then. */
  status: ContactStatus;
  /** The account owner's own contact: the "You" row. */
  isOperator: boolean;
  /** The newest invite link that still works. Missing when none was sent, or it expired or was declined. */
  invite?: ContactInvite;
  createdAt: string;
  updatedAt: string;
};

export type ContactChannelVia = 'telegram' | 'slack' | 'email';

export type ContactChannel = {
  via: ContactChannelVia;
  /** ISO timestamp when they connected it; for email, when the address was confirmed. */
  connectedAt?: string;
  /**
   * How they show on that app: `@username` on Telegram (their name when they have none), their name on Slack.
   * Missing until the agent learns it, when they connect or write.
   */
  handle?: string;
  /** The Slack workspace they're in, such as `acme.slack.com`. */
  workspace?: string;
  isDefault: boolean;
};

/**
 * A contact's email. Agents only write to a `verified` one. `pending` waits for the link that was sent to
 * it; `unverified` was typed at sign-up or setup and never confirmed.
 */
export type ContactEmail = {
  /** The verified address, else the one waiting for its link, else the one never confirmed. */
  address: string;
  status: 'verified' | 'pending' | 'unverified';
  verifiedAt?: string;
  /** A link that's out and not used yet. Next to a verified address it's the new one that replaces it. */
  pending?: { address: string; requestedAt: string };
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

/** What changing the email sends back: where the link went (masked) and how soon another may go. */
export type EmailLinkSent = {
  requestedAt: string;
  expiresAt: string;
  retryAfterSeconds: number;
};

type ApiContact = Omit<Contact, 'name' | 'channels' | 'status' | 'isOperator'> & {
  channels?: ContactChannel[];
  status?: ContactStatus;
  isOperator?: boolean;
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

/**
 * Makes one of the channels the operator is connected on the one agents use when a message names none.
 * The API turns down a channel they aren't connected on (400 `channel_not_connected`).
 */
export async function setOperatorDefaultChannel(account: HumanAccount, via: ContactChannelVia): Promise<void> {
  await requestForAccount(account, '/v1/human/operator/default-channel', { method: 'PUT', body: { via } });
}

/**
 * Sends a confirmation code to a new address for the operator, or to the one they signed up with. Agents
 * keep using a verified address until the new one is confirmed, and the default channel stays as it is.
 */
export function changeOperatorEmail(account: HumanAccount, address: string): Promise<EmailLinkSent> {
  return requestForAccount<EmailLinkSent>(account, '/v1/human/operator/email', {
    method: 'POST',
    body: { address },
  });
}

/** Confirms the operator's pending address with the 6-digit code from the email. */
export function confirmOperatorEmailCode(account: HumanAccount, code: string): Promise<{ verified: true }> {
  return requestForAccount<{ verified: true }>(account, '/v1/human/operator/email/confirm', {
    method: 'POST',
    body: { code },
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
    ...(contact.emailVerification ? { emailVerification: contact.emailVerification } : {}),
    status: contact.status === 'joined' ? 'joined' : 'invite_sent',
    isOperator: contact.isOperator === true,
    invite: contact.invite,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  };
}
