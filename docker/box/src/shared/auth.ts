// Who may call /__box/* (thin.ts, and the host's /__box/boxes in boxes.ts): a GitHub user with push access to
// novuhq/novu, by their token, or the Novu Box workflow (.github/workflows/novu-box.yml) in novuhq/novu, by its
// GitHub Actions OIDC token, so CI needs no stored secret. Plain TypeScript (WebCrypto, fetch), no Effect: the thin
// Worker bundles it and the host uploads that for every box.

import { bearer, OIDC_AUDIENCE } from './names.ts';

const ISSUER = 'https://token.actions.githubusercontent.com';
const REPOSITORY = 'novuhq/novu';
const WORKFLOW = `${REPOSITORY}/.github/workflows/novu-box.yml@`;

export interface OidcClaims {
  readonly iss: string;
  readonly aud: string | ReadonlyArray<string>;
  readonly exp: number;
  readonly nbf?: number;
  readonly repository: string;
  readonly workflow_ref?: string;
  readonly [claim: string]: unknown;
}

export async function authorize(request: Request): Promise<boolean> {
  const token = bearer(request);
  if (!token) return false;

  return isOidc(token) ? Boolean(await verifyOidc(token)) : canPush(token);
}

export function isOidc(token: string | undefined): boolean {
  return /^eyJ[\w-]*\.[\w-]+\.[\w-]+$/.test(token ?? '');
}

// Tokens checked in the last 5 minutes, by SHA-256; the token itself is never stored.
const pushers = new Map<string, number>();

async function canPush(token: string): Promise<boolean> {
  const key = await sha256(token);
  if (Date.now() - (pushers.get(key) ?? 0) < 5 * 60 * 1000) return true;
  const response = await fetch(`https://api.github.com/repos/${REPOSITORY}`, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'novu-box' },
  });
  if (!response.ok || !((await response.json()) as { permissions?: { push?: boolean } }).permissions?.push)
    return false;
  pushers.set(key, Date.now());

  return true;
}

// The claims of a GitHub Actions OIDC token from the Novu Box workflow in novuhq/novu, or null: RS256 against
// GitHub's published keys, then issuer, audience, time and workflow. A fork's pull_request run gets no such token.
export async function verifyOidc(token: string): Promise<OidcClaims | null> {
  try {
    const [header = '', payload = '', signature = ''] = token.split('.');
    const { alg, kid } = JSON.parse(text(header)) as { alg?: string; kid?: string };
    const jwk = alg === 'RS256' && kid ? await githubKey(kid) : undefined;
    if (!jwk) return null;
    const key = await crypto.subtle.importKey(
      'jwk',
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const signed = new TextEncoder().encode(`${header}.${payload}`);
    if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, bytes(signature), signed))) return null;
    const claims = JSON.parse(text(payload)) as OidcClaims;
    const now = Date.now() / 1000;
    const valid =
      claims.iss === ISSUER &&
      ([] as Array<string>).concat(claims.aud).includes(OIDC_AUDIENCE) &&
      claims.exp > now &&
      (claims.nbf ?? 0) <= now + 60 &&
      claims.repository === REPOSITORY &&
      Boolean(claims.workflow_ref?.startsWith(WORKFLOW));

    return valid ? claims : null;
  } catch {
    return null;
  }
}

interface Jwk {
  readonly kid: string;
  readonly kty: string;
  readonly n: string;
  readonly e: string;
}

// GitHub's keys, kept for an hour; an unknown key id fetches them again, at most once a minute.
let keys: { list: ReadonlyArray<Jwk>; at: number } = { list: [], at: 0 };

async function githubKey(kid: string): Promise<Jwk | undefined> {
  const age = Date.now() - keys.at;
  if (age > 60 * 60 * 1000 || (age > 60 * 1000 && !keys.list.some((key) => key.kid === kid))) {
    const response = await fetch(`${ISSUER}/.well-known/jwks`, { headers: { 'User-Agent': 'novu-box' } });
    if (response.ok) keys = { list: ((await response.json()) as { keys: Array<Jwk> }).keys, at: Date.now() };
  }

  return keys.list.find((key) => key.kid === kid);
}

function bytes(base64url: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(base64url.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0));
}

function text(base64url: string): string {
  return new TextDecoder().decode(bytes(base64url));
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));

  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
