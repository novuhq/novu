import { createHumanApiClient, type HumanApiClient, HumanApiError } from '../api/client';
import {
  type CreateInteractionCard,
  type CreateInteractionInput,
  createInteraction,
  getInteraction,
  type HumanOptionInput,
  type Interaction,
  type InteractionKind,
} from '../api/human';
import { type HumanCliConfig, NOT_SET_UP_MESSAGE, resolveConfig, resolveVia } from '../config';
import { EXIT_TIMEOUT, emitResult, fail } from '../output';
import { sleep } from '../poll';
import { startWaitIndicator } from '../spinner';

export interface InteractOptions {
  to?: string;
  /** Inbox thread to send into, instead of starting a new one with `to`. */
  thread?: string;
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

const POLL_INTERVAL_MS = 2000;

export function clientFromConfig(apiUrl?: string): {
  client: HumanApiClient;
  config: ReturnType<typeof resolveConfig>;
} {
  const config = resolveConfig({ apiUrl });
  const client = createHumanApiClient({
    apiUrl: config.apiUrl,
    secretKey: config.auth.secretKey,
    keylessIdentifier: config.auth.mode === 'keyless' ? config.auth.keylessIdentifier : undefined,
  });

  return { client, config };
}

/** Matches Novu `HUMAN_INTERACTION_MAX_RECIPIENTS`. The CLI cannot import `@novu/shared`. */
const MAX_HUMAN_TO = 50;

export function parseHumanToOption(raw: string, label = '`--to`'): string[] {
  const ids = [
    ...new Set(
      raw
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
    ),
  ];
  if (ids.length === 0) {
    fail(`${label} must include at least one subscriberId`);
  }

  if (ids.length > MAX_HUMAN_TO) {
    fail(`${label} supports at most ${MAX_HUMAN_TO} subscriberIds`);
  }

  return ids;
}

/** Recipient precedence: `--to` flag > HUMAN_TO env > config file subscriberId. */
export function resolveTo(config: HumanCliConfig, toFlag?: string): string | string[] | undefined {
  if (toFlag) {
    return parseHumanToOption(toFlag);
  }

  const envTo = process.env.HUMAN_TO?.trim();
  if (envTo) {
    return parseHumanToOption(envTo, 'HUMAN_TO');
  }

  return config.subscriberId;
}

/**
 * Which of your channel defaults apply to a send. HUMAN_VIA pairs with HUMAN_TO
 * as the default recipient (the headless setup), so it applies unless `--to`
 * names someone else. The saved default channel describes how *you* like to be
 * reached, so it only applies when every resolved recipient is you.
 */
export function channelDefaultsFor(
  config: HumanCliConfig,
  toFlag: string | undefined,
  recipients: string | string[]
): { useEnvVia: boolean; useSavedDefault: boolean } {
  const ids = Array.isArray(recipients) ? recipients : [recipients];
  const onlyYou = ids.length > 0 && ids.every((id) => id === config.subscriberId);

  return { useEnvVia: !toFlag || onlyYou, useSavedDefault: onlyYou };
}

/** Shared engine behind ask / approve / choose / tell. */
export async function runInteraction(kind: InteractionKind, prompt: string, options: InteractOptions): Promise<never> {
  try {
    const { client, config } = clientFromConfig(options.apiUrl);

    const address = resolveAddress(config, options);

    const parsedOptions = options.option?.map(parseIdLabelOption);
    const extraActions = options.extraAction?.map(parseIdLabelOption);
    const card = buildInteractionCard({
      title: prompt,
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
      agentIdentifier: config.relayAgentIdentifier,
      ...(options.from ? { from: options.from } : {}),
      ...(options.ttl ? { ttlSeconds: parseDuration(options.ttl) } : {}),
    };

    const created = await createInteraction(client, input);

    if (created.failedTo?.length) {
      process.stderr.write(`warning: delivered to some recipients but failed for: ${created.failedTo.join(', ')}\n`);
    }

    if (!options.json) {
      reportThreads(created, Boolean(options.thread));
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
 * Where a send goes. `--thread` continues a thread, and `--to` then only says who may answer.
 * Without `--thread`, the message starts a new thread with `--to`, or with you when nobody is named.
 */
export function resolveAddress(
  config: HumanCliConfig,
  options: Pick<InteractOptions, 'to' | 'thread' | 'via'>
): Pick<CreateInteractionInput, 'to' | 'thread' | 'via'> {
  if (options.thread !== undefined) {
    const thread = options.thread.trim();

    if (!thread) {
      fail('`--thread` needs a thread id. List threads with: human inbox list');
    }

    if (options.via) {
      fail('`--via` cannot be combined with `--thread`: a thread already lives on one channel.');
    }

    return { thread, ...(options.to ? { to: parseHumanToOption(options.to) } : {}) };
  }

  const to = resolveTo(config, options.to);

  if (!to) {
    fail(NOT_SET_UP_MESSAGE);
  }

  // `--via` always wins. Otherwise only the defaults that fit the recipients
  // apply; omit via and the API uses each human's own default channel.
  const via = resolveVia(config, options.via, channelDefaultsFor(config, options.to, to));

  return { to, ...(via ? { via } : {}) };
}

/** One line per thread a send landed in; on stderr so stdout stays the outcome alone. */
export function formatThreadReport(interaction: Pick<Interaction, 'threads'>, sentIntoThread: boolean): string[] {
  return (interaction.threads ?? []).flatMap((thread) => {
    const lines = [`thread: ${thread.id}`];

    // A host that answers in a thread has read it. One that writes to a contact may not know they wrote first.
    if (!sentIntoThread && thread.unreadBefore > 0) {
      lines.push(
        `warning: thread ${thread.id} had ${thread.unreadBefore} unread ${
          thread.unreadBefore === 1 ? 'message' : 'messages'
        }, now marked read. See ${thread.unreadBefore === 1 ? 'it' : 'them'} with: human inbox show ${thread.id}`
      );
    }

    return lines;
  });
}

function reportThreads(interaction: Interaction, sentIntoThread: boolean): void {
  for (const line of formatThreadReport(interaction, sentIntoThread)) {
    process.stderr.write(`${line}\n`);
  }
}

export async function waitForResolution(
  client: HumanApiClient,
  interaction: Interaction,
  options: Pick<InteractOptions, 'timeout' | 'json'>
): Promise<number> {
  const timeoutSeconds = options.timeout ? parseDuration(options.timeout) : Infinity;
  const deadline = Number.isFinite(timeoutSeconds) ? Date.now() + timeoutSeconds * 1000 : Infinity;

  const stopIndicator = startWaitIndicator(
    `Waiting for a human on ${interaction.platform} (${interaction.id})`,
    `Ctrl-C detaches; resume with: human interaction wait ${interaction.id}`
  );

  let current = interaction;

  try {
    while (current.status === 'pending') {
      if (Date.now() >= deadline) {
        stopIndicator();
        if (options.json) {
          process.stdout.write(`${JSON.stringify(current, null, 2)}\n`);
        } else {
          process.stdout.write(
            `Timed out waiting. Interaction ${current.id} is still pending — resume with: human interaction wait ${current.id}\n`
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

  return emitResult(current, Boolean(options.json));
}

/** `id:label` keeps a stable id; a bare label is minted as `opt_N` server-side. */
export function parseIdLabelOption(raw: string): HumanOptionInput {
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
  extraActions?: HumanOptionInput[];
  options?: HumanOptionInput[];
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

export interface KeylessCapDetails {
  claimUrl?: string;
  cap?: number;
  /** The API has `human login` (the Human dashboard); self-hosted and older APIs need a secret key instead. */
  browserLogin?: boolean;
}

/**
 * The keyless demo cap: a 429 whose body carries `code: KEYLESS_HUMAN_CAP_REACHED`
 * (falling back to the message wording for older APIs). The human already got
 * the same claim link on their channel; the agent just needs to stop retrying.
 */
export function getKeylessCapDetails(err: unknown): KeylessCapDetails | null {
  if (!(err instanceof HumanApiError) || err.status !== 429) {
    return null;
  }

  const body = (err.body && typeof err.body === 'object' ? err.body : {}) as {
    code?: unknown;
    claimUrl?: unknown;
    cap?: unknown;
    browserLogin?: unknown;
  };

  if (body.code !== KEYLESS_CAP_CODE && !/keyless demo/i.test(err.message)) {
    return null;
  }

  return {
    claimUrl: typeof body.claimUrl === 'string' ? body.claimUrl : undefined,
    cap: typeof body.cap === 'number' ? body.cap : undefined,
    browserLogin: body.browserLogin === true,
  };
}

export function formatKeylessCapMessage(details: KeylessCapDetails): string {
  const count = details.cap ? `${details.cap} free messages` : 'free messages';
  const lines = [`You've used the ${count} of this keyless demo.`];

  if (details.browserLogin) {
    lines.push('To keep your channels and continue, run: human login');

    if (details.claimUrl) {
      lines.push(
        `(Or sign up from this link, which we also sent to your linked channel, then run \`human login\`: ${details.claimUrl})`
      );
    }

    return lines.join('\n');
  }

  // Without `human login` (self-hosted or older APIs), the operator signs up and copies the environment's key.
  lines.push(
    details.claimUrl
      ? `Sign up to keep your channels and continue: ${details.claimUrl}`
      : 'Sign up for a free Novu account to keep your channels and continue.',
    '(We also sent this link to you on your linked channel.)',
    'After signing up, run: human setup --secret-key <key>   or set NOVU_SECRET_KEY'
  );

  return lines.join('\n');
}

export function handleError(err: unknown): never {
  const keylessCap = getKeylessCapDetails(err);
  if (keylessCap) {
    fail(formatKeylessCapMessage(keylessCap));
  }

  if (err instanceof HumanApiError) {
    fail(err.status ? `${err.message} (${err.status})` : err.message);
  }

  fail(err instanceof Error ? err.message : String(err));
}
