import type { HumanApiClient } from '../api/client';
import {
  getInboxThread,
  INBOX_MAX_SERVER_WAIT_SECONDS,
  INBOX_READ_FILTERS,
  INBOX_SENDERS_FILTERS,
  INBOX_STATUS_FILTERS,
  type InboxPage,
  type ListInboxQuery,
  listInbox,
  markInboxRead,
  resolveInboxThread,
} from '../api/inbox';
import { EXIT_OK, EXIT_TIMEOUT, fail, formatInboxThreadLine, formatInboxThreadView } from '../output';
import { clientFromConfig, handleError, parseDuration } from './interact';

export interface InboxListOptions {
  filter?: string;
  status?: string;
  senders?: string;
  /** Block until a thread matches the filters. */
  wait?: boolean;
  /** How long `--wait` blocks; forever when absent. */
  timeout?: string;
  limit?: string;
  after?: string;
  json?: boolean;
  apiUrl?: string;
}

export interface InboxThreadOptions {
  json?: boolean;
  apiUrl?: string;
}

export function inboxListCommand(options: InboxListOptions): Promise<never> {
  return runCommand(async () => {
    const filters = parseListFilters(options);
    const waitSeconds = parseWait(options);
    const { client, config } = clientFromConfig(options.apiUrl);
    const query: ListInboxQuery = {
      ...filters,
      ...(options.limit ? { limit: parsePositiveInt(options.limit, '--limit') } : {}),
      ...(options.after ? { after: options.after } : {}),
      agentIdentifier: config.relayAgentIdentifier,
    };
    const page =
      waitSeconds === undefined ? await listInbox(client, query) : await waitForThreads(client, query, waitSeconds);

    if (options.json) {
      printJson(page);
    } else {
      printThreads(page, options);
    }

    return waitSeconds !== undefined && page.data.length === 0 ? EXIT_TIMEOUT : EXIT_OK;
  });
}

export function inboxShowCommand(
  id: string,
  options: InboxThreadOptions & { limit?: string; before?: string }
): Promise<never> {
  return runCommand(async () => {
    const { client, config } = clientFromConfig(options.apiUrl);
    const view = await getInboxThread(client, id, {
      ...(options.limit ? { limit: parsePositiveInt(options.limit, '--limit') } : {}),
      ...(options.before ? { before: options.before } : {}),
      agentIdentifier: config.relayAgentIdentifier,
    });

    if (options.json) {
      printJson(view);
    } else {
      process.stdout.write(`${formatInboxThreadView(view)}\n`);
    }

    return EXIT_OK;
  });
}

export function inboxReadCommand(id: string, options: InboxThreadOptions): Promise<never> {
  return runCommand(async () => {
    const { client, config } = clientFromConfig(options.apiUrl);
    const thread = await markInboxRead(client, id, config.relayAgentIdentifier);

    if (options.json) {
      printJson(thread);
    } else {
      process.stdout.write(`Thread ${thread.id} marked read.\n`);
    }

    return EXIT_OK;
  });
}

export function inboxResolveCommand(id: string, options: InboxThreadOptions): Promise<never> {
  return runCommand(async () => {
    const { client, config } = clientFromConfig(options.apiUrl);
    const thread = await resolveInboxThread(client, id, config.relayAgentIdentifier);

    if (options.json) {
      printJson(thread);
    } else {
      process.stdout.write(`Thread ${thread.id} resolved. It opens again when anyone writes in it.\n`);
    }

    return EXIT_OK;
  });
}

/**
 * Blocks until at least one thread matches or `waitSeconds` runs out (`Infinity` waits forever).
 * Each request is a server-held long-poll of at most `INBOX_MAX_SERVER_WAIT_SECONDS`.
 */
export async function waitForThreads(
  client: HumanApiClient,
  query: ListInboxQuery,
  waitSeconds: number
): Promise<InboxPage> {
  const deadline = Number.isFinite(waitSeconds) ? Date.now() + waitSeconds * 1000 : Infinity;

  while (true) {
    const remainingSeconds = Math.ceil((deadline - Date.now()) / 1000);
    const wait = Math.max(0, Math.min(INBOX_MAX_SERVER_WAIT_SECONDS, remainingSeconds));
    const page = await listInbox(client, { ...query, wait });

    if (page.data.length > 0 || Date.now() >= deadline) {
      return page;
    }
  }
}

/** `--wait` alone waits forever; `--timeout 90s` bounds it. Undefined means the list does not block. */
export function parseWait(options: Pick<InboxListOptions, 'wait' | 'timeout'>): number | undefined {
  if (!options.wait) {
    if (options.timeout !== undefined) {
      fail('`--timeout` only applies together with `--wait`.');
    }

    return undefined;
  }

  return options.timeout === undefined ? Infinity : parseDuration(options.timeout);
}

/** Defaults live on the server (`all`, `open`, `contacts`), so only what was passed is sent. */
export function parseListFilters(
  options: Pick<InboxListOptions, 'filter' | 'status' | 'senders'>
): Pick<ListInboxQuery, 'filter' | 'status' | 'senders'> {
  return {
    ...(options.filter ? { filter: parseChoice(options.filter, INBOX_READ_FILTERS, '--filter') } : {}),
    ...(options.status ? { status: parseChoice(options.status, INBOX_STATUS_FILTERS, '--status') } : {}),
    ...(options.senders ? { senders: parseChoice(options.senders, INBOX_SENDERS_FILTERS, '--senders') } : {}),
  };
}

function parseChoice<T extends string>(raw: string, choices: readonly T[], label: string): T {
  const value = raw.trim().toLowerCase();
  const match = choices.find((choice) => choice === value);

  if (!match) {
    fail(`${label} must be one of: ${choices.join(', ')}.`);
  }

  return match;
}

async function runCommand(body: () => Promise<number>): Promise<never> {
  let code: number;

  try {
    code = await body();
  } catch (err) {
    return handleError(err);
  }

  process.exit(code);
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function parsePositiveInt(raw: string, label: string): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    fail(`${label} must be a positive integer.`);
  }

  return value;
}

/** The flags that reproduce this listing, for the "next page" hint. */
function filterFlags(options: InboxListOptions): string {
  return [
    options.filter ? ` --filter ${options.filter}` : '',
    options.status ? ` --status ${options.status}` : '',
    options.senders ? ` --senders ${options.senders}` : '',
  ].join('');
}

function printThreads(page: InboxPage, options: InboxListOptions): void {
  if (page.data.length === 0) {
    const hint = options.senders === 'all' ? '' : ' Threads from strangers are hidden: add --senders all.';
    process.stdout.write(`No threads match.${hint}\n`);

    return;
  }

  for (const thread of page.data) {
    process.stdout.write(`${formatInboxThreadLine(thread)}\n`);
  }

  if (page.next) {
    process.stdout.write(`\nMore: human inbox list${filterFlags(options)} --after ${page.next}\n`);
  }
}
