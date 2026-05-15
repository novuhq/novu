/**
 * Helpers for the cloud-only "agent default shared inbox" feature.
 *
 * Every agent created on Novu Cloud is auto-assigned an address on the shared
 * inbound domain (e.g. `agentconnect.sh`). The address shape is
 * `{emailSlugPrefix}-{agentId}@<shared-domain>` where the trailing 24-char
 * MongoId is the routing key and the slug prefix is a human-readable display
 * value editable by the user.
 *
 * On self-hosted deployments the feature is disabled and these helpers report
 * "not enabled"; callers must fall back to the existing per-tenant Domain +
 * DomainRoute flow.
 */

const SHARED_AGENT_DOMAIN_ENV = 'NOVU_AGENT_SHARED_INBOUND_DOMAIN';

const MONGO_ID_LENGTH = 24;

const MONGO_ID_REGEX = /^[a-f0-9]{24}$/;

/**
 * Cloud-only feature gate. Mirrors the gating used elsewhere in the codebase
 * (e.g. `apps/api/src/app/layouts-v2/usecases/upsert-layout/upsert-layout.usecase.ts`).
 */
export function isAgentSharedInboxEnabled(): boolean {
  const isEnterprise = process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true';
  const isSelfHosted = process.env.IS_SELF_HOSTED === 'true';
  const hasDomain = !!getSharedAgentDomainOrNull();

  return isEnterprise && !isSelfHosted && hasDomain;
}

/**
 * Returns the configured shared inbound domain (e.g. `agentconnect.sh`).
 * Throws if the env var is not set — callers that may run in a degraded
 * configuration should gate on `isAgentSharedInboxEnabled()` first.
 */
export function getSharedAgentDomain(): string {
  const domain = getSharedAgentDomainOrNull();
  if (!domain) {
    throw new Error(`${SHARED_AGENT_DOMAIN_ENV} is not configured.`);
  }

  return domain;
}

/**
 * RFC-1123-ish hostname: total length 1–253, labels 1–63 chars of
 * [a-z0-9-] with no leading/trailing dash, at least one dot. Underscores,
 * spaces, `@`, and other invalid hostname characters are rejected so a
 * misconfigured env var (e.g. `bad@domain` or `foo bar`) disables the
 * feature instead of producing un-deliverable inbox addresses.
 */
const SHARED_DOMAIN_REGEX = /^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/i;

function getSharedAgentDomainOrNull(): string | null {
  const raw = process.env[SHARED_AGENT_DOMAIN_ENV];
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const normalized = trimmed.toLowerCase();
  if (!SHARED_DOMAIN_REGEX.test(normalized)) {
    return null;
  }

  return normalized;
}

/**
 * Build the agent's shared-inbox address. Slug and id are joined by a single
 * dash; the trailing 24-char `_id` is the routing key.
 */
export function buildAgentSharedInbox(emailSlugPrefix: string, agentId: string): string {
  if (!MONGO_ID_REGEX.test(agentId)) {
    throw new Error(`Invalid agent id "${agentId}" — expected a 24-character hex MongoId.`);
  }

  const slug = sanitizeSlugForAddress(emailSlugPrefix);

  return `${slug}-${agentId}@${getSharedAgentDomain()}`;
}

/**
 * Parse the local-part of an inbound email address into `{ slug, agentId }`.
 * The trailing 24 hex chars are taken as the agent id (fixed length →
 * unambiguous even when the slug contains dashes).
 *
 * Returns `null` when the local-part doesn't follow the `{slug}-{24hex}` shape.
 */
export function parseAgentSharedInboxLocalPart(localPart: string): {
  slug: string;
  agentId: string;
} | null {
  if (!localPart || localPart.length <= MONGO_ID_LENGTH + 1) {
    return null;
  }

  const agentId = localPart.slice(-MONGO_ID_LENGTH).toLowerCase();
  if (!MONGO_ID_REGEX.test(agentId)) {
    return null;
  }

  const separator = localPart.charAt(localPart.length - MONGO_ID_LENGTH - 1);
  if (separator !== '-') {
    return null;
  }

  const slug = localPart.slice(0, -(MONGO_ID_LENGTH + 1));
  if (!slug) {
    return null;
  }

  return { slug, agentId };
}

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

/**
 * Validation for user-supplied slug prefixes. Lowercase letters, digits, and
 * dashes; 1–32 chars; no leading/trailing dash.
 */
export function isValidAgentEmailSlugPrefix(slug: string): boolean {
  return typeof slug === 'string' && SLUG_REGEX.test(slug);
}

function sanitizeSlugForAddress(slug: string): string {
  if (!isValidAgentEmailSlugPrefix(slug)) {
    throw new Error(`Invalid emailSlugPrefix "${slug}" — must match ${SLUG_REGEX}.`);
  }

  return slug;
}
