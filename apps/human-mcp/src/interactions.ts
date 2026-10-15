import { type HumanApi, HumanApiError } from './human-api';

export type InteractionKind = 'ask' | 'approve' | 'choose' | 'tell';

type Option = { id: string; label: string };
export type OptionInput = string | Option;

/** A message to a person and, once they answer, what they said. The Human API's own shape. */
export type Interaction = {
  id: string;
  kind: InteractionKind;
  status: 'pending' | 'answered' | 'approved' | 'denied' | 'expired' | 'canceled' | 'delivered';
  content?: { cardChrome?: { options?: Option[] } };
  response?: { type: 'text' | 'option'; text?: string; optionId?: string; respondedBy?: string };
  failedTo?: string[];
  /** Threads the send landed in. Sending marks each one read; `unreadBefore` is what was unread then. */
  threads?: Array<{ id: string; unreadBefore: number }>;
};

export type Card = {
  title: string;
  icon?: string;
  subtitle?: string;
  body?: string;
  approveLabel?: string;
  denyLabel?: string;
  extraActions?: OptionInput[];
  options?: OptionInput[];
};

/** AI tools give up on a call after about a minute, so a tool never waits longer than this in one go. */
export const MAX_WAIT_SECONDS = 50;
export const DEFAULT_WAIT_SECONDS = 45;
const POLL_EVERY_MS = 2_000;

/**
 * Sending waits for the message to reach the person's channel, which can be slow, and its answer is the
 * only place the request's id comes from. So it gets longer than other calls, and still ends before the
 * AI tool gives up on the whole call.
 */
const SEND_TIMEOUT_MS = 30_000;

/** Who gets the message when the tool names nobody: the account's owner. */
export async function resolveRecipient(api: HumanApi, to: string | undefined): Promise<string> {
  if (to?.trim()) {
    return to.trim();
  }

  const operator = await api.get<{ subscriberId?: string }>('/v1/human/operator');
  if (!operator?.subscriberId) {
    throw new HumanApiError(
      409,
      'Human is not set up yet. Open agentinbox.md, go to Configure and follow the setup steps.'
    );
  }

  return operator.subscriberId;
}

export async function sendInteraction(
  api: HumanApi,
  input: {
    kind: InteractionKind;
    card: Card;
    to?: string | string[];
    from?: string;
    /** Reply in an existing inbox thread (`conv_...`). When set, `to` is optional. */
    thread?: string;
    /** Let anyone in the thread answer — needed for stranger threads with no contact. */
    anyoneMayAnswer?: boolean;
    via?: string;
    ttlSeconds?: number;
  }
): Promise<Interaction> {
  const thread = input.thread?.trim();
  // A thread send must not invent a `to`: the API routes by the conversation, and a defaulted
  // operator would trip contact checks on stranger threads.
  const to = thread ? normalizeRecipients(input.to) : await resolveRecipients(api, input.to);
  const created = await api
    .post<Interaction>(
      '/v1/human/interactions',
      {
        kind: input.kind,
        card: input.card,
        ...(to ? { to } : {}),
        ...(thread ? { thread } : {}),
        ...(input.anyoneMayAnswer ? { anyoneMayAnswer: true } : {}),
        ...(input.from ? { from: input.from } : {}),
        ...(input.via ? { via: input.via } : {}),
        ...(input.ttlSeconds !== undefined ? { ttlSeconds: input.ttlSeconds } : {}),
      },
      SEND_TIMEOUT_MS
    )
    .catch((error) => {
      // No answer is not a "no": the API may have taken the message and still deliver it.
      if (error instanceof HumanApiError && error.status === 0) {
        throw new HumanApiError(
          0,
          'The Human API did not confirm the message in time. It may still reach the person, so do not send it again right away: tell the user it is unconfirmed, and send it again only if they ask.'
        );
      }

      throw error;
    });

  if (created.failedTo?.length && everyRecipientFailed(to, created.failedTo)) {
    throw new HumanApiError(
      409,
      `The message could not be delivered to ${created.failedTo.join(', ')}. They may not have connected a channel yet; the invite tool gives you a link for them.`
    );
  }

  return created;
}

function normalizeRecipients(to: string | string[] | undefined): string | string[] | undefined {
  if (Array.isArray(to)) {
    const recipients = to.map((recipient) => recipient.trim()).filter(Boolean);

    return recipients.length ? recipients : undefined;
  }

  return to?.trim() || undefined;
}

