import pc from 'picocolors';
import {
  type CreateInteractionCard,
  type CreateInteractionInput,
  createInteraction,
  getInteraction,
  type Interaction,
  type InteractionKind,
  type OptionInput,
} from '../api/agent-inbox';
import { type ApiClient, ApiError, createApiClient } from '../api/client';
import { CLI_COMMAND, type CliConfig, NOT_SET_UP_MESSAGE, resolveConfig, resolveVia } from '../config';
import { answerHint, EXIT_TIMEOUT, emitResult, fail, interactionJson, SetupStillPendingError } from '../output';
import { sleep } from '../poll';
import { startWaitIndicator } from '../spinner';
import { isEmailAddress, resolveEmailContact } from './email-contact';
import { runInvite } from './invite';

export interface SendOptions {
  to?: string;
  /** On `reply`: anyone in the conversation may answer, not only the contact it belongs to. */
  anyone?: boolean;
  via?: string;
  from?: string;
  option?: string[];
  ttl?: string;
  timeout?: string;
  async?: boolean;
  json?: boolean;
  apiUrl?: string;
  icon?: string;
  subtitle?: string;
  body?: string;
  approveLabel?: string;
  denyLabel?: string;
  extraAction?: string[];
}

/** The words that turn a send into a question: `inbox send ask "…"`. Without one, it is a plain message. */
export const SEND_VERBS = ['ask', 'approve', 'choose'] as const;
type SendVerb = (typeof SEND_VERBS)[number];

const VERB_EXAMPLES: Record<SendVerb, string> = {
  ask: 'Which environment?',
  approve: 'Deploy to prod?',
  choose: 'Pick a release strategy',
};

function isSendVerb(word: string | undefined): word is SendVerb {
  return (SEND_VERBS as readonly string[]).includes(word ?? '');
}

/**
 * `["ask", "Which env?"]` → an ask; `["Deployed."]` → a plain message (`tell`). Unquoted words are
 * joined, so `inbox send ask Which env?` works too. A verb with nothing after it is a mistake, not a message.
 */
export function parseSendWords(words: string[]): { kind: InteractionKind; text: string } {
  const [first, ...rest] = words;

  if (isSendVerb(first)) {
    const text = rest.join(' ').trim();
    if (!text) {
      fail(`\`${first}\` needs the text to send, e.g. ${CLI_COMMAND} inbox send ${first} "${VERB_EXAMPLES[first]}"`);
    }

    return { kind: first, text };
  }

  const text = words.join(' ').trim();
  if (!text) {
    fail(`Pass the message to send, e.g. ${CLI_COMMAND} inbox send "Deployed."`);
  }

  return { kind: 'tell', text };
}

/** Flags that only make sense on one kind of send. Refused elsewhere instead of silently ignored. */
export function assertFlagsFit(kind: InteractionKind, options: SendOptions): void {
  if (kind === 'choose' && !options.option?.length) {
    fail('`choose` needs its options: repeat --option <label> for each (2-10).');
  }

  if (kind !== 'choose' && options.option?.length) {
    fail('`--option` only works with `choose`.');
  }

  if (kind !== 'approve' && (options.approveLabel || options.denyLabel || options.extraAction?.length)) {
    fail('`--approve-label`, `--deny-label` and `--extra-action` only work with `approve`.');
  }

  if (kind === 'tell' && options.timeout) {
    fail('`--timeout` only applies to ask, approve and choose: a plain message does not wait.');
  }
}

const POLL_INTERVAL_MS = 2000;

export function clientFromConfig(apiUrl?: string): {
  client: ApiClient;
  config: ReturnType<typeof resolveConfig>;
} {
  const config = resolveConfig({ apiUrl });
  const client = createApiClient({
    apiUrl: config.apiUrl,
    secretKey: config.auth.secretKey,
    keylessIdentifier: config.auth.mode === 'keyless' ? config.auth.keylessIdentifier : undefined,
  });

  return { client, config };
}

