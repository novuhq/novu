import { describe, expect, it } from 'vitest';
import {
  buildAgentReplyToAddress,
  parseAgentReplyToken,
  splitAgentReplyLocalPart,
  stripAgentReplyToken,
} from './agent-email-reply-token';

const MESSAGE_ID = '65f1a2b3c4d5e6f7a8b9c0d1';

describe('agent-email-reply-token helpers', () => {
  describe('buildAgentReplyToAddress', () => {
    it('appends a +nv base36 token to the local-part', () => {
      const built = buildAgentReplyToAddress('support-ab12cd34@agentconnect.sh', MESSAGE_ID);

      expect(built).toMatch(/^support-ab12cd34\+nv[0-9a-z]+@agentconnect\.sh$/);
      expect(parseAgentReplyToken(built.split('@')[0]!)).toBe(MESSAGE_ID);
    });

    it('round-trips through parseAgentReplyToken', () => {
      const built = buildAgentReplyToAddress('agent@example.com', MESSAGE_ID);
      const localPart = built.split('@')[0]!;

      expect(parseAgentReplyToken(localPart)).toBe(MESSAGE_ID);
    });

    it('returns the base address for an invalid ObjectId', () => {
      expect(buildAgentReplyToAddress('agent@example.com', 'not-an-object-id')).toBe('agent@example.com');
    });

    it('returns the base address when the tokenized local-part would exceed 64 chars', () => {
      const longSlug = `${'a'.repeat(32)}-abcdefgh`;
      const base = `${longSlug}@agentconnect.sh`;

      expect(longSlug.length).toBe(41);
      // 41 + "+nv" (3) + 19 = 63 — still fits
      expect(buildAgentReplyToAddress(base, MESSAGE_ID)).toMatch(/^\S+\+nv[0-9a-z]+@agentconnect\.sh$/);

      const tooLongLocal = 'b'.repeat(43);
      const tooLongBase = `${tooLongLocal}@agentconnect.sh`;
      // 43 + 3 + 19 = 65 — overflows, return untokenized
      expect(buildAgentReplyToAddress(tooLongBase, MESSAGE_ID)).toBe(tooLongBase);
    });
  });

  describe('parseAgentReplyToken', () => {
    it('decodes a lowercase token', () => {
      const localPart = buildAgentReplyToAddress('x@y.com', MESSAGE_ID).split('@')[0]!;

      expect(parseAgentReplyToken(localPart)).toBe(MESSAGE_ID);
    });

    it('is case-insensitive for the marker and payload', () => {
      const localPart = buildAgentReplyToAddress('x@y.com', MESSAGE_ID).split('@')[0]!;
      const mixedCase = localPart.replace(/\+nv/, '+NV');

      expect(parseAgentReplyToken(mixedCase)).toBe(MESSAGE_ID);
    });

    it('rejects non-Novu plus tags', () => {
      expect(parseAgentReplyToken('sales+vip')).toBeNull();
      expect(parseAgentReplyToken('support+marketing')).toBeNull();
      expect(parseAgentReplyToken('support+m3248x97p8eqnnnxqspd')).toBeNull();
      expect(parseAgentReplyToken('support')).toBeNull();
    });
  });

  describe('stripAgentReplyToken', () => {
    it('removes a Novu token from a full address', () => {
      const built = buildAgentReplyToAddress('support-ab12cd34@agentconnect.sh', MESSAGE_ID);

      expect(stripAgentReplyToken(built)).toBe('support-ab12cd34@agentconnect.sh');
    });

    it('leaves non-Novu plus tags intact', () => {
      expect(stripAgentReplyToken('sales+vip@acme.com')).toBe('sales+vip@acme.com');
    });
  });

  describe('splitAgentReplyLocalPart', () => {
    it('returns the stripped local-part and decoded origin token', () => {
      const localPart = buildAgentReplyToAddress('support@acme.com', MESSAGE_ID).split('@')[0]!;
      const split = splitAgentReplyLocalPart(localPart);

      expect(split).toEqual({
        strippedLocalPart: 'support',
        originToken: MESSAGE_ID,
      });
    });

    it('returns a null token when no Novu tag is present', () => {
      expect(splitAgentReplyLocalPart('sales+vip')).toEqual({
        strippedLocalPart: 'sales+vip',
        originToken: null,
      });
    });
  });
});
