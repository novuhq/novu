import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { type HumanApi, HumanApiError } from './human-api';
import {
  getInboxThread,
  INBOX_MAX_WAIT_SECONDS,
  INBOX_READ_FILTERS,
  INBOX_SENDERS_FILTERS,
  INBOX_STATUS_FILTERS,
  listInbox,
  markInboxRead,
  resolveInboxThread,
} from './inbox';
import { formatInboxPage, formatThreadDigest } from './inbox-digest';
import {
  DEFAULT_WAIT_SECONDS,
  describeOutcome,
  type InteractionKind,
  MAX_WAIT_SECONDS,
  type OptionInput,
  sendInteraction,
  waitForAnswer,
} from './interactions';
import { resolveEmailRecipients } from './recipients';

type ToolResult = { content: Array<{ type: 'text'; text: string }>; isError?: boolean };

const recipient = z.string().min(1).max(320);
const to = z
  .union([recipient, z.array(recipient).min(1).max(50)])
  .optional()
  .describe(
    'Contact id, email address, or up to 50 of them. With inbox_send, omit to reach the account owner. With inbox_reply, these are the only contacts who may answer.'
  );

const waitSeconds = z
  .number()
  .int()
  .min(0)
  .max(MAX_WAIT_SECONDS)
  .optional()
  .describe(`How long to wait for the answer now, in seconds (default ${DEFAULT_WAIT_SECONDS}).`);

const anyoneMayAnswer = z
  .boolean()
  .optional()
  .describe(
    'When true with thread, anyone in the thread may answer. Pass this when replying to a stranger thread that has no contact.'
  );

const CHECK_INBOX_HINT =
  ' Before you send, call inbox_list with filter "unread" so you do not miss a thread a person started.';

const interactionKind = z
  .enum(['ask', 'approve', 'choose', 'tell'])
  .describe('ask: free-text answer; approve: Approve/Deny buttons; choose: one of options; tell: no answer needed.');
const optionInput = z.union([
  z.string().min(1).max(200),
  z.object({ id: z.string().min(1).max(128), label: z.string().min(1).max(200) }),
]);
const message = z.string().min(1).max(4000).describe('The main message or question.');
const body = z.string().max(4000).optional().describe('Supporting details under the subtitle.');
const subtitle = z.string().max(4000).optional().describe('Secondary line under the message.');
const icon = z
  .string()
  .optional()
  .describe('Slack-only card icon: MCP catalog id, display name, or an HTTPS URL. Ignored on other channels.');
const from = z.string().max(80).optional().describe('Attribution label shown to the person, such as "deploy-bot".');
/** Matches `HUMAN_INTERACTION_MAX_TTL_SECONDS` in `@novu/shared`. Card action tokens last five days. */
const MAX_TTL_SECONDS = 5 * 24 * 60 * 60;
const ttlSeconds = z
  .number()
  .int()
  .min(60)
  .max(MAX_TTL_SECONDS)
  .optional()
  .describe(`How long a question remains answerable, in seconds (default 86400, max ${MAX_TTL_SECONDS}).`);
const options = z
  .array(optionInput)
  .min(2)
  .max(10)
  .optional()
  .describe('Required for choose. Each choice is a label or an object with a stable id and label.');
const approveLabel = z.string().max(80).optional().describe('Approve button label (approve only).');
const denyLabel = z.string().max(80).optional().describe('Deny button label (approve only).');
const extraActions = z
  .array(optionInput)
  .max(4)
  .optional()
  .describe('Extra approve buttons after Approve and Deny (approve only, max 4).');

type SendToolInput = {
  kind: InteractionKind;
  message: string;
  to?: string | string[];
  via?: 'telegram' | 'slack' | 'email';
  from?: string;
  ttl_seconds?: number;
  wait_seconds?: number;
  icon?: string;
  subtitle?: string;
  body?: string;
  approve_label?: string;
  deny_label?: string;
  extra_actions?: OptionInput[];
  options?: OptionInput[];
};