/** Matches Novu `HUMAN_INTERACTION_MAX_RECIPIENTS`. The CLI cannot import `@novu/shared`. */
const MAX_TO = 50;

export function parseToOption(raw: string, label = '`--to`'): string[] {
  const ids = [
    ...new Set(
      raw
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
    ),
  ];
  if (ids.length === 0) {
    fail(`${label} must name at least one contact`);
  }

  if (ids.length > MAX_TO) {
    fail(`${label} supports at most ${MAX_TO} contacts`);
  }

  return ids;
}

/** Recipient precedence: `--to` flag > INBOX_TO env > the operator saved by `setup`. */
export function resolveTo(config: CliConfig, toFlag?: string): string | string[] | undefined {
  if (toFlag) {
    return parseToOption(toFlag);
  }

  const envTo = process.env.INBOX_TO?.trim();
  if (envTo) {
    return parseToOption(envTo, 'INBOX_TO');
  }

  return config.subscriberId;
}

/**
 * Which of your channel defaults apply to a send. INBOX_VIA pairs with INBOX_TO
 * as the default recipient (the headless setup), so it applies unless `--to`
 * names someone else. The saved default channel describes how *you* like to be
 * reached, so it only applies when every resolved recipient is you.
 */
export function channelDefaultsFor(
  config: CliConfig,
  toFlag: string | undefined,
  recipients: string | string[]
): { useEnvVia: boolean; useSavedDefault: boolean } {
  const ids = Array.isArray(recipients) ? recipients : [recipients];
  const onlyYou = ids.length > 0 && ids.every((id) => id === config.subscriberId);

  return { useEnvVia: !toFlag || onlyYou, useSavedDefault: onlyYou };
}

/**
 * The engine behind `inbox send` and `inbox reply`. With `conversation`, the message goes into it;
 * without, it starts a conversation with `--to` (or the default recipient).
 */
export async function runSend(words: string[], options: SendOptions, conversation?: string): Promise<never> {
  try {
    const { kind, text } = parseSendWords(words);
    assertFlagsFit(kind, options);

    const { client, config } = clientFromConfig(options.apiUrl);
    const address = resolveAddress(config, options, conversation);
    const to = address.to
      ? await resolveEmailRecipients(client, config.relayAgentIdentifier, address.to, conversation !== undefined)
      : undefined;

    const parsedOptions = options.option?.map(parseIdLabelOption);
    const extraActions = options.extraAction?.map(parseIdLabelOption);
    const card = buildInteractionCard({
      title: text,
      icon: options.icon,
      subtitle: options.subtitle,
      body: options.body,
      approveLabel: options.approveLabel,
      denyLabel: options.denyLabel,
      extraActions,
      options: parsedOptions,
    });

    const input: CreateInteractionInput = {
      kind,
      card,
      ...address,
      ...(to ? { to } : {}),
      agentIdentifier: config.relayAgentIdentifier,
      ...(options.from ? { from: options.from } : {}),
      ...(options.ttl ? { ttlSeconds: parseDuration(options.ttl) } : {}),
    };

    const created = await createInteraction(client, input);

    if (created.failedTo?.length) {
      process.stderr.write(`warning: delivered to some recipients but failed for: ${created.failedTo.join(', ')}\n`);
    }

    if (!options.json) {
      reportConversations(created, conversation !== undefined);
    }

    if (kind === 'tell' || options.async) {
      process.exit(emitResult(created, Boolean(options.json)));
    }

    process.exit(await waitForResolution(client, created, options));
  } catch (err) {
    handleError(err);
  }
}

/**
 * Where a send goes. With a conversation, its contact may answer, unless `--to` names someone else or
 * `--anyone` opens it to everyone there. Without one, the message starts a conversation with `--to`,
 * or with the default recipient (INBOX_TO, then you).
 */
