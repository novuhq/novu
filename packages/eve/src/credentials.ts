/**
 * Novu credential resolution for the Eve channel.
 *
 * Env-first (works everywhere — self-host, non-Vercel): `NOVU_SECRET_KEY`,
 * `NOVU_AGENT_IDENTIFIER`, `NOVU_API_BASE_URL`. Explicit options passed to
 * `novuChannel({...})` win over env. {@link connectNovuCredentials} is the
 * Vercel-native helper (mirrors Eve's `connectSlackCredentials`).
 */

const DEFAULT_API_BASE_URL = 'https://api.novu.co';

/** Fully-resolved credentials needed to talk to Novu's agent reply flow. */
export interface NovuCredentials {
  readonly secretKey: string;
  readonly agentIdentifier: string;
  readonly apiBaseUrl: string;
}

/** Partial credentials supplied in code; missing fields fall back to env. */
export interface NovuCredentialsInput {
  readonly secretKey?: string;
  readonly agentIdentifier?: string;
  readonly apiBaseUrl?: string;
}

/**
 * A credentials source: either resolved credentials, partial input (env fills
 * the gaps), or a (possibly async) resolver — e.g. the Vercel Connect helper
 * mints fresh credentials per call.
 */
export type NovuCredentialsSource =
  | NovuCredentialsInput
  | (() => NovuCredentials | NovuCredentialsInput | Promise<NovuCredentials | NovuCredentialsInput>);

function fromInput(input: NovuCredentialsInput): NovuCredentials {
  const secretKey = input.secretKey ?? process.env.NOVU_SECRET_KEY;
  const agentIdentifier = input.agentIdentifier ?? process.env.NOVU_AGENT_IDENTIFIER;
  const apiBaseUrl = input.apiBaseUrl ?? process.env.NOVU_API_BASE_URL ?? DEFAULT_API_BASE_URL;

  if (!secretKey) {
    throw new Error(
      '@novu/eve: missing Novu secret key. Set NOVU_SECRET_KEY or pass `secretKey` to novuChannel({ credentials }).',
    );
  }
  if (!agentIdentifier) {
    throw new Error(
      '@novu/eve: missing Novu agent identifier. Set NOVU_AGENT_IDENTIFIER or pass `agentIdentifier` to novuChannel({ credentials }).',
    );
  }
  return { secretKey, agentIdentifier, apiBaseUrl };
}

/** Resolve a {@link NovuCredentialsSource} to concrete {@link NovuCredentials}. */
export async function resolveNovuCredentials(source: NovuCredentialsSource = {}): Promise<NovuCredentials> {
  const value = typeof source === 'function' ? await source() : source;
  return fromInput(value);
}

/**
 * Vercel-native credentials helper. On Vercel, `handle` names the connected Novu
 * integration whose managed credentials are injected at runtime; off-Vercel it
 * transparently falls back to env (+ any `overrides`). Mirrors Eve's
 * `connectSlackCredentials("slack/my-agent")` ergonomics.
 *
 * Returns a resolver so credentials are read lazily (and can be refreshed),
 * never captured at module-load time.
 */
export function connectNovuCredentials(
  handle: string,
  overrides: NovuCredentialsInput = {},
): () => NovuCredentials {
  return () =>
    fromInput({
      // `handle` reserves the Vercel Connect binding; env/overrides are the
      // universal fallback so the same code runs locally and self-hosted.
      secretKey: overrides.secretKey ?? process.env[`NOVU_SECRET_KEY_${handleEnvSuffix(handle)}`],
      agentIdentifier: overrides.agentIdentifier,
      apiBaseUrl: overrides.apiBaseUrl,
    });
}

function handleEnvSuffix(handle: string): string {
  return handle.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
}
