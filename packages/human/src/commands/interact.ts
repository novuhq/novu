import {
  createInteraction,
  type CreateInteractionInput,
  type Interaction,
  type InteractionKind,
  waitInteraction,
} from '../api/human';
import { createHumanApiClient, HumanApiError, type HumanApiClient } from '../api/client';
import { NOT_SET_UP_MESSAGE, resolveChannel, resolveConfig } from '../config';
import { emitResult, EXIT_TIMEOUT, fail } from '../output';
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

const SERVER_POLL_SECONDS = 25;

export function clientFromConfig(apiUrl?: string): { client: HumanApiClient; config: ReturnType<typeof resolveConfig> } {
  const config = resolveConfig({ apiUrl });
  const client = createHumanApiClient({
    apiUrl: config.apiUrl,
    secretKey: config.auth.secretKey,
    keylessIdentifier: config.auth.mode === 'keyless' ? config.auth.keylessIdentifier : undefined,
  });

  return { client, config };
}

/** Shared engine behind ask / approve / choose / tell. */
export async function runInteraction(kind: InteractionKind, prompt: string, options: InteractOptions): Promise<never> {
  try {
    const { client, config } = clientFromConfig(options.apiUrl);

    const to = options.to ?? config.subscriberId;

    if (!to) {
      fail(NOT_SET_UP_MESSAGE);
    }

    // Channel choice is the human's preference (set at `human setup`);
    // `--via` is the rare per-call override.
    const channel = resolveChannel(config, options.via);

    const input: CreateInteractionInput = {
      kind,
      prompt,
      to,
      integrationIdentifier: channel.integrationIdentifier,
      agentIdentifier: config.relayAgentIdentifier,
      ...(options.from ? { from: options.from } : {}),
      ...(options.option?.length ? { options: options.option } : {}),
      ...(options.ttl ? { ttlSeconds: parseDuration(options.ttl) } : {}),
    };

    const created = await createInteraction(client, input);

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

      const remaining = Number.isFinite(deadline) ? Math.max(1, Math.floor((deadline - Date.now()) / 1000)) : Infinity;
      current = await waitInteraction(client, current.id, Math.min(SERVER_POLL_SECONDS, remaining));
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

export function handleError(err: unknown): never {
  if (err instanceof HumanApiError) {
    fail(err.status ? `${err.message} (${err.status})` : err.message);
  }

  fail(err instanceof Error ? err.message : String(err));
}