export function resolveAddress(
  config: CliConfig,
  options: Pick<SendOptions, 'to' | 'via' | 'anyone'>,
  conversation?: string
): Pick<CreateInteractionInput, 'to' | 'thread' | 'via' | 'anyoneMayAnswer'> {
  if (options.anyone && conversation === undefined) {
    fail('`--anyone` only works with `inbox reply`: it is about who may answer in a conversation.');
  }

  if (conversation !== undefined) {
    const id = conversation.trim();

    if (!id) {
      fail(`\`inbox reply\` needs a conversation id. List conversations with: ${CLI_COMMAND} inbox list`);
    }

    if (options.via) {
      fail('`--via` cannot be used with `inbox reply`: a conversation already lives on one channel.');
    }

    if (options.anyone && options.to) {
      fail('`--anyone` cannot be combined with `--to`: name who may answer, or let anyone.');
    }

    return {
      thread: id,
      ...(options.to ? { to: parseToOption(options.to) } : {}),
      ...(options.anyone ? { anyoneMayAnswer: true } : {}),
    };
  }

  const to = resolveTo(config, options.to);

  if (!to) {
    fail(NOT_SET_UP_MESSAGE);
  }

  // `--via` always wins. Otherwise only the defaults that fit the recipients
  // apply; omit via and the API uses each person's own default channel.
  const via = resolveVia(config, options.via, channelDefaultsFor(config, options.to, to));

  return { to, ...(via ? { via } : {}) };
}

/**
 * Swaps each email address for the contact that has it. A new conversation with an address nobody has
 * yet makes that person a contact and sends them the verification email, but nothing else: an address
 * has to be verified before the agent may write to it, so the send stops there.
 */
export async function resolveEmailRecipients(
  client: ApiClient,
  agentIdentifier: string,
  to: string | string[],
  isReply: boolean
): Promise<string | string[]> {
  const ids = Array.isArray(to) ? to : [to];
  if (!ids.some(isEmailAddress)) {
    return to;
  }

  const resolved: string[] = [];
  const newcomers: Array<{ id: string; email: string }> = [];

  for (const value of ids) {
    if (!isEmailAddress(value)) {
      resolved.push(value);
      continue;
    }

    // Two new addresses in one command must not end up as the same contact.
    const reserved = new Set(newcomers.map((newcomer) => newcomer.id));
    const contact = await resolveEmailContact(client, agentIdentifier, value, reserved);
    if (contact.exists) {
      resolved.push(contact.id);
    } else if (isReply) {
      fail(`${value} is not one of your contacts, so it cannot be in this conversation.`);
    } else {
      newcomers.push({ id: contact.id, email: value });
    }
  }

  if (newcomers.length > 0) {
    for (const newcomer of newcomers) {
      await runInvite(newcomer.id, { via: 'email', email: newcomer.email, async: true, apiUrl: client.apiUrl });
    }

    const who = newcomers.map((newcomer) => newcomer.email).join(', ');
    fail(
      `Your message was not sent: ${who} ${newcomers.length === 1 ? 'is' : 'are'} not verified yet. ` +
        'A verification email is on its way; send again once they have clicked it.'
    );
  }

  return Array.isArray(to) ? resolved : resolved[0];
}

/** One line per conversation a send landed in; on stderr so stdout stays the outcome alone. */
export function formatConversationReport(
  interaction: Pick<Interaction, 'threads'>,
  sentIntoConversation: boolean
): string[] {
  return (interaction.threads ?? []).flatMap((conversation) => {
    const lines = [`conversation: ${conversation.id}`];

    // A host that replies in a conversation has read it. One that writes to a contact may not know they wrote first.
    if (!sentIntoConversation && conversation.unreadBefore > 0) {
      const count = conversation.unreadBefore;
      lines.push(
        `warning: this conversation had ${count} unread ${count === 1 ? 'message' : 'messages'}, now marked read. ` +
          `See ${count === 1 ? 'it' : 'them'} with: ${CLI_COMMAND} inbox show ${conversation.id}`
      );
    }

    return lines;
  });
}

function reportConversations(interaction: Interaction, sentIntoConversation: boolean): void {
  for (const line of formatConversationReport(interaction, sentIntoConversation)) {
    process.stderr.write(`${line}\n`);
  }
}