type ReplyToolInput = Omit<SendToolInput, 'via'> & {
  thread: string;
  anyone_may_answer?: boolean;
};

function parseIdLabelOption(option: OptionInput): OptionInput {
  if (typeof option !== 'string') {
    return option;
  }

  const colon = option.indexOf(':');
  if (colon > 0) {
    const id = option.slice(0, colon).trim();
    const label = option.slice(colon + 1).trim();
    if (id && label && !/\s/.test(id)) {
      return { id, label };
    }
  }

  return option;
}

function normalizeTo(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  const raw = Array.isArray(value) ? value : value.split(',');
  const recipients = [...new Set(raw.map((item) => item.trim()).filter(Boolean))];
  if (recipients.length === 0) {
    throw new HumanApiError(400, 'to must name at least one contact or email address.');
  }
  if (recipients.length > 50) {
    throw new HumanApiError(400, 'to supports at most 50 contacts.');
  }

  return recipients;
}

function assertKindOptions(input: SendToolInput): void {
  if (input.kind === 'choose' && !input.options?.length) {
    throw new HumanApiError(400, 'kind "choose" requires 2-10 options.');
  }
  if (input.kind !== 'choose' && input.options?.length) {
    throw new HumanApiError(400, 'options only work with kind "choose".');
  }
  if (
    input.kind !== 'approve' &&
    (input.approve_label !== undefined || input.deny_label !== undefined || input.extra_actions?.length)
  ) {
    throw new HumanApiError(400, 'approve_label, deny_label, and extra_actions only work with kind "approve".');
  }
  if (input.kind === 'tell' && input.wait_seconds !== undefined) {
    throw new HumanApiError(400, 'wait_seconds only applies to ask, approve, and choose.');
  }
}

async function sendOrReply(api: HumanApi, input: SendToolInput | ReplyToolInput): Promise<string> {
  assertKindOptions(input);
  const since = Date.now();
  const isReply = 'thread' in input;
  if (isReply && input.anyone_may_answer && input.to !== undefined) {
    throw new HumanApiError(400, 'anyone_may_answer cannot be combined with to.');
  }

  const requestedRecipients = normalizeTo(input.to);
  const resolvedRecipients = requestedRecipients
    ? await resolveEmailRecipients(api, requestedRecipients, isReply)
    : undefined;
  const card = {
    title: input.message,
    ...(input.icon ? { icon: input.icon } : {}),
    ...(input.subtitle ? { subtitle: input.subtitle } : {}),
    ...(input.body ? { body: input.body } : {}),
    ...(input.approve_label ? { approveLabel: input.approve_label } : {}),
    ...(input.deny_label ? { denyLabel: input.deny_label } : {}),
    ...(input.extra_actions?.length ? { extraActions: input.extra_actions.map(parseIdLabelOption) } : {}),
    ...(input.options?.length ? { options: input.options.map(parseIdLabelOption) } : {}),
  };
  const created = await sendInteraction(api, {
    kind: input.kind,
    card,
    ...(resolvedRecipients ? { to: resolvedRecipients } : {}),
    ...(isReply ? { thread: input.thread } : {}),
    ...(isReply && input.anyone_may_answer ? { anyoneMayAnswer: true } : {}),
    ...(!isReply && input.via ? { via: input.via } : {}),
    ...(input.from ? { from: input.from } : {}),
    ...(input.ttl_seconds !== undefined ? { ttlSeconds: input.ttl_seconds } : {}),
  });

  if (input.kind === 'tell') {
    return describeOutcome({ ...created, status: 'delivered' });
  }

  return describeOutcome(
    await waitForAnswer(api, created, input.wait_seconds ?? DEFAULT_WAIT_SECONDS, undefined, since)
  );
}

