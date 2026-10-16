// Who may call /__box/* (thin.js, and the host's /__box/boxes in boxes.js): a GitHub user with push access to
// novuhq/novu, by their token, or the Novu Box workflow (.github/workflows/novu-box.yml) in novuhq/novu, by its
// GitHub Actions OIDC token, so CI needs no stored secret. Imports only shared.mjs, so the host can upload it with
// thin.js for a box's Worker.

import { bearer } from './shared.mjs';

const ISSUER = 'https://token.actions.githubusercontent.com';
export const OIDC_AUDIENCE = 'novu-box';
const REPOSITORY = 'novuhq/novu';
const WORKFLOW = `${REPOSITORY}/.github/workflows/novu-box.yml@`;

export async function authorize(request) {
  const token = bearer(request);
  if (!token) return false;

  return isOidc(token) ? Boolean(await verifyOidc(token)) : canPush(token);
}

export function isOidc(token) {
  return /^eyJ[\w-]*\.[\w-]+\.[\w-]+$/.test(token ?? '');
}

// Tokens checked in the last 5 minutes, by SHA-256; the token itself is never stored.
const pushers = new Map();

async function canPush(token) {
  const key = await sha256(token);
  if (Date.now() - (pushers.get(key) ?? 0) < 5 * 60 * 1000) return true;
  const response = await fetch(`https://api.github.com/repos/${REPOSITORY}`, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'novu-box' },
  });
  if (!response.ok || !(await response.json()).permissions?.push) return false;
  pushers.set(key, Date.now());

  return true;
}

// The claims of a GitHub Actions OIDC token from the Novu Box workflow in novuhq/novu, or null: RS256 against
// GitHub's published keys, then issuer, audience, time and workflow. A fork's pull_request run gets no such token.
export async function verifyOidc(token) {
  try {
    const [header, payload, signature] = token.split('.');
    const { alg, kid } = JSON.parse(text(header));
    const jwk = alg === 'RS256' && (await githubKey(kid));
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
    const claims = JSON.parse(text(payload));
    const now = Date.now() / 1000;
    const valid =
      claims.iss === ISSUER &&
      [].concat(claims.aud).includes(OIDC_AUDIENCE) &&
      claims.exp > now &&
      (claims.nbf ?? 0) <= now + 60 &&
      claims.repository === REPOSITORY &&
      claims.workflow_ref?.startsWith(WORKFLOW);

    return valid ? claims : null;
  } catch {
    return null;
  }
}

// GitHub's keys, kept for an hour; an unknown key id fetches them again, at most once a minute.
let keys = { list: [], at: 0 };

async function githubKey(kid) {
  const age = Date.now() - keys.at;
  if (age > 60 * 60 * 1000 || (age > 60 * 1000 && !keys.list.some((key) => key.kid === kid))) {
    const response = await fetch(`${ISSUER}/.well-known/jwks`, { headers: { 'User-Agent': 'novu-box' } });
    if (response.ok) keys = { list: (await response.json()).keys, at: Date.now() };
  }

  return keys.list.find((key) => key.kid === kid);
}

function bytes(base64url) {
  return Uint8Array.from(atob(base64url.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0));
}

function text(base64url) {
  return new TextDecoder().decode(bytes(base64url));
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));

  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
