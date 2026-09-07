import { describe, expect, it } from 'vitest';
import {
  assertSafeSmtpOutboundTarget,
  assertSafeSmtpOutboundTargetSync,
  resolveSafeSmtpPinnedTarget,
  SsrfBlockedError,
} from './validate-smtp-outbound-target';

describe('validate-smtp-outbound-target', () => {
  const tlsEnabled = { secure: true, requireTls: false, ignoreTls: false };

  describe('assertSafeSmtpOutboundTargetSync', () => {
    it('rejects private IP hosts', () => {
      expect(() => assertSafeSmtpOutboundTargetSync('127.0.0.1', 587, tlsEnabled)).toThrow(SsrfBlockedError);
    });

    it('rejects localhost', () => {
      expect(() => assertSafeSmtpOutboundTargetSync('localhost', 587, tlsEnabled)).toThrow(SsrfBlockedError);
    });

    it('rejects hostnames with URL injection characters', () => {
      expect(() => assertSafeSmtpOutboundTargetSync('evil.com#@sinch.com', 587, tlsEnabled)).toThrow(SsrfBlockedError);
      expect(() => assertSafeSmtpOutboundTargetSync('evil.com/internal', 587, tlsEnabled)).toThrow(SsrfBlockedError);
    });

    it('allows non-TLS SMTP configurations', () => {
      expect(() =>
        assertSafeSmtpOutboundTargetSync('smtp.example.com', 25, {
          secure: false,
          requireTls: false,
        })
      ).not.toThrow();
    });
  });

  describe('assertSafeSmtpOutboundTarget', () => {
    it('rejects hosts that resolve to private addresses', async () => {
      await expect(assertSafeSmtpOutboundTarget('ssrf-link-local-test.invalid', 587, tlsEnabled)).rejects.toThrow(
        SsrfBlockedError
      );
    });
  });

  describe('resolveSafeSmtpPinnedTarget', () => {
    it('returns a pinned public address for literal IPs', async () => {
      const pinned = await resolveSafeSmtpPinnedTarget('8.8.8.8', 587, tlsEnabled);

      expect(pinned).toEqual({
        hostname: '8.8.8.8',
        address: '8.8.8.8',
        port: 587,
      });
    });
  });
});
