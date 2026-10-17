import { EmailProviderIdEnum, slugify } from '@novu/shared';
import { customAlphabet } from 'nanoid';

/**
 * Helpers for the cloud-only "agent default shared inbox" feature.
 *
 * Every agent created on Novu Cloud auto-provisions a NovuAgent email
 * integration with two routing fields stored in `credentials`:
 *
 *   - `emailSlugPrefix` — human-readable display prefix (editable by the user)
 *   - `inboxRoutingKey`  — opaque routing key (system-managed, globally unique
 *                          under a partial index on NovuAgent rows)
 *
 * The address shape is `{emailSlugPrefix}-{inboxRoutingKey}@<shared-domain>`.
 * Connect agents use `NOVU_AGENT_SHARED_INBOUND_DOMAIN`. Agent Inbox (Human)
 * agents use `NOVU_AGENT_INBOX_INBOUND_DOMAIN` when it is set, and the chosen
 * domain is pinned on the integration as `credentials.inboxDomain`. A row
 * without that pin keeps the Connect domain, so existing addresses do not move.
 * The inbound worker resolves the agent by looking up the inbox integration
 * whose `credentials.inboxRoutingKey` matches the trailing segment, then joining
 * through `AgentIntegration` — see
 * `apps/worker/src/app/workflow/usecases/inbound-email-parse/strategies/domain-route.strategy.ts`.
 *
 * On self-hosted deployments the feature is disabled and these helpers report
 * "not enabled"; callers must fall back to the existing per-tenant Domain +
 * DomainRoute flow.
 */

const SHARED_AGENT_DOMAIN_ENV = 'NOVU_AGENT_SHARED_INBOUND_DOMAIN';
const AGENT_INBOX_DOMAIN_ENV = 'NOVU_AGENT_INBOX_INBOUND_DOMAIN';

/**
 * Routing-key alphabet — lowercase letters + digits. Lowercase-only so the
 * inbound worker's `localPart.toLowerCase()` normalization never destroys the
 * key, and free of `i / l / 1 / o / 0` lookalike *avoidance* is not worth the
 * collision-domain shrink: the partial unique index is the authoritative
 * uniqueness check, and 36^8 ≈ 2.8 × 10¹² is plenty for retry-on-collision.
 */
const ROUTING_KEY_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const ROUTING_KEY_LENGTH = 8;
const ROUTING_KEY_REGEX = new RegExp(`^[${ROUTING_KEY_ALPHABET}]{${ROUTING_KEY_LENGTH}}$`);

const generateRoutingKeyNanoid = customAlphabet(ROUTING_KEY_ALPHABET, ROUTING_KEY_LENGTH);

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
 * Whether agent email is available for the deployment at all (inbound via
 * custom domains + outbound via a connected provider), independent of the
 * cloud-only zero-config shared inbox.
 *
 * The `(isSelfHosted || hasDomain)` clause is a deliberate short-circuit so this
 * gate is identical to `isAgentSharedInboxEnabled()` on every Cloud
 * configuration — including the degraded case where the shared domain env var
 * is missing/invalid — and only adds the self-hosted-enterprise case. Cloud
 * therefore has a provable zero behavioral delta:
 *
 *   - Cloud + domain set (normal)        -> true  (same as shared inbox gate)
 *   - Cloud + domain missing/invalid     -> false (same as shared inbox gate)
 *   - Self-hosted + enterprise           -> true  (new: uses custom domains)
 *   - Community (self-hosted or not)     -> false
 *
 * Self-hosted does not need the shared domain because inbound is wired through
 * a per-tenant verified Domain + DomainRoute(type=AGENT).
 */
