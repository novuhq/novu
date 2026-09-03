import { createHumanApiClient, type HumanApiClient, HumanApiError } from '../api/client';
import {
  type CreateInteractionInput,
  createInteraction,
  getInteraction,
  type Interaction,
  type InteractionKind,
} from '../api/human';
import { type HumanCliConfig, NOT_SET_UP_MESSAGE, resolveConfig, resolveVia } from '../config';
import { EXIT_TIMEOUT, emitResult, fail } from '../output';
import { sleep } from '../poll';
import { startWaitIndicator } from '../spinner';

export interface InteractOptions {
  to?: string;
  via?: string;
  from?: string;
  option?: string[];
  ttl?: string;
  timeout?: string;
  async?: boolean;
  json?: boolean;
  apiUrl?: string;
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

/** Shared engine behind ask / approve / choose / tell. */
export async function runInteraction(kind: InteractionKind, prompt: string, options: InteractOptions): Promise<never> {
  try {
    const { client, config } = clientFromConfig(options.apiUrl);

    const to = resolveTo(config, options.to);

    if (!to) {
      fail(NOT_SET_UP_MESSAGE);
    }

    // `--via`, HUMAN_VIA, or the saved defaultChannel preference; omit
    // via and the API picks when only one channel is linked.
    const via = resolveVia(config, options.via);

    const input: CreateInteractionInput = {
      kind,
      prompt,
      to,
      ...(via ? { via } : {}),
      agentIdentifier: config.relayAgentIdentifier,
      ...(options.from ? { from: options.from } : {}),
      ...(options.option?.length ? { options: options.option } : {}),
      ...(options.ttl ? { ttlSeconds: parseDuration(options.ttl) } : {}),
    };

    const created = await createInteraction(client, input);

    if (created.failedTo?.length) {
      process.stderr.write(`warning: delivered to some recipients but failed for: ${created.failedTo.join(', ')}\n`);
    }

    if (kind === 'tell' || options.async) {
      process.exit(emitResult(created, Boolean(options.json)));
    }

    process.exit(await waitForResolution(client, created, options));
  } catch (err) {
    handleError(err);
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
    `Ctrl-C detaches; resume with: human wait ${interaction.id}`
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
            `Timed out waiting. Interaction ${current.id} is still pending — resume with: human wait ${current.id}\n`
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
  };

  if (body.code !== KEYLESS_CAP_CODE && !/keyless demo/i.test(err.message)) {
    return null;
  }

  return {
    claimUrl: typeof body.claimUrl === 'string' ? body.claimUrl : undefined,
    cap: typeof body.cap === 'number' ? body.cap : undefined,
  };
}

export function formatKeylessCapMessage(details: KeylessCapDetails): string {
  const count = details.cap ? `${details.cap} free messages` : 'free messages';
  const lines = [`You've used the ${count} of this keyless demo.`];

  if (details.claimUrl) {
    lines.push(`Sign up to keep your channels and continue: ${details.claimUrl}`);
  } else {
    lines.push('Sign up for a free Novu account to keep your channels and continue.');
  }

  lines.push(
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
