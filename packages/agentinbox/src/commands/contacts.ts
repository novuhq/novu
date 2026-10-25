import pc from 'picocolors';
import { type Contact, listContacts } from '../api/agent-inbox';
import { clientFromConfig, handleError } from './interact';

export const DEFAULT_CONTACTS_LIMIT = 50;
export const MAX_CONTACTS_LIMIT = 100;

export interface ContactsOptions {
  limit?: string;
  /** `next` cursor from a previous page. */
  after?: string;
  json?: boolean;
  apiUrl?: string;
}

export type ContactRow = Contact & { self: boolean };

export function parseContactsLimit(raw: string | undefined): number {
  if (raw === undefined || raw === '') {
    return DEFAULT_CONTACTS_LIMIT;
  }

  const limit = Number(raw);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_CONTACTS_LIMIT) {
    throw new Error(`--limit must be a whole number between 1 and ${MAX_CONTACTS_LIMIT}.`);
  }

  return limit;
}

/** Marks the operator's own row so agents don't page you as a third party. */
export function markSelf(contacts: Contact[], selfSubscriberId: string | undefined): ContactRow[] {
  return contacts.map((contact) => ({
    ...contact,
    self: selfSubscriberId !== undefined && contact.id === selfSubscriberId,
  }));
}

export function displayName(contact: Contact): string {
  return [contact.firstName, contact.lastName].filter(Boolean).join(' ');
}

export function renderContactsTable(rows: ContactRow[], next: string | null): string {
  if (rows.length === 0) {
    return 'No contacts found. Run `npx @agentinbox/cli setup` or `npx @agentinbox/cli contact invite <id> --via <channel>` to add people.\n';
  }

  const idWidth = Math.max(...rows.map((row) => row.id.length), 'ID'.length);
  const nameWidth = Math.max(...rows.map((row) => displayName(row).length), 'NAME'.length);
  const lines = [pc.dim(`${'ID'.padEnd(idWidth)}  ${'NAME'.padEnd(nameWidth)}  EMAIL`)];

  for (const row of rows) {
    const name = displayName(row) || pc.dim('—');
    const email = formatEmailColumn(row);
    const self = row.self ? pc.cyan(' (you)') : '';
    lines.push(`${row.id.padEnd(idWidth)}  ${name.padEnd(nameWidth)}  ${email}${self}`);
  }

  if (next) {
    lines.push(pc.dim(`More contacts — next page: npx @agentinbox/cli contact list --after ${next}`));
  }

  return `${lines.join('\n')}\n`;
}

function formatEmailColumn(row: ContactRow): string {
  const emailChannel = row.channels?.find((channel) => channel.via === 'email');
  if (!emailChannel) {
    if (!row.email) {
      return pc.dim('—');
    }

    return `${row.email} ${pc.dim('(unverified)')}`;
  }

  if (emailChannel.status === 'pending') {
    return `${emailChannel.address ?? '—'} ${pc.yellow('(pending verification)')}`;
  }

  // A listed email channel is this relay's verified address. Subscriber.email can belong to another relay.
  if (emailChannel.status === 'verified' || !('status' in emailChannel)) {
    return emailChannel.address ?? pc.dim('—');
  }

  const address = emailChannel.address ?? row.email ?? '—';

  return `${address} ${pc.dim('(unverified)')}`;
}

export async function contactsCommand(options: ContactsOptions): Promise<never> {
  let output: string;
  try {
    output = await renderContacts(options);
  } catch (err) {
    return handleError(err);
  }

  process.stdout.write(output);
  process.exit(0);
}

async function renderContacts(options: ContactsOptions): Promise<string> {
  const limit = parseContactsLimit(options.limit);
  const { client, config } = clientFromConfig(options.apiUrl);
  const after = options.after?.trim() || undefined;
  const page = await listContacts(client, { limit, ...(after ? { after } : {}) });
  const rows = markSelf(page.data, config.subscriberId);

  if (options.json) {
    return `${JSON.stringify({ data: rows, next: page.next }, null, 2)}\n`;
  }

  return renderContactsTable(rows, page.next);
}