export async function waitForResolution(
  client: ApiClient,
  interaction: Interaction,
  options: Pick<SendOptions, 'timeout' | 'json'>
): Promise<number> {
  const timeoutSeconds = options.timeout ? parseDuration(options.timeout) : Infinity;
  const deadline = Number.isFinite(timeoutSeconds) ? Date.now() + timeoutSeconds * 1000 : Infinity;

  const stopIndicator = startWaitIndicator(
    `Waiting for an answer on ${interaction.platform} (${interaction.id})`,
    `Ctrl-C detaches; ${answerHint(interaction)}`
  );

  let current = interaction;

  try {
    while (current.status === 'pending') {
      if (Date.now() >= deadline) {
        stopIndicator();
        if (options.json) {
          const json = interactionJson(keepConversations(current, interaction));
          process.stdout.write(`${JSON.stringify(json, null, 2)}\n`);
        } else {
          process.stdout.write(
            `Timed out waiting. Nobody has answered yet; it stays open until it expires, and ${answerHint(interaction)}\n`
          );
        }

        return EXIT_TIMEOUT;
      }

      // Client-side polling: each request is independent and short, so aborting
      // (Ctrl-C) stops all work immediately — no server-held long-poll to leak.
      await sleep(POLL_INTERVAL_MS);
      current = await getInteraction(client, current.id);
    }
  } finally {
    stopIndicator();
  }

  return emitResult(keepConversations(current, interaction), Boolean(options.json));
}

/** Only the create response says which conversations a message landed in, so later reads keep them. */
export function keepConversations(current: Interaction, created: Pick<Interaction, 'threads'>): Interaction {
  return created.threads ? { ...current, threads: created.threads } : current;
}

/** `id:label` keeps a stable id; a bare label is minted as `opt_N` server-side. */
export function parseIdLabelOption(raw: string): OptionInput {
  const colon = raw.indexOf(':');
  if (colon > 0) {
    const id = raw.slice(0, colon).trim();
    const label = raw.slice(colon + 1).trim();
    if (id && label && !/\s/.test(id)) {
      return { id, label };
    }
  }

  return raw;
}

export function buildInteractionCard(params: {
  title: string;
  icon?: string;
  subtitle?: string;
  body?: string;
  approveLabel?: string;
  denyLabel?: string;
  extraActions?: OptionInput[];
  options?: OptionInput[];
}): CreateInteractionCard {
  return {
    title: params.title,
    ...(params.icon ? { icon: params.icon } : {}),
    ...(params.subtitle ? { subtitle: params.subtitle } : {}),
    ...(params.body ? { body: params.body } : {}),
    ...(params.approveLabel ? { approveLabel: params.approveLabel } : {}),
    ...(params.denyLabel ? { denyLabel: params.denyLabel } : {}),
    ...(params.extraActions?.length ? { extraActions: params.extraActions } : {}),
    ...(params.options?.length ? { options: params.options } : {}),
  };
}

/** Accepts `90`, `90s`, `10m`, `2h`, `1d`. Plain numbers are seconds. */
export function parseDuration(value: string): number {
  const match = /^(\d+)([smhd]?)$/.exec(value.trim());
  if (!match) {
    fail(`Invalid duration "${value}". Use seconds or a suffixed value like 90s, 10m, 2h, 1d.`);
  }

  const amount = Number(match[1]);
  const unit = match[2] || 's';
  const multiplier = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;

  return amount * multiplier;
}

/** Matches the API's `KEYLESS_HUMAN_CAP_REACHED_CODE`. The CLI cannot import `apps/api`. */
const KEYLESS_CAP_CODE = 'KEYLESS_HUMAN_CAP_REACHED';

/** Matches the API's `KEYLESS_EMAIL_REQUIRES_ACCOUNT_CODE`. */
const KEYLESS_EMAIL_CODE = 'KEYLESS_EMAIL_REQUIRES_ACCOUNT';

interface KeylessBlock {
  claimUrl?: string;
  /** The API has `login` (the Agent Inbox dashboard); self-hosted and older APIs need a secret key instead. */
  browserLogin: boolean;
}

