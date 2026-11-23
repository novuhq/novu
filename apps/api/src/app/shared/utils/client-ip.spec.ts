import type { IncomingMessage } from 'node:http';
import { expect } from 'chai';
import { getClientIp } from './client-ip';

function buildRequest(headers: Record<string, string>, remoteAddress = '10.0.0.5'): IncomingMessage {
  return { headers, socket: { remoteAddress } } as unknown as IncomingMessage;
}

const SPOOFED_HEADERS = { 'x-client-ip': '1.2.3.4', 'x-forwarded-for': '5.6.7.8, 198.51.100.10' };

const ENV_KEYS = ['CLIENT_IP_HEADER', 'IS_SELF_HOSTED', 'NOVU_ENTERPRISE'] as const;

type ClientIpEnv = Partial<Record<(typeof ENV_KEYS)[number], string>>;

/** Sets exactly these variables and clears the other ENV_KEYS. */
function setEnv(values: ClientIpEnv): void {
  for (const key of ENV_KEYS) {
    const value = values[key];

    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe('getClientIp', () => {
  const originalEnv: ClientIpEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

  afterEach(() => {
    setEnv(originalEnv);
  });

  describe('when CLIENT_IP_HEADER is unset outside Novu Cloud', () => {
    it('reads the first matching proxy header on a self-hosted install', () => {
      setEnv({ IS_SELF_HOSTED: 'true', NOVU_ENTERPRISE: 'true' });

      expect(getClientIp(buildRequest({ ...SPOOFED_HEADERS, 'cf-connecting-ip': '203.0.113.7' }))).to.equal('1.2.3.4');
    });

    it('reads the first matching proxy header without NOVU_ENTERPRISE', () => {
      setEnv({});

      expect(getClientIp(buildRequest({ ...SPOOFED_HEADERS, 'cf-connecting-ip': '203.0.113.7' }))).to.equal('1.2.3.4');
    });

    it('falls back to the socket address without proxy headers', () => {
      setEnv({ IS_SELF_HOSTED: 'true' });

      expect(getClientIp(buildRequest({}))).to.equal('10.0.0.5');
    });
  });

  describe('on Novu Cloud', () => {
    beforeEach(() => {
      setEnv({ NOVU_ENTERPRISE: 'true' });
    });

    it('trusts only cf-connecting-ip by default', () => {
      expect(getClientIp(buildRequest({ ...SPOOFED_HEADERS, 'cf-connecting-ip': '203.0.113.7' }))).to.equal(
        '203.0.113.7'
      );
    });

    it('falls back to the socket address when cf-connecting-ip is missing', () => {
      expect(getClientIp(buildRequest(SPOOFED_HEADERS))).to.equal('10.0.0.5');
    });

    it('trusts CLIENT_IP_HEADER instead of the default when it is set', () => {
      process.env.CLIENT_IP_HEADER = 'True-Client-IP';

      expect(
        getClientIp(buildRequest({ 'cf-connecting-ip': '203.0.113.7', 'true-client-ip': '198.51.100.20' }))
      ).to.equal('198.51.100.20');
    });

    it('reads the first matching proxy header when CLIENT_IP_HEADER is empty', () => {
      process.env.CLIENT_IP_HEADER = '';

      expect(getClientIp(buildRequest({ ...SPOOFED_HEADERS, 'cf-connecting-ip': '203.0.113.7' }))).to.equal('1.2.3.4');
    });
  });

  describe('when CLIENT_IP_HEADER is set', () => {
    beforeEach(() => {
      setEnv({ CLIENT_IP_HEADER: 'CF-Connecting-IP', IS_SELF_HOSTED: 'true', NOVU_ENTERPRISE: 'true' });
    });

    it('trusts only the configured header and ignores client-set proxy headers', () => {
      expect(getClientIp(buildRequest({ ...SPOOFED_HEADERS, 'cf-connecting-ip': '203.0.113.7' }))).to.equal(
        '203.0.113.7'
      );
    });

    it('accepts an IPv6 address', () => {
      expect(getClientIp(buildRequest({ 'cf-connecting-ip': '2001:db8::1' }))).to.equal('2001:db8::1');
    });

    it('falls back to the socket address when the header is missing', () => {
      expect(getClientIp(buildRequest(SPOOFED_HEADERS))).to.equal('10.0.0.5');
    });

    it('falls back to the socket address when the header is not a single IP', () => {
      expect(getClientIp(buildRequest({ 'cf-connecting-ip': '203.0.113.7, 198.51.100.10' }))).to.equal('10.0.0.5');
    });
  });
});
