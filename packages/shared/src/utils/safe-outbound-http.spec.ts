import * as dns from 'node:dns';
import * as http from 'node:http';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { safeOutboundJsonRequest, safeOutboundRequest } from './safe-outbound-http';

const ORIGINAL_ALLOW = process.env.NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS;
beforeAll(() => {
  process.env.NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS = '127.0.0.1';
});
afterAll(() => {
  if (ORIGINAL_ALLOW === undefined) {
    delete process.env.NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS;
  } else {
    process.env.NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS = ORIGINAL_ALLOW;
  }
});

describe('safe-outbound-http', () => {
  let upstream: http.Server;
  let upstreamUrl: string;
  let upstreamHits: Array<{
    url: string;
    method: string;
    headers: http.IncomingHttpHeaders;
    bodyChunks: Buffer[];
  }> = [];
  /** Optional handler injected per-test to override default upstream behaviour. */
  let respond: ((req: http.IncomingMessage, res: http.ServerResponse) => void) | null = null;

  beforeEach(async () => {
    upstreamHits = [];
    respond = null;

    upstream = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        upstreamHits.push({
          url: req.url ?? '',
          method: req.method ?? 'GET',
          headers: req.headers,
          bodyChunks: chunks,
        });

        if (respond) {
          respond(req, res);

          return;
        }

        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, path: req.url }));
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

  /** Pin DNS to localhost. The hostname is bogus to ensure no real resolution happens. */
  function dnsLocalhost() {
    return vi.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '127.0.0.1', family: 4 }] as never);
  }

  describe('URL-level guards', () => {
    it('rejects credentials embedded in the URL', async () => {
      dnsLocalhost();

      await expect(safeOutboundRequest({ url: 'https://user:pass@example.com/x' })).rejects.toMatchObject({
        name: 'SsrfBlockedError',
        reason: 'CREDENTIALS_IN_URL',
      });
    });

    it('rejects non-http(s) schemes', async () => {
      await expect(safeOutboundRequest({ url: 'ftp://example.com/' })).rejects.toMatchObject({
        name: 'SsrfBlockedError',
        reason: 'UNSUPPORTED_SCHEME',
      });
      await expect(safeOutboundRequest({ url: 'gopher://example.com/' })).rejects.toMatchObject({
        name: 'SsrfBlockedError',
        reason: 'UNSUPPORTED_SCHEME',
      });
      await expect(safeOutboundRequest({ url: 'file:///etc/passwd' })).rejects.toMatchObject({
        name: 'SsrfBlockedError',
        reason: 'UNSUPPORTED_SCHEME',
      });
    });

    it('rejects literal localhost without DNS', async () => {
      const lookup = vi.spyOn(dns.promises, 'lookup');

      await expect(safeOutboundRequest({ url: 'http://localhost/x' })).rejects.toMatchObject({
        reason: 'BLOCKED_HOSTNAME',
      });
      expect(lookup).not.toHaveBeenCalled();
    });

    it('rejects metadata.google.internal without DNS', async () => {
      const lookup = vi.spyOn(dns.promises, 'lookup');

      await expect(safeOutboundRequest({ url: 'http://metadata.google.internal/x' })).rejects.toMatchObject({
        reason: 'BLOCKED_HOSTNAME',
      });
      expect(lookup).not.toHaveBeenCalled();
    });

    it('rejects malformed URLs', async () => {
      await expect(safeOutboundRequest({ url: 'not-a-url' })).rejects.toMatchObject({
        reason: 'INVALID_URL',
      });
    });
  });

  describe('DNS guards', () => {
    it('rejects hostnames that resolve to IPv4 RFC1918', async () => {
      vi.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '192.168.1.10', family: 4 }] as never);

      await expect(safeOutboundRequest({ url: 'https://malicious.invalid/' })).rejects.toMatchObject({
        reason: 'PRIVATE_IP',
        resolvedAddress: '192.168.1.10',
      });
    });

    it('rejects hostnames that resolve to AWS metadata link-local', async () => {
      vi.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '169.254.169.254', family: 4 }] as never);

      await expect(safeOutboundRequest({ url: 'https://metadata-attacker.invalid/' })).rejects.toMatchObject({
        reason: 'PRIVATE_IP',
        resolvedAddress: '169.254.169.254',
      });
    });

    it('rejects IPv6 link-local', async () => {
      vi.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: 'fe80::1', family: 6 }] as never);

      await expect(safeOutboundRequest({ url: 'https://v6-attacker.invalid/' })).rejects.toMatchObject({
        reason: 'PRIVATE_IP',
      });
    });

    it('rejects IPv6 unique-local (fc00::/7)', async () => {
      vi.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: 'fd12:3456:789a::1', family: 6 }] as never);

      await expect(safeOutboundRequest({ url: 'https://v6-ula.invalid/' })).rejects.toMatchObject({
        reason: 'PRIVATE_IP',
      });
    });

    it('rejects when ANY resolved address is private (mixed answer attack)', async () => {
      vi.spyOn(dns.promises, 'lookup').mockResolvedValue([
        { address: '8.8.8.8', family: 4 },
        { address: '10.0.0.5', family: 4 },
      ] as never);

      await expect(safeOutboundRequest({ url: 'https://mixed.invalid/' })).rejects.toMatchObject({
        reason: 'PRIVATE_IP',
        resolvedAddress: '10.0.0.5',
      });
    });

    it('rejects IPv4-mapped IPv6 of private addresses', async () => {
      vi.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '::ffff:127.0.0.1', family: 6 }] as never);

      await expect(safeOutboundRequest({ url: 'https://mapped.invalid/' })).rejects.toMatchObject({
        reason: 'PRIVATE_IP',
      });
    });
  });

  describe('DNS rebinding defense', () => {
    it('uses a fresh DNS resolution per attempt instead of a cached result', async () => {
      // First call: validation pass (public IP). Second call: a private IP appears.
      // The safe client must consult DNS again on the second call rather than
      // reusing the first result.
      const lookup = vi
        .spyOn(dns.promises, 'lookup')
        .mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }] as never)
        .mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }] as never)
        .mockResolvedValueOnce([{ address: '10.0.0.5', family: 4 }] as never);

      const ok = await safeOutboundRequest({ url: `${upstreamUrl}/first` });
      expect(ok.statusCode).toBe(200);

      const ok2 = await safeOutboundRequest({ url: `${upstreamUrl}/second` });
      expect(ok2.statusCode).toBe(200);

      await expect(safeOutboundRequest({ url: `${upstreamUrl}/third` })).rejects.toMatchObject({
        reason: 'PRIVATE_IP',
        resolvedAddress: '10.0.0.5',
      });

      // 3 attempts → 3 DNS lookups (no caching window the attacker can exploit).
      expect(lookup).toHaveBeenCalledTimes(3);
    });
  });

  describe('redirect handling', () => {
    it('re-runs the SSRF policy on every Location target', async () => {
      // Upstream returns a redirect to a publicly-validated host whose DNS now
      // points at loopback — this is the classic public→private redirect trick.
      respond = (_req, res) => {
        res.writeHead(302, { location: 'https://evil-redirect.invalid/internal' });
        res.end();
      };

      const lookup = vi
        .spyOn(dns.promises, 'lookup')
        .mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }] as never) // initial host
        .mockResolvedValueOnce([{ address: '169.254.169.254', family: 4 }] as never); // redirect target

      await expect(safeOutboundRequest({ url: `${upstreamUrl}/start`, maxRedirects: 5 })).rejects.toMatchObject({
        reason: 'PRIVATE_IP',
        resolvedAddress: '169.254.169.254',
      });

      expect(lookup).toHaveBeenCalledTimes(2);
    });

    it('strips sensitive headers when a redirect crosses origin boundaries', async () => {
      let redirectTargetUrl = '';

      const secondUpstream = http.createServer((req, res) => {
        upstreamHits.push({
          url: req.url ?? '',
          method: req.method ?? 'GET',
          headers: req.headers,
          bodyChunks: [],
        });
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end('{}');
      });

      await new Promise<void>((resolve) => secondUpstream.listen(0, '127.0.0.1', () => resolve()));
      const addr = secondUpstream.address();
      if (!addr || typeof addr === 'string') throw new Error('listen failed');
      redirectTargetUrl = `http://other-host.invalid:${addr.port}/elsewhere`;

      respond = (_req, res) => {
        res.writeHead(302, { location: redirectTargetUrl });
        res.end();
      };

      vi.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '127.0.0.1', family: 4 }] as never);

      try {
        await safeOutboundRequest({
          url: `${upstreamUrl}/start`,
          method: 'POST',
          headers: {
            authorization: 'Bearer secret',
            'novu-signature': 'v1,t=1,sig',
            'x-novu-signature': 'v1,t=1,sig',
            'x-trace-id': 'keep-me',
          },
          body: { sensitive: true },
        });

        expect(upstreamHits).toHaveLength(2);
        const [initialHit, redirectHit] = upstreamHits as [
          (typeof upstreamHits)[number],
          (typeof upstreamHits)[number],
        ];

        expect(initialHit.headers.authorization).toBe('Bearer secret');
        expect(initialHit.headers['novu-signature']).toBe('v1,t=1,sig');

        expect(redirectHit.headers.authorization).toBeUndefined();
        expect(redirectHit.headers['novu-signature']).toBeUndefined();
        expect(redirectHit.headers['x-novu-signature']).toBeUndefined();
        expect(redirectHit.headers['x-trace-id']).toBe('keep-me');
      } finally {
        // Always release the secondary listener even if the request or any
        // assertion above throws — otherwise the dangling socket can hang the
        // entire vitest worker.
        await new Promise<void>((resolve) => secondUpstream.close(() => resolve()));
      }
    });

    it('refuses to follow redirects to non-http(s) schemes', async () => {
      respond = (_req, res) => {
        res.writeHead(302, { location: 'file:///etc/passwd' });
        res.end();
      };

      vi.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '127.0.0.1', family: 4 }] as never);

      await expect(safeOutboundRequest({ url: `${upstreamUrl}/scheme-redirect` })).rejects.toMatchObject({
        reason: 'UNSUPPORTED_SCHEME',
      });
    });

    it('refuses to follow cross-origin 307 redirects (method-preserving)', async () => {
      // 307 must replay the original method+body against the new target. If
      // that target is a different origin, blanking the body would mask the
      // attempt; treat it as a hard stop instead.
      respond = (_req, res) => {
        res.writeHead(307, { location: 'http://other-host.invalid:9999/elsewhere' });
        res.end();
      };

      vi.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '127.0.0.1', family: 4 }] as never);

      await expect(
        safeOutboundRequest({
          url: `${upstreamUrl}/start`,
          method: 'POST',
          headers: { authorization: 'Bearer secret' },
          body: { sensitive: true },
        })
      ).rejects.toMatchObject({
        name: 'SsrfBlockedError',
        reason: 'CROSS_ORIGIN_METHOD_PRESERVING_REDIRECT',
      });
    });

    it('refuses to follow cross-origin 308 redirects (method-preserving)', async () => {
      respond = (_req, res) => {
        res.writeHead(308, { location: 'http://other-host.invalid:9999/elsewhere' });
        res.end();
      };

      vi.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '127.0.0.1', family: 4 }] as never);

      await expect(
        safeOutboundRequest({
          url: `${upstreamUrl}/start`,
          method: 'POST',
          body: { sensitive: true },
        })
      ).rejects.toMatchObject({
        name: 'SsrfBlockedError',
        reason: 'CROSS_ORIGIN_METHOD_PRESERVING_REDIRECT',
      });
    });

    it('allows same-origin 307 redirects (the body and method are safe to replay)', async () => {
      let hits = 0;
      respond = (_req, res) => {
        hits += 1;
        if (hits === 1) {
          // Self-redirect: same host, different path. Method-preserving is fine here.
          res.writeHead(307, { location: '/replayed' });
          res.end();

          return;
        }
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ replayed: true }));
      };

      vi.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '127.0.0.1', family: 4 }] as never);

      const response = await safeOutboundJsonRequest<{ replayed: boolean }>({
        url: `${upstreamUrl}/start`,
        method: 'POST',
        body: { keep: true },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ replayed: true });
      expect(upstreamHits).toHaveLength(2);
      const [, replayHit] = upstreamHits as [(typeof upstreamHits)[number], (typeof upstreamHits)[number]];
      expect(replayHit.method).toBe('POST');
      expect(JSON.parse(Buffer.concat(replayHit.bodyChunks).toString('utf8'))).toEqual({ keep: true });
    });
  });

  describe('happy path', () => {
    it('reaches a public host and pins to the resolved IP, preserving Host header', async () => {
      vi.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '127.0.0.1', family: 4 }] as never);

      const response = await safeOutboundJsonRequest<{ ok: boolean; path: string }>({
        url: `${upstreamUrl}/ping`,
        method: 'POST',
        body: { hello: 'world' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ ok: true, path: '/ping' });
      expect(upstreamHits).toHaveLength(1);
      const hit = upstreamHits[0]!;
      expect(hit.headers.host).toContain('test-upstream.invalid');
    });
  });
});
