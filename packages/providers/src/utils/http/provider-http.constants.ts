/**
 * Upper bound on a single outbound provider HTTP request.
 *
 * Axios treats an omitted `timeout` as `0`, meaning "wait forever", which lets an
 * unresponsive provider API hold a worker slot indefinitely. The queue layers do not
 * rescue us here: BullMQ renews the job lock and the SQS consumer extends message
 * visibility for as long as the handler is awaiting, so a hung request is never
 * reclaimed on its own.
 *
 * 120s sits far above any plausible provider latency, so it cannot fail a send that
 * would otherwise have succeeded, while still bounding the hang.
 */
export const DEFAULT_PROVIDER_HTTP_TIMEOUT_MS = 120_000;

export const PROVIDER_HTTP_TIMEOUT_MS_ENV_VAR = 'NOVU_PROVIDER_HTTP_TIMEOUT_MS';

/**
 * Exported for testing; production code should read {@link PROVIDER_HTTP_TIMEOUT_MS},
 * which is resolved once at module load and therefore cannot be reconfigured at runtime.
 */
export const resolveProviderHttpTimeoutMs = (env: Record<string, string | undefined> | undefined): number => {
  const raw = env?.[PROVIDER_HTTP_TIMEOUT_MS_ENV_VAR];

  if (!raw) {
    return DEFAULT_PROVIDER_HTTP_TIMEOUT_MS;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_PROVIDER_HTTP_TIMEOUT_MS;
  }

  return parsed;
};

/**
 * `@novu/providers` is published and bundled for non-Node consumers, so `process`
 * cannot be assumed to exist.
 */
export const PROVIDER_HTTP_TIMEOUT_MS = resolveProviderHttpTimeoutMs(
  typeof process === 'undefined' ? undefined : process.env
);
