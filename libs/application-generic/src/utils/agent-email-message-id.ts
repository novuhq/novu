/**
 * Deterministic RFC 2822 Message-ID for agent-assigned workflow emails.
 *
 * When a workflow step is assigned to an agent, the outbound email carries a
 * `Message-ID` derived from the Novu `Message._id`. A subscriber replying to
 * that email echoes the value back in `In-Reply-To` / `References`, which lets
 * the agent inbound handler recover the originating `Message` and hydrate the
 * workflow origin into the conversation — the email counterpart of the Slack
 * `{channel}:{ts}` correlation.
 *
 * `Message.identifier` is deliberately *not* used for this: for email it holds
 * the provider send id and is the join key for delivery/open/bounce webhooks
 * (see `process-inbound-webhook.usecase.ts`).
 */

const SAFE_DOMAIN_RE = /^[a-z0-9.-]+$/i;
const FALLBACK_DOMAIN = 'novu.co';

/**
 * `novu-` prefix + a 24-char hex ObjectId. Strict by construction so it can
 * never collide with the email adapter's `randomUUID()` Message-IDs or with a
 * third-party client's own ids.
 */
const AGENT_MESSAGE_ID_RE = /^<?novu-([0-9a-f]{24})@[^<>@\s]+>?$/i;

function resolveDomain(fromAddress: string): string {
  const parts = fromAddress.split('@');
  // A bare token with no `@` is not an address; its whole value would otherwise
  // pass the domain check and end up in the Message-ID.
  const candidate = parts.length > 1 ? parts.at(-1)?.trim().toLowerCase() : undefined;

  return candidate && SAFE_DOMAIN_RE.test(candidate) ? candidate : FALLBACK_DOMAIN;
}

/**
 * Build the angle-bracketed Message-ID for a message sent on behalf of an agent.
 * The domain is taken from the sending address so the id stays plausible to
 * receiving MTAs; anything unusable falls back to `novu.co`.
 */
export function buildAgentEmailMessageId(messageId: string, fromAddress: string): string {
  return `<novu-${messageId}@${resolveDomain(fromAddress)}>`;
}

/**
 * Recover the Novu `Message._id` from a Message-ID that we minted, or `null`
 * when the value was not produced by {@link buildAgentEmailMessageId}.
 *
 * Returning an id is *not* an authorization decision — callers must still scope
 * the lookup to the environment, agent, and subscriber.
 */
export function parseAgentEmailMessageId(value: string): string | null {
  const match = value.trim().match(AGENT_MESSAGE_ID_RE);

  return match ? match[1].toLowerCase() : null;
}
