/**
 * Continuation-token codec.
 *
 * Eve identifies a durable session by its `continuationToken` (see
 * `ChannelSessionOps` in `eve/channels`). We bind that 1:1 to the Novu
 * conversation by encoding the conversation reference into the token, so every
 * resume targets the correct Novu thread while a single Novu subscriber can
 * hold many concurrent cross-platform conversations.
 *
 * The encoding is an opaque base64url JSON blob — callers must treat the token
 * as opaque and only round-trip it through {@link encodeContinuationToken} /
 * {@link decodeContinuationToken}.
 */

/** Reference to a single Novu conversation on a specific platform integration. */
export interface NovuConversationRef {
  readonly conversationId: string;
  readonly integrationIdentifier: string;
  /** Platform slug (e.g. `slack`, `teams`), when the bridge request carries it. */
  readonly platform?: string;
}

interface EncodedShape {
  readonly c: string;
  readonly i: string;
  readonly p?: string;
}

/** Encode a conversation reference into an opaque continuation token. */
export function encodeContinuationToken(ref: NovuConversationRef): string {
  const payload: EncodedShape = { c: ref.conversationId, i: ref.integrationIdentifier };
  const withPlatform = ref.platform ? { ...payload, p: ref.platform } : payload;
  return Buffer.from(JSON.stringify(withPlatform), 'utf8').toString('base64url');
}

/**
 * Decode a continuation token back into a conversation reference. Returns
 * `null` for an absent or undecodable token so callers can fall back to
 * starting a fresh session instead of throwing.
 */
export function decodeContinuationToken(token: string | undefined | null): NovuConversationRef | null {
  if (!token) return null;
  try {
    const json = Buffer.from(token, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as Partial<EncodedShape> | null;
    if (!parsed || typeof parsed.c !== 'string' || typeof parsed.i !== 'string') return null;
    return {
      conversationId: parsed.c,
      integrationIdentifier: parsed.i,
      platform: typeof parsed.p === 'string' ? parsed.p : undefined,
    };
  } catch {
    return null;
  }
}
