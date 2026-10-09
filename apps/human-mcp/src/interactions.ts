import { type HumanApi, HumanApiError } from './human-api';

export type InteractionKind = 'ask' | 'approve' | 'choose' | 'tell';

type Option = { id: string; label: string };

/** A message to a person and, once they answer, what they said. The Human API's own shape. */
export type Interaction = {
  id: string;
  kind: InteractionKind;
  status: 'pending' | 'answered' | 'approved' | 'denied' | 'expired' | 'canceled' | 'delivered';
  content?: { cardChrome?: { options?: Option[] } };
  response?: { type: 'text' | 'option'; text?: string; optionId?: string; respondedBy?: string };
  failedTo?: string[];
};

export type Card = {
  title: string;
  body?: string;
  approveLabel?: string;
  denyLabel?: string;
  options?: string[];
};

/** AI tools give up on a call after about a minute, so a tool never waits longer than this in one go. */
export const MAX_WAIT_SECONDS = 50;
export const DEFAULT_WAIT_SECONDS = 45;
const POLL_EVERY_MS = 2_000;

/** Who gets the message when the tool names nobody: the account's owner. */
export async function resolveRecipient(api: HumanApi, to: string | undefined): Promise<string> {
  if (to?.trim()) {
    return to.trim();
  }

  const operator = await api.get<{ subscriberId?: string }>('/v1/human/operator');
  if (!operator?.subscriberId) {
    throw new HumanApiError(409, 'Human is not set up yet. Open gethuman.md, go to Agent and follow the setup steps.');
  }

  return operator.subscriberId;
}

export async function sendInteraction(
  api: HumanApi,
  input: { kind: InteractionKind; card: Card; to?: string; from?: string }
): Promise<Interaction> {
  const to = await resolveRecipient(api, input.to);
  const created = await api.post<Interaction>('/v1/human/interactions', {
    kind: input.kind,
    card: input.card,
    to,
    ...(input.from ? { from: input.from } : {}),
  });

  if (created.failedTo?.length) {
    throw new HumanApiError(
      409,
      `The message could not be delivered to ${created.failedTo.join(', ')}. They may not have connected a channel yet; the invite tool gives you a link for them.`
    );
  }

  return created;
}

/** A check never gets less time than this, however little of the wait is left. */
const SHORTEST_CHECK_MS = 1_000;

/**
 * Checks for the answer until there is one or `seconds` have passed, and returns the interaction as it
 * is then. Given the interaction that was just sent, it always returns one: a check that fails or takes
 * too long leaves the request open, and the tool still gets its id to wait on. Given only an id, the
 * first check has to succeed, because nothing is known about the request yet.
 */
export async function waitForAnswer(
  api: HumanApi,
  sent: Interaction | string,
  seconds: number,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
): Promise<Interaction> {
  const deadline = Date.now() + Math.min(Math.max(seconds, 0), MAX_WAIT_SECONDS) * 1000;
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
      interaction = await check();
    } catch {
      // One missed check is not an answer: keep what is known and try again while there is time.
    }
  }

  return interaction;
}

/** What to tell the AI tool about an interaction, in words it can act on. */
export function describeOutcome(interaction: Interaction): string {
  const { id, status, response } = interaction;
  const by = response?.respondedBy ? ` by ${response.respondedBy}` : '';

  switch (status) {
    case 'pending':
      return `No answer yet. The request is still open: call the wait tool with id "${id}" to keep waiting. Do not go ahead without the answer.`;
    case 'approved':
      return `Approved${by}.${answerOf(interaction)}`;
    case 'denied':
      return `Denied${by}. Do not go ahead.${answerOf(interaction)}`;
    case 'answered':
      return `Answered${by}.${answerOf(interaction)}`;
    case 'delivered':
      return 'Delivered.';
    case 'expired':
      return 'Nobody answered in time, so the request expired. Treat it as not approved.';
    case 'canceled':
      return 'The request was canceled. Treat it as not approved.';
    default:
      return `The request is ${status}.`;
  }
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
