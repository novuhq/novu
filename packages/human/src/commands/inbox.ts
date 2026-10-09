import type { HumanApiClient } from '../api/client';
import type { InteractionKind } from '../api/human';
import {
  createInboxInteraction,
  getInboxThread,
  INBOX_MAX_SERVER_WAIT_SECONDS,
  type InboxPage,
  type ListInboxQuery,
  listInbox,
  markInboxRead,
  replyInboxThread,
  resolveInboxThread,
} from '../api/inbox';
import { EXIT_OK, EXIT_TIMEOUT, emitResult, fail, formatInboxThreadLine, formatInboxThreadView } from '../output';
import {
  buildInteractionCard,
  clientFromConfig,
  handleError,
  type InteractOptions,
  parseDuration,
  parseIdLabelOption,
  waitForResolution,
} from './interact';

export interface InboxListOptions {
  unread?: boolean;
  all?: boolean;
  /** `true` when `--wait` is given without a duration: block until something arrives. */
  wait?: string | boolean;
  limit?: string;
  after?: string;
  json?: boolean;
  apiUrl?: string;
}

export interface InboxThreadOptions {
  json?: boolean;
  apiUrl?: string;
}

export type InboxInteractionOptions = Omit<InteractOptions, 'to' | 'via'>;

export function inboxListCommand(options: InboxListOptions): Promise<never> {
  return runCommand(async () => {
    const { client, config } = clientFromConfig(options.apiUrl);
    const query: ListInboxQuery = {
      ...(options.unread ? { unread: true } : {}),
      ...(options.all ? { all: true } : {}),
      ...(options.limit ? { limit: parsePositiveInt(options.limit, '--limit') } : {}),
      ...(options.after ? { after: options.after } : {}),
      agentIdentifier: config.relayAgentIdentifier,
    };
    const waitSeconds = parseWait(options.wait);
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
      process.stdout.write(`Thread ${thread.id} resolved. A new message from them reopens it.\n`);
    }

    return EXIT_OK;
  });
}

export function inboxReplyCommand(id: string, text: string, options: InboxThreadOptions): Promise<never> {
  return runCommand(async () => {
    if (!text.trim()) {
      fail('Reply text is empty.');
    }

    const { client, config } = clientFromConfig(options.apiUrl);
    const result = await replyInboxThread(client, id, text, config.relayAgentIdentifier);

    if (options.json) {
      printJson(result);
    } else {
      process.stdout.write(`Replied on ${result.thread.channel} in ${result.thread.id}.\n`);
    }

    return EXIT_OK;
  });
}

/** ask / approve / choose / tell posted into an inbox thread instead of a fresh DM. */
export function runInboxInteraction(
  kind: InteractionKind,
  id: string,
  prompt: string,
  options: InboxInteractionOptions
): Promise<never> {
  return runCommand(async () => {
    const { client, config } = clientFromConfig(options.apiUrl);
    const card = buildInteractionCard({
      title: prompt,
      icon: options.icon,
      subtitle: options.subtitle,
      body: options.body,
      approveLabel: options.approveLabel,
      denyLabel: options.denyLabel,
      extraActions: options.extraAction?.map(parseIdLabelOption),
      options: options.option?.map(parseIdLabelOption),
    });

    const created = await createInboxInteraction(
      client,
      id,
      {
        kind,
        card,
        ...(options.from ? { from: options.from } : {}),
        ...(options.ttl ? { ttlSeconds: parseDuration(options.ttl) } : {}),
      },
      config.relayAgentIdentifier
    );

    if (kind === 'tell' || options.async) {
      return emitResult(created, Boolean(options.json));
    }

    return waitForResolution(client, created, options);
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

/** `--wait` alone waits forever; `--wait 90s` / `--wait 90` waits that long. */
export function parseWait(wait: string | boolean | undefined): number | undefined {
  if (wait === undefined || wait === false) {
    return undefined;
  }

  if (wait === true) {
    return Infinity;
  }

  return parseDuration(wait);
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

function printThreads(page: InboxPage, options: InboxListOptions): void {
  if (page.data.length === 0) {
    process.stdout.write(options.unread ? 'No unread threads.\n' : 'Inbox is empty.\n');

    return;
  }

  for (const thread of page.data) {
    process.stdout.write(`${formatInboxThreadLine(thread)}\n`);
  }

  if (page.next) {
    process.stdout.write(`\nMore: human inbox${options.unread ? ' unread' : ''} --after ${page.next}\n`);
  }
}
