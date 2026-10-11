import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { type HumanApi, HumanApiError } from './human-api';
import {
  DEFAULT_WAIT_SECONDS,
  describeOutcome,
  type InteractionKind,
  MAX_WAIT_SECONDS,
  sendInteraction,
  waitForAnswer,
} from './interactions';

type ToolResult = { content: Array<{ type: 'text'; text: string }>; isError?: boolean };

const to = z
  .string()
  .max(128)
  .optional()
  .describe('Id of the person to reach, from the contacts tool. Leave out to reach the owner of the account.');

const details = z.string().max(2000).optional().describe('More context, shown under the main line.');

const waitSeconds = z
  .number()
  .int()
  .min(0)
  .max(MAX_WAIT_SECONDS)
  .optional()
  .describe(`How long to wait for the answer now, in seconds (default ${DEFAULT_WAIT_SECONDS}).`);

/** The tools an AI tool gets: ways to reach a person and to wait for what they say. */
export function registerTools(server: McpServer, api: HumanApi): void {
  /** Sends one message and waits a while for the answer. A later `wait` picks up where this stops. */
  async function interact(
    kind: Exclude<InteractionKind, 'tell'>,
    input: { card: Parameters<typeof sendInteraction>[1]['card']; to?: string; wait_seconds?: number }
  ): Promise<string> {
    const since = Date.now();
    const created = await sendInteraction(api, { kind, card: input.card, to: input.to });

    return describeOutcome(
      await waitForAnswer(api, created, input.wait_seconds ?? DEFAULT_WAIT_SECONDS, undefined, since)
    );
  }

  server.registerTool(
    'ask',
    {
      title: 'Ask a person',
      description:
        'Ask a person an open question and get their answer in their own words. They are messaged on the chat app or email they connected. Use it when you need information only a person has.',
      inputSchema: { question: z.string().min(1).max(500), details, to, wait_seconds: waitSeconds },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    ({ question, details: body, ...rest }) => run(() => interact('ask', { card: { title: question, body }, ...rest }))
  );

  server.registerTool(
    'approve',
    {
      title: 'Ask for approval',
      description:
        'Ask a person to approve or deny something before you do it: a deploy, a deletion, a payment, a message sent in their name. They get Approve and Deny buttons. Only go ahead when the result says Approved.',
      inputSchema: {
        request: z.string().min(1).max(500).describe('What you want to do, as a yes-or-no question.'),
        details,
        approve_label: z.string().max(40).optional().describe('Text of the approve button (default "Approve").'),
        deny_label: z.string().max(40).optional().describe('Text of the deny button (default "Deny").'),
        to,
        wait_seconds: waitSeconds,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    ({ request, details: body, approve_label, deny_label, ...rest }) =>
      run(() =>
        interact('approve', {
          card: { title: request, body, approveLabel: approve_label, denyLabel: deny_label },
          ...rest,
        })
      )
  );

  server.registerTool(
    'choose',
    {
      title: 'Let a person choose',
      description: 'Ask a person to pick one of a few options. They get one button per option.',
      inputSchema: {
        question: z.string().min(1).max(500),
        options: z.array(z.string().min(1).max(60)).min(2).max(10).describe('The choices, as short labels.'),
        details,
        to,
        wait_seconds: waitSeconds,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    ({ question, options, details: body, ...rest }) =>
      run(() => interact('choose', { card: { title: question, body, options }, ...rest }))
  );

  server.registerTool(
    'tell',
    {
      title: 'Tell a person',
      description: 'Send a person a message that needs no answer, such as "The build finished".',
      inputSchema: { message: z.string().min(1).max(500), details, to },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    ({ message, details: body, to: recipient }) =>
      run(async () => {
        await sendInteraction(api, { kind: 'tell', card: { title: message, body }, to: recipient });

        return 'Delivered.';
      })
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
          return 'There is nobody to reach yet. Set up Human on gethuman.md, or use the invite tool.';
        }

        return contacts
          .map((contact) => {
            const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ');

            return [contact.id, name, contact.email].filter(Boolean).join(' · ');
          })
          .join('\n');
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
