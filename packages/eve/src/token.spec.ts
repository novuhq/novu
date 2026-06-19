import { describe, expect, it } from 'vitest';
import { decodeContinuationToken, encodeContinuationToken, type NovuConversationRef } from './token.js';

describe('continuation-token codec', () => {
  it('round-trips a full conversation reference', () => {
    const ref: NovuConversationRef = {
      conversationId: 'conv_123',
      integrationIdentifier: 'slack-prod',
      platform: 'slack',
    };
    expect(decodeContinuationToken(encodeContinuationToken(ref))).toEqual(ref);
  });

  it('round-trips without a platform (omits the field rather than setting undefined awkwardly)', () => {
    const ref: NovuConversationRef = { conversationId: 'c', integrationIdentifier: 'i' };
    const decoded = decodeContinuationToken(encodeContinuationToken(ref));
    expect(decoded).toEqual({ conversationId: 'c', integrationIdentifier: 'i', platform: undefined });
  });

  it('produces an opaque token that is not the raw ids', () => {
    const token = encodeContinuationToken({ conversationId: 'conv_123', integrationIdentifier: 'slack' });
    expect(token).not.toContain('conv_123');
  });

  it.each([undefined, null, '', 'not-base64url-$$$', Buffer.from('{"x":1}').toString('base64url')])(
    'returns null for absent/undecodable token: %s',
    (bad) => {
      expect(decodeContinuationToken(bad as string | null | undefined)).toBeNull();
    },
  );
});
