// The inlined copy lives outside this package's rootDir. Compute the path at
// runtime so the TypeScript build does not traverse into libs/application-generic
// and emit stray artifacts there. Vitest runs in Node and resolves the path
// against the spec's __dirname.
import * as dns from 'node:dns';
import { readFileSync } from 'node:fs';
import * as http from 'node:http';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetOutboundSsrfAllowListCacheForTests } from './outbound-ssrf-allow-list';
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

const sharedSafeOutboundHttpPath = join(__dirname, 'safe-outbound-http.ts');

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
  safeOutboundRequest: (options: {
    url: string | URL;
    method?: string;
    headers?: Record<string, string | undefined>;
    body?: unknown;
  }) => Promise<{
    statusCode: number;
    headers: http.IncomingHttpHeaders;
    body: Buffer;
  }>;
};

let inlinedIsPrivateIp: InlinedSsrfModule['isPrivateIp'];
let inlinedNormalizeHostnameForLookup: InlinedSsrfModule['normalizeHostnameForLookup'];
let InlinedSsrfBlockedError: InlinedSsrfModule['SsrfBlockedError'];
let inlinedSafeOutboundRequest: InlinedSsrfModule['safeOutboundRequest'];

const ORIGINAL_ALLOW = process.env.NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS;

beforeAll(async () => {
  process.env.NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS = '127.0.0.1';
  resetOutboundSsrfAllowListCacheForTests();

  const inlined = (await import(inlinedPath)) as InlinedSsrfModule;
  inlinedIsPrivateIp = inlined.isPrivateIp;
  inlinedNormalizeHostnameForLookup = inlined.normalizeHostnameForLookup;
  InlinedSsrfBlockedError = inlined.SsrfBlockedError;
  inlinedSafeOutboundRequest = inlined.safeOutboundRequest;
});

afterAll(() => {
  if (ORIGINAL_ALLOW === undefined) {
    delete process.env.NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS;
  } else {
    process.env.NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS = ORIGINAL_ALLOW;
  }

  resetOutboundSsrfAllowListCacheForTests();
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

  it('TRACE_PROPAGATION_HEADER_PATTERNS stay in lockstep with the inlined copy', () => {
    const extract = (source: string, label: string) => {
      const match = source.match(/const TRACE_PROPAGATION_HEADER_PATTERNS = \[[\s\S]*?\];/);
      const block = match?.[0];

      expect(block, `${label} is missing TRACE_PROPAGATION_HEADER_PATTERNS`).toBeTruthy();

      return (block ?? '').replace(/\s+/g, '');
    };

    expect(extract(readFileSync(inlinedPath, 'utf8'), 'application-generic')).toBe(
      extract(readFileSync(sharedSafeOutboundHttpPath, 'utf8'), 'shared')
    );
  });

  describe('inlined safeOutboundRequest strips observability propagation headers', () => {
    let upstream: http.Server;
    let upstreamUrl: string;
    let upstreamHits: Array<{ headers: http.IncomingHttpHeaders }> = [];

    beforeEach(async () => {
      upstreamHits = [];

      upstream = http.createServer((req, res) => {
        req.on('data', () => {
          /* drain */
        });
        req.on('end', () => {
          upstreamHits.push({ headers: req.headers });
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        });
      });

      await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', () => resolve()));
      const address = upstream.address();
      if (!address || typeof address === 'string') {
        throw new Error('Test upstream did not bind to a port');
      }
      upstreamUrl = `http://test-upstream.invalid:${address.port}`;
    });

    afterEach(async () => {
      vi.restoreAllMocks();
      await new Promise<void>((resolve) => upstream.close(() => resolve()));
    });

    it('drops trace-context headers while keeping application headers', async () => {
      vi.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '127.0.0.1', family: 4 }] as never);

      await inlinedSafeOutboundRequest({
        url: `${upstreamUrl}/webhook`,
        method: 'POST',
        headers: {
          traceparent: '00-trace-span-01',
          tracestate: 'vendor=value',
          baggage: 'tenant=secret',
          b3: 'trace-span-1',
          'x-b3-traceid': 'trace',
          'x-b3-spanid': 'span',
          'x-b3-parentspanid': 'parent',
          'x-b3-sampled': '1',
          'x-b3-flags': '1',
          newrelic: 'new-relic-payload',
          'x-newrelic-id': 'legacy-new-relic-id',
          'x-newrelic-transaction': 'legacy-new-relic-transaction',
          'sentry-trace': 'sentry-payload',
          'x-trace-id': 'application-trace-id',
          'x-request-id': 'application-request-id',
          authorization: 'Bearer application-token',
        },
        body: { ok: true },
      });

      expect(upstreamHits).toHaveLength(1);
      const hit = upstreamHits[0];
      expect(hit).toBeDefined();
      if (!hit) {

        return;
      }

      expect(hit.headers.traceparent).toBeUndefined();
      expect(hit.headers.tracestate).toBeUndefined();
      expect(hit.headers.baggage).toBeUndefined();
      expect(hit.headers.b3).toBeUndefined();
      expect(hit.headers['x-b3-traceid']).toBeUndefined();
      expect(hit.headers['x-b3-spanid']).toBeUndefined();
      expect(hit.headers['x-b3-parentspanid']).toBeUndefined();
      expect(hit.headers['x-b3-sampled']).toBeUndefined();
      expect(hit.headers['x-b3-flags']).toBeUndefined();
      expect(hit.headers.newrelic).toBeUndefined();
      expect(hit.headers['x-newrelic-id']).toBeUndefined();
      expect(hit.headers['x-newrelic-transaction']).toBeUndefined();
      expect(hit.headers['sentry-trace']).toBeUndefined();
      expect(hit.headers['x-trace-id']).toBe('application-trace-id');
      expect(hit.headers['x-request-id']).toBe('application-request-id');
      expect(hit.headers.authorization).toBe('Bearer application-token');
    });
  });
});
