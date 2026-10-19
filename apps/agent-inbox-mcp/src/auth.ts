import { AGENT_INBOX_DASHBOARD_SECRET_HEADER } from './constants';
import { apiUrls, type Env, issuerOf, type Region } from './env';

/** The Agent Inbox account a request acts for, and the key to its part of the Novu API. */
export type Account = {
  /** The person's id in the Agent Inbox Clerk app. */
  agentInboxUserId: string;
  region: Region;
  apiUrl: string;
  secretKey: string;
};

/** Why a request can't act for an account. `401` asks the tool to sign in (again). */
export class AuthError extends Error {
  constructor(
    readonly status: 401 | 403 | 503,
    message: string
  ) {
    super(message);
  }
}

const USERINFO_TIMEOUT_MS = 8_000;
const API_TIMEOUT_MS = 8_000;

/**
 * How long a token's owner is remembered, so not every call asks Clerk again. It counts from when Clerk
 * was last asked, so a token Clerk no longer accepts stops working within this long.
 */
const IDENTITY_TTL_SECONDS = 300;

type Identity = { agentInboxUserId: string; region?: Region };

/**
 * Finds the Agent Inbox account behind a request's bearer token.
 *
 * The token comes from the Agent Inbox Clerk app. Clerk is asked whose it is; this server never trusts what a
 * token says about itself. The account's key is then read from the Novu API with the secret the
 * dashboard uses, so the AI tool never holds the key.
 */
export async function authenticate(request: Request, env: Env): Promise<Account> {
  const token = bearerTokenOf(request);
  if (!token) {
    throw new AuthError(401, 'Sign in to Agent Inbox to use this server.');
  }

  const cacheKey = `token:${await sha256(token)}`;
  const remembered = await readJson<Identity>(env, cacheKey);
  if (remembered) {
    return loadAccount(remembered, env);
  }

  const account = await loadAccount(await identify(token, env), env);

  // Only an answer from Clerk is remembered. Renewing this on every call would keep a token alive forever.
  await env.CONNECTIONS?.put(
    cacheKey,
    JSON.stringify({ agentInboxUserId: account.agentInboxUserId, region: account.region }),
    { expirationTtl: IDENTITY_TTL_SECONDS }
  );

  return account;
}

export function bearerTokenOf(request: Request): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get('Authorization') ?? '');

  return match ? match[1] : null;
}

async function identify(token: string, env: Env): Promise<Identity> {
  const issuer = issuerOf(env);
  if (!issuer) {
    throw new AuthError(503, 'Sign-in is not configured on this server.');
  }

  let response: Response;
  try {
    response = await fetch(`${issuer}/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(USERINFO_TIMEOUT_MS),
    });
  } catch {
    throw new AuthError(503, 'Could not reach the sign-in service. Try again in a moment.');
  }

  if (response.status === 401 || response.status === 403) {
    throw new AuthError(401, 'Your Agent Inbox sign-in has expired. Sign in again.');
  }

  if (!response.ok) {
    throw new AuthError(503, 'The sign-in service did not answer. Try again in a moment.');
  }

  const body = (await response.json().catch(() => null)) as { sub?: unknown; user_id?: unknown } | null;
  const agentInboxUserId = [body?.user_id, body?.sub].find(
    (id): id is string => typeof id === 'string' && id.length > 0
  );
  if (!agentInboxUserId) {
    throw new AuthError(401, 'Your Agent Inbox sign-in could not be read. Sign in again.');
  }

  return { agentInboxUserId };
}

/** An account lives in one region. Which one isn't in the token, so the remembered one is asked first. */
async function loadAccount(identity: Identity, env: Env): Promise<Account> {
  if (!env.AGENT_INBOX_DASHBOARD_API_SECRET) {
    throw new AuthError(503, 'This server is not connected to the Agent Inbox API.');
  }

  const regions = apiUrls(env).sort(
    (a, b) => Number(b.region === identity.region) - Number(a.region === identity.region)
  );

  for (const { region, url } of regions) {
    const secretKey = await readSecretKey(url, identity.agentInboxUserId, env.AGENT_INBOX_DASHBOARD_API_SECRET);
    if (secretKey) {
      return { agentInboxUserId: identity.agentInboxUserId, region, apiUrl: url, secretKey };
    }
  }

  throw new AuthError(
    403,
    'There is no Agent Inbox account for this sign-in yet. Open agentinbox.md and sign up first.'
  );
}

/** The account's key in one region, or `null` when the account doesn't live there. */
async function readSecretKey(apiUrl: string, agentInboxUserId: string, secret: string): Promise<string | null> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}/v1/human/accounts/${encodeURIComponent(agentInboxUserId)}/secret-key`, {
      headers: { [AGENT_INBOX_DASHBOARD_SECRET_HEADER]: secret },
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch {
    throw new AuthError(503, 'Could not reach the Agent Inbox API. Try again in a moment.');
  }

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new AuthError(503, 'The Agent Inbox API did not answer. Try again in a moment.');
  }

  const body = (await response.json().catch(() => null)) as { data?: { secretKey?: unknown } } | null;
  const secretKey = body?.data?.secretKey;

  return typeof secretKey === 'string' && secretKey ? secretKey : null;
}

async function readJson<T>(env: Env, key: string): Promise<T | null> {
  return (await env.CONNECTIONS?.get<T>(key, 'json')) ?? null;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));

  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
