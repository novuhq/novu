// The inlined copy lives outside this package's rootDir. Compute the path at
// runtime so the TypeScript build does not traverse into libs/application-generic
// and emit stray artifacts there. Vitest runs in Node and resolves the path
// against the spec's __dirname.
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SsrfBlockedError as SharedSsrfBlockedError, isPrivateIp as sharedIsPrivateIp } from './ssrf-url-validation';

const inlinedPath = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'libs',
  'application-generic',
  'src',
  'utils',
  'ssrf-url-validation.ts'
);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const inlined = require(inlinedPath) as {
  isPrivateIp: (ip: string) => boolean;
  SsrfBlockedError: new (
    reason: string,
    message: string,
    extra?: { hostname?: string; resolvedAddress?: string }
  ) => Error & {
    reason: string;
    hostname?: string;
    resolvedAddress?: string;
  };
};
const inlinedIsPrivateIp = inlined.isPrivateIp;
const InlinedSsrfBlockedError = inlined.SsrfBlockedError;

/**
 * libs/application-generic carries an inlined copy of the SSRF primitives and
 * the safe outbound HTTP runner because its CommonJS module resolution cannot
 * honour `@novu/shared`'s subpath exports. The two implementations MUST stay
 * in lockstep — any divergence is a security regression rather than a
 * behavioural one.
 *
 * This suite asserts the two copies agree on every observable surface that a
 * caller can rely on. Drop or update the cases as primitives evolve, but
 * never delete the suite without removing the duplication.
 */
describe('safe outbound HTTP — shared vs application-generic drift check', () => {
  it('isPrivateIp agrees on every documented IP class', () => {
    const cases = [
      // Loopback & unspecified
      '0.0.0.0',
      '127.0.0.1',
      '127.255.255.254',
      // RFC1918
      '10.0.0.1',
      '10.255.255.254',
      '172.16.0.1',
      '172.31.255.254',
      '192.168.1.1',
      // Link-local v4 / metadata
      '169.254.169.254',
      // RFC6598 shared address space (100.64.0.0/10)
      '100.64.0.1',
      '100.100.100.200',
      '100.127.255.255',
      // Public IPv4
      '1.1.1.1',
      '8.8.8.8',
      '203.0.113.1',
      // IPv6 loopback / link-local / ULA
      '::1',
      'fe80::1',
      'fe80:abcd::1',
      'fc00::1',
      'fdff::1',
      // IPv4-mapped IPv6 of private addresses
      '::ffff:127.0.0.1',
      '::ffff:10.0.0.1',
      '::ffff:192.168.1.1',
      '::ffff:169.254.1.1',
      '::ffff:100.100.100.200',
      // Public IPv6
      '2001:4860:4860::8888',
    ];

    for (const ip of cases) {
      expect(inlinedIsPrivateIp(ip), `disagree on ${ip}`).toBe(sharedIsPrivateIp(ip));
    }
  });

  it('SsrfBlockedError shape and reason vocabulary agree', () => {
    const reasons = [
      'INVALID_URL',
      'UNSUPPORTED_SCHEME',
      'CREDENTIALS_IN_URL',
      'BLOCKED_HOSTNAME',
      'DNS_LOOKUP_FAILED',
      'PRIVATE_IP',
      'CROSS_ORIGIN_METHOD_PRESERVING_REDIRECT',
    ] as const;

    for (const reason of reasons) {
      const sharedErr = new SharedSsrfBlockedError(reason, 'msg', { hostname: 'h', resolvedAddress: 'a' });
      const inlinedErr = new InlinedSsrfBlockedError(reason, 'msg', { hostname: 'h', resolvedAddress: 'a' });

      expect(inlinedErr.reason).toBe(sharedErr.reason);
      expect(inlinedErr.name).toBe(sharedErr.name);
      expect(inlinedErr.message).toBe(sharedErr.message);
      expect(inlinedErr.hostname).toBe(sharedErr.hostname);
      expect(inlinedErr.resolvedAddress).toBe(sharedErr.resolvedAddress);
    }
  });
});