async function resolveRecipients(api: HumanApi, to: string | string[] | undefined): Promise<string | string[]> {
  const normalized = normalizeRecipients(to);
  if (normalized !== undefined) {
    return normalized;
  }

  return resolveRecipient(api, undefined);
}

function everyRecipientFailed(to: string | string[] | undefined, failedTo: string[]): boolean {
  if (to === undefined) {
    return true;
  }

  const recipients = Array.isArray(to) ? to : [to];

  return recipients.every((recipient) => failedTo.includes(recipient));
}

/** A check never gets less time than this, however little of the wait is left. */
const SHORTEST_CHECK_MS = 1_000;

/**
 * Checks for the answer until there is one or `seconds` have passed, and returns the interaction as it
 * is then. Given the interaction that was just sent, it always returns one: a check that fails or takes
 * too long leaves the request open, and the tool still gets its id to wait on. Given only an id, the
 * first check has to succeed, because nothing is known about the request yet.
 *
 * `since` is when the tool's call began. Counting from there keeps a slow send from adding to the wait.
 */
export async function waitForAnswer(
  api: HumanApi,
  sent: Interaction | string,
  seconds: number,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  since: number = Date.now()
): Promise<Interaction> {
  const deadline = since + Math.min(Math.max(seconds, 0), MAX_WAIT_SECONDS) * 1000;
  const id = typeof sent === 'string' ? sent : sent.id;
  // No check takes longer than what is left of the wait.
  const check = () =>
    api.get<Interaction>(
      `/v1/human/interactions/${encodeURIComponent(id)}`,
      undefined,
      Math.max(SHORTEST_CHECK_MS, deadline - Date.now())
    );

  let interaction = typeof sent === 'string' ? await check() : sent;

  while (interaction.status === 'pending' && Date.now() + POLL_EVERY_MS <= deadline) {
    await sleep(POLL_EVERY_MS);

    try {
      // GET does not include `threads`. Those exist only on the send response, and sending
      // has already marked the thread read, so a later check must not drop them.
      interaction = keepSentThreads(await check(), sent);
    } catch {
      // One missed check is not an answer: keep what is known and try again while there is time.
    }
  }

  return interaction;
}

function keepSentThreads(latest: Interaction, sent: Interaction | string): Interaction {
  if (typeof sent === 'string' || latest.threads?.length || !sent.threads?.length) {
    return latest;
  }

  return { ...latest, threads: sent.threads };
}

/** What to tell the AI tool about an interaction, in words it can act on. */
export function describeOutcome(interaction: Interaction): string {
  const { id, status, response } = interaction;
  const by = response?.respondedBy ? ` by ${response.respondedBy}` : '';
  const threadNote = describeThreads(interaction.threads);
  const failureNote = interaction.failedTo?.length
    ? ` Warning: delivery failed for ${interaction.failedTo.join(', ')}.`
    : '';

  switch (status) {
    case 'pending':
      return `No answer yet. The request is still open: call the wait tool with id "${id}" to keep waiting. Do not go ahead without the answer.${threadNote}${failureNote}`;
    case 'approved':
      return `Approved${by}.${answerOf(interaction)}${threadNote}${failureNote}`;
    case 'denied':
      return `Denied${by}. Do not go ahead.${answerOf(interaction)}${threadNote}${failureNote}`;
    case 'answered':
      return `Answered${by}.${answerOf(interaction)}${threadNote}${failureNote}`;
    case 'delivered':
      return `Delivered.${threadNote}${failureNote}`;
    case 'expired':
      return 'Nobody answered in time, so the request expired. Treat it as not approved.';
    case 'canceled':
      return 'The request was canceled. Treat it as not approved.';
    default:
      return `The request is ${status}.${threadNote}`;
  }
}

function describeThreads(threads: Interaction['threads']): string {
  if (!threads?.length) {
    return '';
  }

  return threads
    .map((thread) => {
      if (thread.unreadBefore > 0) {
        return ` That thread (${thread.id}) had ${thread.unreadBefore} unread message${
          thread.unreadBefore === 1 ? '' : 's'
        }, which are now marked read — read them with inbox_show.`;
      }

      return ` Sent in thread ${thread.id}.`;
    })
    .join('');
}

function answerOf({ content, response }: Interaction): string {
  if (!response) {
    return '';
  }

  if (response.type === 'option') {
    const option = content?.cardChrome?.options?.find((candidate) => candidate.id === response.optionId);

    return ` They chose: ${option?.label ?? response.optionId}`;
  }

  return response.text ? ` They said: ${response.text}` : '';
}
