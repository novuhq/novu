// The inlined copy lives outside this package's rootDir. Compute the path at
// runtime so the TypeScript build does not traverse into libs/application-generic
// and emit stray artifacts there. Vitest runs in Node and resolves the path
// against the spec's __dirname.
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
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

type InlinedSsrfModule = {
  isPrivateIp: (ip: string) => boolean;
  normalizeHostnameForLookup: (hostname: string) => string;
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

let inlinedIsPrivateIp: InlinedSsrfModule['isPrivateIp'];
let inlinedNormalizeHostnameForLookup: InlinedSsrfModule['normalizeHostnameForLookup'];
let InlinedSsrfBlockedError: InlinedSsrfModule['SsrfBlockedError'];

beforeAll(async () => {
  const inlined = (await import(inlinedPath)) as InlinedSsrfModule;
  inlinedIsPrivateIp = inlined.isPrivateIp;
  inlinedNormalizeHostnameForLookup = inlined.normalizeHostnameForLookup;
  InlinedSsrfBlockedError = inlined.SsrfBlockedError;
});

/**
 * libs/application-generic carries an inlined copy of the SSRF primitives and
 * the safe outbound HTTP runner because its CommonJS module resolution cannot
 * honour `@novu/shared`'s subpath exports. URL policy and DNS handling MUST stay
 * in lockstep between the two copies. Private IP classification is delegated to
 * `@novu/shared/utils/private-ip-classification` — this suite verifies that wiring
 * and that the remaining mirrored surfaces have not drifted.
 */
describe('safe outbound HTTP — shared vs application-generic drift check', () => {
  it('application-generic delegates isPrivateIp to shared classification', () => {
    expect(inlinedNormalizeHostnameForLookup('[::1]')).toBe('::1');

    for (const ip of ['169.254.169.254', '::ffff:a9fe:a9fe', '64:ff9b::169.254.169.254']) {
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