/** The tools an AI tool gets: ways to reach a person, read the inbox, and wait for what they say. */
export function registerTools(server: McpServer, api: HumanApi): void {
  server.registerTool(
    'inbox_send',
    {
      title: 'Send an inbox message',
      description: `Start a conversation with one or more contacts. Use kind ask, approve, or choose to wait for an answer; tell sends without waiting.${CHECK_INBOX_HINT}`,
      inputSchema: {
        kind: interactionKind,
        message,
        to,
        via: z.enum(['telegram', 'slack', 'email']).optional().describe("Override each contact's default channel."),
        from,
        ttl_seconds: ttlSeconds,
        wait_seconds: waitSeconds,
        icon,
        subtitle,
        body,
        approve_label: approveLabel,
        deny_label: denyLabel,
        extra_actions: extraActions,
        options,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    (input) => run(() => sendOrReply(api, input))
  );

  server.registerTool(
    'inbox_reply',
    {
      title: 'Reply in an inbox thread',
      description:
        'Send into an existing inbox thread. Use kind ask, approve, or choose to wait for an answer; tell sends without waiting. A reply uses the thread channel, so it has no via option.',
      inputSchema: {
        thread: z.string().min(1).max(128).describe('Thread id (conv_...) from inbox_list.'),
        kind: interactionKind,
        message,
        to,
        anyone_may_answer: anyoneMayAnswer,
        from,
        ttl_seconds: ttlSeconds,
        wait_seconds: waitSeconds,
        icon,
        subtitle,
        body,
        approve_label: approveLabel,
        deny_label: denyLabel,
        extra_actions: extraActions,
        options,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    (input) => run(() => sendOrReply(api, input))
  );

  server.registerTool(
    'wait',
    {
      title: 'Wait for an answer',
      description:
        'Keep waiting for the answer to an earlier ask, approve or choose that had no answer yet. Call it again while the result says the request is still open.',
      inputSchema: {
        id: z.string().min(1).max(128).describe('The id from the earlier result.'),
        wait_seconds: waitSeconds,
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    ({ id, wait_seconds }) =>
      run(async () => describeOutcome(await waitForAnswer(api, id, wait_seconds ?? DEFAULT_WAIT_SECONDS)))
  );

  server.registerTool(
    'invite',
    {
      title: 'Invite a person',
      description:
        'Get a link that lets another person connect their chat app, so you can reach them too. Nothing is sent for you: give the link to the user to pass on. Afterwards reach them with the id you chose here.',
      inputSchema: {
        id: z
          .string()
          .min(1)
          .max(128)
          .regex(/^[A-Za-z0-9_.@-]+$/)
          .describe('A short id for the person, such as "alice". You use it later as `to`.'),
        name: z.string().max(128).optional().describe('Their name, such as "Alice Chen".'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    ({ id, name }) =>
      run(async () => {
        const [firstName, ...rest] = (name ?? '').trim().split(/\s+/).filter(Boolean);
        const invite = await api.post<{ url: string; expiresAt: string }>('/v1/human/invites', {
          subscriberId: id,
          ...(firstName ? { firstName } : {}),
          ...(rest.length ? { lastName: rest.join(' ') } : {}),
        });

        return `Invite link for ${id}: ${invite.url}\nIt works until ${invite.expiresAt}. Once they have connected, reach them with to: "${id}".`;
      })
  );

  server.registerTool(
    'contacts',
    {
      title: 'List people',
      description: 'List the people you can reach, with the id to pass as `to`.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    () =>
      run(async () => {
        const contacts = await api.get<Array<{ id: string; firstName?: string; lastName?: string; email?: string }>>(
          '/v1/human/contacts',
          { limit: 100 }
        );
        if (!contacts?.length) {
          return 'There is nobody to reach yet. Set up Human on agentinbox.md, or use the invite tool.';
        }

        return contacts
          .map((contact) => {
            const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ');

            return [contact.id, name, contact.email].filter(Boolean).join(' · ');
          })
          .join('\n');
      })
  );

  server.registerTool(
    'inbox_list',
    {
      title: 'List inbox threads',
      description:
        'List threads in the agent inbox. People can message the agent first: call this with filter "unread" before you send, so you see new threads. Threads from strangers are hidden unless senders is "all". Showing a thread does not mark it read; any send into it does.',
      inputSchema: {
        filter: z.enum(INBOX_READ_FILTERS).optional().describe('Unread threads, read threads, or both (default all).'),
        status: z
          .enum(INBOX_STATUS_FILTERS)
          .optional()
          .describe('Open threads, resolved threads, or both (default open).'),
        senders: z
          .enum(INBOX_SENDERS_FILTERS)
          .optional()
          .describe('Threads a contact has written in, or every thread including strangers (default contacts).'),
        limit: z.number().int().min(1).max(100).optional().describe('Page size (default 20).'),
        after: z.string().optional().describe('Cursor from a previous page (the last thread id).'),
        wait_seconds: z
          .number()
          .int()
          .min(0)
          .max(INBOX_MAX_WAIT_SECONDS)
          .optional()
          .describe(
            `Hold the request up to this many seconds until a thread matches (max ${INBOX_MAX_WAIT_SECONDS}, default 0).`
          ),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    (input) =>
      run(async () => {
        const page = await listInbox(api, {
          ...(input.filter ? { filter: input.filter } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.senders ? { senders: input.senders } : {}),
          ...(input.limit !== undefined ? { limit: input.limit } : {}),
          ...(input.after ? { after: input.after } : {}),
          ...(input.wait_seconds !== undefined ? { wait: input.wait_seconds } : {}),
        });

        return formatInboxPage(page);
      })
  );

  server.registerTool(
    'inbox_show',
    {
      title: 'Show an inbox thread',
      description:
        'Show the messages in an inbox thread. Looking at a thread does not mark it read — use inbox_read or send a reply for that. People and messages are labelled contact or stranger.',
      inputSchema: {
        thread: z.string().min(1).max(128).describe('Thread id (conv_...) from inbox_list.'),
        limit: z.number().int().min(1).max(100).optional().describe('How many recent messages to return (default 20).'),
        before: z.string().optional().describe('Message id cursor for older pages.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ thread: threadId, limit, before }) =>
      run(async () =>
        formatThreadDigest(
          await getInboxThread(api, threadId, {
            ...(limit !== undefined ? { limit } : {}),
            ...(before ? { before } : {}),
          })
        )
      )
  );

  server.registerTool(
    'inbox_read',
    {
      title: 'Mark an inbox thread read',
      description: 'Mark an inbox thread as read without sending a reply. Showing a thread does not mark it read.',
      inputSchema: {
        thread: z.string().min(1).max(128).describe('Thread id (conv_...) from inbox_list.'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    ({ thread: threadId }) =>
      run(async () => {
        const marked = await markInboxRead(api, threadId);

        return `Thread ${marked.id} marked read.`;
      })
  );

  server.registerTool(
    'inbox_resolve',
    {
      title: 'Resolve an inbox thread',
      description:
        'Mark an inbox thread resolved. It opens again when anyone writes in it. Use after you have finished with the thread.',
      inputSchema: {
        thread: z.string().min(1).max(128).describe('Thread id (conv_...) from inbox_list.'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    ({ thread: threadId }) =>
      run(async () => {
        const resolved = await resolveInboxThread(api, threadId);

        return `Thread ${resolved.id} resolved. It opens again when anyone writes in it.`;
      })
  );
}

/** Runs a tool and turns what went wrong into a result the AI tool can read, not a protocol error. */
async function run(work: () => Promise<string>): Promise<ToolResult> {
  try {
    return { content: [{ type: 'text', text: await work() }] };
  } catch (error) {
    const text =
      error instanceof HumanApiError ? error.message : 'Something went wrong while reaching Human. Try again.';

    return { content: [{ type: 'text', text }], isError: true };
  }
}
