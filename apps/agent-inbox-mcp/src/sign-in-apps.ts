import type { HostId } from './connections';
import type { Env } from './env';

/** The Clerk Backend API, which answers to the Agent Inbox Clerk app's secret key. */
const CLERK_API_URL = 'https://api.clerk.com/v1';
const CLERK_TIMEOUT_MS = 5_000;
/** Where Clerk returns the sign-ins of a sign-in app made in Cursor's cloud. */
const CURSOR_CLOUD_CALLBACK = 'https://www.cursor.com/agents/';
/** How long the host of a sign-in app is remembered: where its sign-ins return doesn't change. */
const SIGN_IN_APP_TTL_SECONDS = 30 * 24 * 60 * 60;

/**
 * Which host a sign-in app is, by the addresses Clerk returns its sign-ins to, or `null` for none of these.
 *
 * Cursor's agent runtime connects with the same name (`Cursor`) and User-Agent (`Cursor/1.0.0`) in the Cursor
 * editor and in Cursor's cloud, where Grok Bot runs on it, and both register a sign-in app called Cursor. The
 * editor's returns to `cursor://`; one made in Cursor's cloud returns only to Cursor's web address. Cursor's own
 * cloud agents sign in that way too, so they read as Grok Bot.
 */
export function hostOfRedirectUris(redirectUris: readonly string[]): HostId | null {
  if (redirectUris.some((uri) => uri.startsWith('cursor://'))) {
    return 'cursor';
  }

  return redirectUris.some((uri) => uri.startsWith(CURSOR_CLOUD_CALLBACK)) ? 'grok' : null;
}

/**
 * Which host signed in with a token, by the sign-in app Clerk issued it to (`hostOfRedirectUris`), or `null`
 * when Clerk can't say: without the Clerk app's secret key, or when Clerk doesn't answer. Each sign-in app's
 * host is remembered, so Clerk is asked for its addresses once.
 */
export async function signInAppHost(token: string, env: Env): Promise<HostId | null> {
  const secret = env.CLERK_SECRET_KEY?.trim();
  if (!secret) {
    return null;
  }

  const clientId = await clientIdOf(token, secret);
  if (!clientId) {
    return null;
  }

  const cacheKey = `sign-in-app:${clientId}`;
  const remembered = await env.CONNECTIONS?.get<{ host: HostId | null }>(cacheKey, 'json');
  if (remembered) {
    return remembered.host;
  }

  const redirectUris = await redirectUrisOf(clientId, secret);
  if (!redirectUris) {
    return null;
  }

  const host = hostOfRedirectUris(redirectUris);
  await env.CONNECTIONS?.put(cacheKey, JSON.stringify({ host }), { expirationTtl: SIGN_IN_APP_TTL_SECONDS });

  return host;
}

/** The id of the sign-in app Clerk issued a token to. */
async function clientIdOf(token: string, secret: string): Promise<string | null> {
  const body = await askClerk<{ client_id?: unknown }>('/oauth_applications/access_tokens/verify', secret, {
    access_token: token,
  });
  const clientId = body?.client_id;

  return typeof clientId === 'string' && clientId ? clientId : null;
}

/** Where Clerk returns a sign-in app's sign-ins. Clerk's list finds an app by its exact client id. */
async function redirectUrisOf(clientId: string, secret: string): Promise<string[] | null> {
  const body = await askClerk<{ data?: Array<{ client_id?: unknown; redirect_uris?: unknown }> }>(
    `/oauth_applications?${new URLSearchParams({ name_query: clientId })}`,
    secret
  );
  const app = body?.data?.find((candidate) => candidate.client_id === clientId);

  return Array.isArray(app?.redirect_uris)
    ? app.redirect_uris.filter((uri): uri is string => typeof uri === 'string')
    : null;
}

/** One call to the Clerk Backend API, a GET or a POST of `body`, or `null` when Clerk doesn't answer it. */
async function askClerk<T>(path: string, secret: string, body?: unknown): Promise<T | null> {
  try {
    const response = await fetch(`${CLERK_API_URL}${path}`, {
      ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }),
      headers: {
        Authorization: `Bearer ${secret}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      signal: AbortSignal.timeout(CLERK_TIMEOUT_MS),
    });

    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}
