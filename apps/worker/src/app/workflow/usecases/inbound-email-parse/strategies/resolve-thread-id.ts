import { normalizeReferences } from '@novu/application-generic';
import { createHash } from 'crypto';

/*
 * ── Stateless thread-ID resolution ──────────────────────────────────────────
 *
 * RFC 2822 §3.6.4 mandates that the References header contains the full
 * ancestor chain from the thread root to the direct parent, in order:
 *
 *   References: <root@example.com> <msg-2@example.com> <msg-3@example.com>
 *
 * references[0] is always the root message-ID. Hashing it produces a stable,
 * deterministic thread-ID from any single email — fully stateless.
 *
 * When a message has no References and no In-Reply-To it is the thread root;
 * its own message-ID is hashed instead.
 */

function hashMessageId(messageId: string): string {
  return createHash('sha256').update(messageId).digest('hex');
}

export { normalizeReferences };

export function resolveThreadId(
  toAddress: string,
  messageId: string,
  inReplyTo: string | undefined,
  references: string | string[] | undefined
): string {
  const allRefs = normalizeReferences(references);

  // RFC 2822: references[0] is always the root message-ID of the thread.
  // Fall back to inReplyTo (single-reply without References), then to
  // the current messageId when this email starts a brand-new thread.
  const rootMessageId = allRefs[0] ?? inReplyTo?.trim() ?? messageId;

  const hash = hashMessageId(rootMessageId);

  return `nv-t=${toAddress}:nv-rmid=${hash}`;
}
