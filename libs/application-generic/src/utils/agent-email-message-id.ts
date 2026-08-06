/**
 * Deterministic RFC 2822 Message-ID for agent-assigned workflow emails.
 *
 * Derived from `Message._id` so inbound replies can recover the origin via
 * `In-Reply-To` / `References`. `Message.identifier` is not used — for email it
 * holds the provider send id (delivery webhook join key).
 */

const SAFE_DOMAIN_RE = /^[a-z0-9.-]+$/i;
const FALLBACK_DOMAIN = 'novu.co';

/** `novu-` + 24-char hex ObjectId — distinct from adapter `randomUUID()` ids. */
const AGENT_MESSAGE_ID_RE = /^<?novu-([0-9a-f]{24})@[^<>@\s]+>?$/i;

function resolveDomain(fromAddress: string): string {
  const parts = fromAddress.split('@');
  const candidate = parts.length > 1 ? parts.at(-1)?.trim().toLowerCase() : undefined;

  return candidate && SAFE_DOMAIN_RE.test(candidate) ? candidate : FALLBACK_DOMAIN;
}

export function buildAgentEmailMessageId(messageId: string, fromAddress: string): string {
  return `<novu-${messageId}@${resolveDomain(fromAddress)}>`;
}

/** Returns the Novu `Message._id`, or null if the value was not minted by us. */
export function parseAgentEmailMessageId(value: string): string | null {
  const match = value.trim().match(AGENT_MESSAGE_ID_RE);

  return match ? match[1].toLowerCase() : null;
}