export function isAgentEmailEnabled(): boolean {
  const isEnterprise = process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true';
  const isSelfHosted = process.env.IS_SELF_HOSTED === 'true';
  const hasDomain = !!getSharedAgentDomainOrNull();

  return isEnterprise && (isSelfHosted || hasDomain);
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

function readConfiguredDomain(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.toLowerCase();
  if (!SHARED_DOMAIN_REGEX.test(normalized)) {
    return null;
  }

  return normalized;
}

function getSharedAgentDomainOrNull(): string | null {
  return readConfiguredDomain(process.env[SHARED_AGENT_DOMAIN_ENV]);
}

/**
 * Agent Inbox (Human) shared domain, e.g. `agentinbox.md`.
 * Unset or invalid means Human agents fall back to the Connect domain.
 * This never gates `isAgentSharedInboxEnabled()` — the Connect domain does.
 */
export function getAgentInboxSharedDomainOrNull(): string | null {
  return readConfiguredDomain(process.env[AGENT_INBOX_DOMAIN_ENV]);
}

/**
 * Domain written onto a newly provisioned inbox integration.
 * Agent Email Inbox prefers the Human domain and falls back to the Connect
 * domain when that env var is missing. Every other provider stays on the
 * Connect domain.
 */
export function defaultInboxDomainForProvider(providerId: string): string {
  if (providerId === EmailProviderIdEnum.AgentEmailInbox) {
    return getAgentInboxSharedDomainOrNull() ?? getSharedAgentDomain();
  }

  return getSharedAgentDomain();
}

/**
 * Domain an existing inbox actually publishes and accepts mail on.
 * A valid stored pin wins. Anything else — missing, blank, or not a hostname —
 * stays on the Connect domain so rows created before the pin keep working.
 */
export function resolveAgentInboxDomain(credentials: { inboxDomain?: unknown } | null | undefined): string {
  const pinned = typeof credentials?.inboxDomain === 'string' ? readConfiguredDomain(credentials.inboxDomain) : null;
  if (pinned) {
    return pinned;
  }

  return getSharedAgentDomain();
}

/**
 * Every shared domain this deployment currently accepts inbound mail for.
 * Deduped, so a deployment that has not split the domains still matches once.
 */
export function getConfiguredSharedInboxDomains(): string[] {
  const domains = [getSharedAgentDomainOrNull(), getAgentInboxSharedDomainOrNull()].filter((domain): domain is string =>
    Boolean(domain)
  );

  return [...new Set(domains)];
}

/**
 * Generate a routing-key candidate. The caller is responsible for retrying on
 * collision against the partial unique index (`credentials.inboxRoutingKey` on
 * NovuAgent rows); 8 chars from a 36-char alphabet leaves ~2.8 × 10¹² values
 * so the first attempt practically always wins.
 */
export function generateAgentInboxRoutingKey(): string {
  return generateRoutingKeyNanoid();
}

/**
 * Routing-key validator. Lowercase alnum, fixed length. Used by the inbound
 * parser to reject mangled local-parts before issuing a DB lookup.
 */
export function isValidAgentInboxRoutingKey(key: string): boolean {
  return typeof key === 'string' && ROUTING_KEY_REGEX.test(key);
}

/**
 * Build the agent's shared-inbox address. Slug and routing key are joined by a
 * single dash; the trailing `inboxRoutingKey` is the routing key the inbound
 * worker uses to resolve the NovuAgent integration.
 */
export function buildAgentSharedInbox(emailSlugPrefix: string, inboxRoutingKey: string, domain?: string): string {
  if (!isValidAgentInboxRoutingKey(inboxRoutingKey)) {
    throw new Error(
      `Invalid inboxRoutingKey "${inboxRoutingKey}" — expected ${ROUTING_KEY_LENGTH} lowercase alnum chars.`
    );
  }

  const slug = sanitizeSlugForAddress(emailSlugPrefix);

  return `${slug}-${inboxRoutingKey}@${domain ?? getSharedAgentDomain()}`;
}

/**
 * Parse the local-part of an inbound email address into `{ slug, inboxRoutingKey }`.
 * The trailing fixed-length lowercase-alnum segment is taken as the routing key
 * (unambiguous even when the slug contains dashes).
 *
 * Returns `null` when the local-part doesn't follow the `{slug}-{routingKey}` shape.
 */
export function parseAgentSharedInboxLocalPart(localPart: string): {
  slug: string;
  inboxRoutingKey: string;
} | null {
  if (!localPart || localPart.length <= ROUTING_KEY_LENGTH + 1) {
    return null;
  }

  const inboxRoutingKey = localPart.slice(-ROUTING_KEY_LENGTH);
  if (!isValidAgentInboxRoutingKey(inboxRoutingKey)) {
    return null;
  }

  const separator = localPart.charAt(localPart.length - ROUTING_KEY_LENGTH - 1);
  if (separator !== '-') {
    return null;
  }

  const slug = localPart.slice(0, -(ROUTING_KEY_LENGTH + 1));
  if (!slug) {
    return null;
  }

  return { slug, inboxRoutingKey };
}

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

/**
 * Validation for user-supplied slug prefixes. Lowercase letters, digits, and
 * dashes; 1–32 chars; no leading/trailing dash.
 */
export function isValidAgentEmailSlugPrefix(slug: string): boolean {
  return typeof slug === 'string' && SLUG_REGEX.test(slug);
}

/**
 * Slug the shared inbox actually publishes. A valid stored prefix wins; otherwise
 * the address is `{slugify(identifier or name)}-{inboxRoutingKey}@<shared-domain>`.
 * Inbound routing must accept this same slug, including when a credential save
 * omitted `emailSlugPrefix`.
 */
export function resolvePublishedAgentEmailSlug(
  storedPrefix: string | null | undefined,
  agent: { identifier?: string | null; name?: string | null }
): string | undefined {
  if (storedPrefix && isValidAgentEmailSlugPrefix(storedPrefix)) {
    return storedPrefix;
  }

  const candidate = slugify(agent.identifier || agent.name || '')
    .slice(0, 32)
    .replace(/^-+/, '')
    .replace(/-+$/, '');

  if (!isValidAgentEmailSlugPrefix(candidate)) {
    return undefined;
  }

  return candidate;
}

/**
 * An agent can be linked to both inbox providers during the Human rollout.
 * Novu Email is the one the dashboard owns, so it wins; otherwise take
 * whichever row came back first.
 */
export function pickAgentInboxIntegration<T extends { providerId: string }>(integrations: T[]): T | undefined {
  return integrations.find((item) => item.providerId === EmailProviderIdEnum.NovuAgent) ?? integrations[0];
}

function sanitizeSlugForAddress(slug: string): string {
  if (!isValidAgentEmailSlugPrefix(slug)) {
    throw new Error(`Invalid emailSlugPrefix "${slug}" — must match ${SLUG_REGEX}.`);
  }

  return slug;
}
