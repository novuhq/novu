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
import { NOT_SET_UP_MESSAGE, resolveConfig, resolveVia } from '../config';
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

export function parseHumanToOption(raw: string): string[] {
  const ids = [
    ...new Set(
      raw
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
    ),
  ];
  if (ids.length === 0) {
    fail('`--to` must include at least one subscriberId');
  }

  if (ids.length > MAX_HUMAN_TO) {
    fail(`\`--to\` supports at most ${MAX_HUMAN_TO} subscriberIds`);
  }

  return ids;
}

/** Shared engine behind ask / approve / choose / tell. */
export async function runInteraction(kind: InteractionKind, prompt: string, options: InteractOptions): Promise<never> {
  try {
    const { client, config } = clientFromConfig(options.apiUrl);

    const to = options.to ? parseHumanToOption(options.to) : config.subscriberId;

    if (!to) {
      fail(NOT_SET_UP_MESSAGE);
    }

    // `--via` or the saved defaultChannel preference; omit via and the API
    // picks when only one channel is linked.
    const via = resolveVia(config, options.via);

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
      to,
      ...(via ? { via } : {}),
      agentIdentifier: config.relayAgentIdentifier,
      ...(options.from ? { from: options.from } : {}),
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

function buildInteractionCard(params: {
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

export function handleError(err: unknown): never {
  if (err instanceof HumanApiError) {
    fail(err.status ? `${err.message} (${err.status})` : err.message);
  }

  fail(err instanceof Error ? err.message : String(err));
}
