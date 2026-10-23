import { AGENT_INBOX_DASHBOARD_SECRET_HEADER } from './constants';
import { type Env, issuerOf, urlOf } from './env';

/** The Agent Inbox account a request acts for, and where and with which key the tools call the API as it. */
export type Account = {
  /** The person's id in the Agent Inbox Clerk app. */
  agentInboxUserId: string;
  /** The Agent Inbox Dashboard API. */
  apiUrl: string;
  secretKey: string;
  /**
   * The email Clerk knows for this sign-in, when the token carried the `email` scope. A suggestion for
   * the AI to confirm with the user before `inbox_setup` sends a confirmation link — never used as a
   * delivery address on its own.
   */
  email?: string;
};

/** Why a request can't act for an account. `401` asks the tool to sign in (again). */
export class AuthError extends Error {
  constructor(
    readonly status: 401 | 503,
    message: string
  ) {
    super(message);
  }
}

const USERINFO_TIMEOUT_MS = 8_000;
const API_TIMEOUT_MS = 8_000;
/** Opening an account creates its Novu organization. That takes longer than reading a key. */
const ACCOUNT_SETUP_TIMEOUT_MS = 30_000;

/**
 * How long a token's owner is remembered, so not every call asks Clerk again. It counts from when Clerk
 * was last asked, so a token Clerk no longer accepts stops working within this long.
 */
const IDENTITY_TTL_SECONDS = 300;

/** What is remembered about a token. An entry from before Agent Inbox was US only also has a `region`, unused now. */
type Identity = { agentInboxUserId: string; email?: string; firstName?: string; lastName?: string };

/**
 * Finds the Agent Inbox account behind a request's bearer token.
 *
 * The token comes from the Agent Inbox Clerk app. Clerk is asked whose it is; this server never trusts what a
 * token says about itself. When that person has no Agent Inbox account yet, this server opens one. The
 * account's key is then read from the Novu API with the secret the dashboard uses, so the AI tool never holds
 * the key. The tools call the Dashboard API with it.
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
  const identity: Identity = {
    agentInboxUserId: account.agentInboxUserId,
    ...(account.email ? { email: account.email } : {}),
  };
  await env.CONNECTIONS?.put(cacheKey, JSON.stringify(identity), { expirationTtl: IDENTITY_TTL_SECONDS });

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

  const body = (await response.json().catch(() => null)) as {
    sub?: unknown;
    user_id?: unknown;
    email?: unknown;
    given_name?: unknown;
    family_name?: unknown;
  } | null;
  const agentInboxUserId = [body?.user_id, body?.sub].find(
    (id): id is string => typeof id === 'string' && id.length > 0
  );
  if (!agentInboxUserId) {
    throw new AuthError(401, 'Your Agent Inbox sign-in could not be read. Sign in again.');
  }

  const email = typeof body?.email === 'string' && body.email.trim() ? body.email.trim() : undefined;
  const firstName = personName(body?.given_name);
  const lastName = personName(body?.family_name);

  return {
    agentInboxUserId,
    ...(email ? { email } : {}),
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
  };
}

function personName(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const name = value.trim().slice(0, 128);

  return name.length > 0 ? name : undefined;
}

/**
 * Reads the account's key from the Novu API, opening the account first when this sign-in has none.
 * Those are the calls that go there directly: the Dashboard API answers to an account's key, which
 * does not exist until the account does.
 */
async function loadAccount(identity: Identity, env: Env): Promise<Account> {
  const secret = env.AGENT_INBOX_DASHBOARD_API_SECRET;
  const apiUrl = urlOf(env.AGENT_INBOX_API_URL);
  const novuApiUrl = urlOf(env.NOVU_API_URL);
  if (!secret || !apiUrl || !novuApiUrl) {
    throw new AuthError(503, 'This server is not connected to the Agent Inbox API.');
  }

  let secretKey = await readSecretKey(novuApiUrl, identity.agentInboxUserId, secret);
  if (!secretKey) {
    await ensureAccount(novuApiUrl, identity, secret);
    secretKey = await readSecretKey(novuApiUrl, identity.agentInboxUserId, secret);
  }

  if (!secretKey) {
    throw new AuthError(503, 'The Agent Inbox account could not be opened. Try again in a moment.');
  }

  return {
    agentInboxUserId: identity.agentInboxUserId,
    apiUrl,
    secretKey,
    ...(identity.email ? { email: identity.email } : {}),
  };
}

/**
 * Creates the backing Novu organization for this Clerk user, or returns the one that already exists.
 * The same call the dashboard makes on a first visit. It does not create an agent; `inbox_setup` does that.
 */
async function ensureAccount(novuApiUrl: string, identity: Identity, secret: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${novuApiUrl}/v1/human/accounts`, {
      method: 'POST',
      headers: {
        [AGENT_INBOX_DASHBOARD_SECRET_HEADER]: secret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        humanUserId: identity.agentInboxUserId,
        ...(identity.firstName ? { firstName: identity.firstName } : {}),
        ...(identity.lastName ? { lastName: identity.lastName } : {}),
      }),
      signal: AbortSignal.timeout(ACCOUNT_SETUP_TIMEOUT_MS),
    });
  } catch {
    throw new AuthError(503, 'Could not reach the Agent Inbox API. Try again in a moment.');
  }

  if (response.status === 409) {
    throw new AuthError(503, 'This Agent Inbox account is being set up. Try again in a moment.');
  }

  if (!response.ok) {
    throw new AuthError(503, 'The Agent Inbox API did not answer. Try again in a moment.');
  }
}

/** The account's key, or `null` when there is no account for this sign-in. */
async function readSecretKey(novuApiUrl: string, agentInboxUserId: string, secret: string): Promise<string | null> {
  let response: Response;
  try {
    response = await fetch(`${novuApiUrl}/v1/human/accounts/${encodeURIComponent(agentInboxUserId)}/secret-key`, {
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
