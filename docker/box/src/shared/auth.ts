import { bearer, OIDC_AUDIENCE } from './names.ts';

const ISSUER = 'https://token.actions.githubusercontent.com';
const REPOSITORY = 'novuhq/novu';
// novu-box.yml is the single workflow these replaced; a PR branch from before the split still runs it.
const WORKFLOWS = ['novu-box-pr.yml', 'novu-box-base.yml', 'novu-box-nightly.yml', 'novu-box.yml'].map(
  (file) => `${REPOSITORY}/.github/workflows/${file}@`
);

export async function authorize(request: Request): Promise<boolean> {
  const token = bearer(request);
  if (!token) return false;

  return isOidc(token) ? verifyOidc(token) : canPush(token);
}

export function isOidc(token: string | undefined): boolean {
  return /^eyJ[\w-]*\.[\w-]+\.[\w-]+$/.test(token ?? '');
}

const pushers = new Map<string, number>();

async function canPush(token: string): Promise<boolean> {
  const key = await sha256(token);
  if (Date.now() - (pushers.get(key) ?? 0) < 5 * 60 * 1000) return true;
  const response = await fetch(`https://api.github.com/repos/${REPOSITORY}`, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'novu-box' },
  });
  const repo = response.ok ? json(await response.text()) : {};
  if (fieldsOf(repo.permissions).push !== true) return false;
  pushers.set(key, Date.now());

  return true;
}

// Whether this is a GitHub Actions OIDC token from the Novu Box workflow in novuhq/novu: RS256 against GitHub's
// published keys, then issuer, audience, time and workflow. A fork's pull_request run gets no such token.
async function verifyOidc(token: string): Promise<boolean> {
  try {
    const [header = '', payload = '', signature = ''] = token.split('.');
    const { alg, kid } = json(text(header));
    const jwk = alg === 'RS256' && typeof kid === 'string' ? await githubKey(kid) : undefined;
    if (!jwk) return false;
    const key = await crypto.subtle.importKey(
      'jwk',
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const signed = new TextEncoder().encode(`${header}.${payload}`);
    if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, bytes(signature), signed))) return false;
    const claims = json(text(payload));
    const now = Date.now() / 1000;
    const workflowRef = claims.workflow_ref;

    return (
      claims.iss === ISSUER &&
      [claims.aud].flat().includes(OIDC_AUDIENCE) &&
      typeof claims.exp === 'number' &&
      claims.exp > now &&
      (typeof claims.nbf === 'number' ? claims.nbf : 0) <= now + 60 &&
      claims.repository === REPOSITORY &&
      typeof workflowRef === 'string' &&
      WORKFLOWS.some((workflow) => workflowRef.startsWith(workflow))
    );
  } catch {
    return false;
  }
}

interface Jwk {
  readonly kid: string;
  readonly kty: string;
  readonly n: string;
  readonly e: string;
}

let keys: { list: ReadonlyArray<Jwk>; at: number } = { list: [], at: 0 };

async function githubKey(kid: string): Promise<Jwk | undefined> {
  const age = Date.now() - keys.at;
  if (age > 60 * 60 * 1000 || (age > 60 * 1000 && !keys.list.some((key) => key.kid === kid))) {
    const response = await fetch(`${ISSUER}/.well-known/jwks`, { headers: { 'User-Agent': 'novu-box' } });
    const body = response.ok ? json(await response.text()) : {};
    if (Array.isArray(body.keys))
      keys = { list: body.keys.flatMap((key: unknown) => jwkOf(key) ?? []), at: Date.now() };
  }

  return keys.list.find((key) => key.kid === kid);
}

function jwkOf(value: unknown): Jwk | null {
  const { kid, kty, n, e } = fieldsOf(value);

  return typeof kid === 'string' && typeof kty === 'string' && typeof n === 'string' && typeof e === 'string'
    ? { kid, kty, n, e }
    : null;
}

function fieldsOf(value: unknown): Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null ? Object.fromEntries(Object.entries(value)) : {};
}

function json(text: string): Readonly<Record<string, unknown>> {
  return fieldsOf(JSON.parse(text));
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
