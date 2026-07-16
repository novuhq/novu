/**
 * Controls whether an agent accepts inbound messages from senders that are not
 * yet linked to a Novu subscriber.
 *
 * - `restricted` (default): unknown senders are rejected with the "couldn't
 *   verify your email" reply and no LLM dispatch fires.
 * - `open`: unknown email senders are auto-provisioned as lightweight
 *   subscribers (marked with agent-platform provenance) so the agent can reply.
 *   Abuse mitigation is the customer's responsibility in this mode.
 */
export enum AgentSubscriberAccessEnum {
  OPEN = 'open',
  RESTRICTED = 'restricted',
}

/**
 * Provenance keys stamped on every auto-provisioned `Subscriber.data` blob.
 * Shared across the API resolver/adoption services, the sparse index in
 * `subscriber.schema.ts`, and the dashboard's "Auto-created" badge so they can
 * never drift. Flat scalar keys because `SubscriberCustomData` is a
 * `Record<string, scalar>`.
 */
export const AGENT_PROVISION_DATA_KEYS = {
  source: '__novu_source',
  platform: '__novu_platform',
  platformUserId: '__novu_platformUserId',
  agentIdentifier: '__novu_agentIdentifier',
  firstSeenAt: '__novu_firstSeenAt',
} as const;

/**
 * Sentinel value written to `Subscriber.data[AGENT_PROVISION_DATA_KEYS.source]`
 * for every subscriber auto-created from an inbound platform message. The
 * sparse index in `subscriber.schema.ts` keys off this marker — never mutate
 * without coordinating the index.
 */
export const AGENT_PLATFORM_PROVISION_SOURCE = 'agent-platform-provision' as const;

/**
 * Reserved `conversation.metadata` keys written by the framework auth gate when it
 * shows an unlinked author the sign-in CTA card, and read server-side to update
 * that card the moment the author links their account:
 * - `authCardMessageId`: platform message id of the posted CTA card (which message to edit).
 * - `authLinkedCard`: the fully-resolved "account linked" confirmation card to swap in.
 *
 * IMPORTANT: `@novu/framework` does not depend on `@novu/shared`, so it declares the
 * same literals in `packages/framework/src/resources/agent/auth-gate.ts`. These two
 * definitions MUST stay in sync.
 */
export const AGENT_AUTH_METADATA_KEYS = {
  authCardMessageId: '__novu:authCardMessageId',
  authLinkedCard: '__novu:authLinkedCard',
} as const;

export interface NovuEmailAttachment {
  filename: string;
  contentType: string;
  /** File size in bytes. */
  size?: number;
  /**
   * Base64-encoded file bytes. Present when the inbound mail server has the
   * file content available inline. Mutually exclusive with `url` — when both
   * are provided, `contentBase64` takes precedence during hydration.
   */
  contentBase64?: string;
  /**
   * Set to true when the attachment was over the per-attachment or aggregate
   * size cap and its bytes were not included in the payload.
   */
  truncated?: boolean;
  /** Presigned GET URL to download the attachment from S3. */
  url?: string;
}

export interface EmailWebhookDomainContext {
  id: string;
  name: string;
  data?: Record<string, string>;
}

export interface EmailWebhookRouteContext {
  address: string;
  data?: Record<string, string>;
}

export interface EmailWebhookPayload {
  messageId: string;
  inReplyTo?: string;
  references?: string;
  from: { address: string; name?: string };
  to: { address: string; name?: string }[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: NovuEmailAttachment[];
  date: string;
  headers?: Record<string, string>;
  domain?: EmailWebhookDomainContext;
  route?: EmailWebhookRouteContext;
  /**
   * Sender-authentication verdicts computed by the inbound-mail service
   * (`'pass'` / `'failed'`). Because the `From` header is trivially spoofable,
   * consumers that resolve a sender identity from it MUST treat the address as
   * untrusted unless both verdicts are `'pass'`. Optional for backward
   * compatibility with payloads produced before this field existed — a missing
   * verdict must be treated as unverified (fail closed).
   */
  dkim?: string;
  spf?: string;
}