/** The two ways a keyless demo stops an interaction: out of messages, or email is not included. */
export type KeylessCapDetails = (KeylessBlock & { reason: 'cap'; cap?: number }) | (KeylessBlock & { reason: 'email' });

/**
 * The keyless demo cap: a 429 whose body carries `code: KEYLESS_HUMAN_CAP_REACHED`
 * (falling back to the message wording for older APIs). The operator already got
 * the same claim link on their channel; the agent just needs to stop retrying.
 */
export function getKeylessCapDetails(err: unknown): KeylessCapDetails | null {
  if (!(err instanceof ApiError)) {
    return null;
  }

  const body = (err.body && typeof err.body === 'object' ? err.body : {}) as {
    code?: unknown;
    claimUrl?: unknown;
    cap?: unknown;
    browserLogin?: unknown;
  };
  const claimUrl = typeof body.claimUrl === 'string' ? body.claimUrl : undefined;
  const browserLogin = body.browserLogin === true;

  if (err.status === 403 && body.code === KEYLESS_EMAIL_CODE) {
    return { claimUrl, browserLogin, reason: 'email' };
  }

  if (err.status !== 429) {
    return null;
  }

  if (body.code !== KEYLESS_CAP_CODE && !/keyless demo/i.test(err.message)) {
    return null;
  }

  return {
    claimUrl,
    cap: typeof body.cap === 'number' ? body.cap : undefined,
    browserLogin,
    reason: 'cap',
  };
}

export function formatKeylessCapMessage(details: KeylessCapDetails): string {
  if (details.reason === 'email') {
    return formatKeylessEmailMessage(details);
  }

  const count = details.cap ? `${details.cap} free messages` : 'free messages';
  const lines = [`You've used the ${count} of this keyless demo.`];

  if (details.browserLogin) {
    lines.push(`To keep your channels and continue, run: ${CLI_COMMAND} login`);

    if (details.claimUrl) {
      lines.push(
        `(Or sign up from this link, which we also sent to your linked channel, then run \`${CLI_COMMAND} login\`: ${details.claimUrl})`
      );
    }

    return lines.join('\n');
  }

  // Without `login` (self-hosted or older APIs), the operator signs up and copies the environment's key.
  lines.push(
    details.claimUrl
      ? `Sign up to keep your channels and continue: ${details.claimUrl}`
      : 'Sign up for a free Novu account to keep your channels and continue.',
    '(We also sent this link to you on your linked channel.)',
    `After signing up, run: ${CLI_COMMAND} setup --secret-key <key>   or set INBOX_SECRET_KEY`
  );

  return lines.join('\n');
}

function formatKeylessEmailMessage(details: KeylessCapDetails): string {
  if (details.browserLogin) {
    const lines = [
      'Outbound email needs an Agent Inbox account.',
      `To claim this setup and send email, run: ${CLI_COMMAND} login`,
    ];

    if (details.claimUrl) {
      lines.push(`(Or sign up from this link, then run \`${CLI_COMMAND} login\`: ${details.claimUrl})`);
    }

    return lines.join('\n');
  }

  const lines = [
    'Outbound email needs a Novu account.',
    details.claimUrl
      ? `Sign up to claim this setup: ${details.claimUrl}`
      : 'Sign up for a free Novu account to claim this setup.',
    `After signing up, run: ${CLI_COMMAND} setup --secret-key <key>   or set INBOX_SECRET_KEY`,
  ];

  return lines.join('\n');
}

export function handleError(err: unknown): never {
  const keylessCap = getKeylessCapDetails(err);
  if (keylessCap) {
    fail(formatKeylessCapMessage(keylessCap));
  }

  if (err instanceof ApiError) {
    fail(err.status ? `${err.message} (${err.status})` : err.message);
  }

  if (err instanceof SetupStillPendingError) {
    process.stderr.write(`${pc.yellow('pending:')} ${err.message}\n`);
    process.exit(EXIT_TIMEOUT);
  }

  fail(err instanceof Error ? err.message : String(err));
}
