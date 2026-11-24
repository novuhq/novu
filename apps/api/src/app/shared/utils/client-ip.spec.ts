import type { IncomingMessage } from 'node:http';
import { expect } from 'chai';
import sinon from 'sinon';
import { AGENT_INBOX_CLIENT_IP_HEADER, AGENT_INBOX_CLIENT_IP_SIGNATURE_HEADER, getClientIp } from './client-ip';

function buildRequest(headers: Record<string, string>, remoteAddress = '10.0.0.5'): IncomingMessage {
  return { headers, socket: { remoteAddress } } as unknown as IncomingMessage;
}

const SPOOFED_HEADERS = { 'x-client-ip': '1.2.3.4', 'x-forwarded-for': '5.6.7.8, 198.51.100.10' };

const ENV_KEYS = ['AGENT_INBOX_DASHBOARD_API_SECRET', 'CLIENT_IP_HEADER', 'IS_SELF_HOSTED', 'NOVU_ENTERPRISE'] as const;

/** The same vector as Agent Inbox's `client-ip-signature.spec.ts`, so the two sides can't drift apart. */
const AGENT_INBOX_SECRET = 'agent-inbox-test-secret';
const SIGNED_AT_MS = Date.UTC(2026, 10, 23);
const SIGNED_VISITOR_HEADERS = {
  [AGENT_INBOX_CLIENT_IP_HEADER]: '203.0.113.7',
  [AGENT_INBOX_CLIENT_IP_SIGNATURE_HEADER]:
    '1795392000.efc2847df3540c3a90a333020cec69c6546fe930cd22611656ae6cd214da4828',
};
const VERCEL_EGRESS = { 'cf-connecting-ip': '76.76.21.9', 'x-forwarded-for': '203.0.113.7, 76.76.21.9' };

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

  describe('on calls the Agent Inbox site forwards to Novu Cloud', () => {
    let clock: sinon.SinonFakeTimers;

    beforeEach(() => {
      setEnv({ AGENT_INBOX_DASHBOARD_API_SECRET: AGENT_INBOX_SECRET, NOVU_ENTERPRISE: 'true' });
      clock = sinon.useFakeTimers(SIGNED_AT_MS + 30_000);
    });

    afterEach(() => {
      clock.restore();
    });

    it('trusts the visitor IP the site signed over cf-connecting-ip', () => {
      expect(getClientIp(buildRequest({ ...VERCEL_EGRESS, ...SIGNED_VISITOR_HEADERS }))).to.equal('203.0.113.7');
    });

    it('ignores a signed IP that was changed on the way', () => {
      const tampered = { ...SIGNED_VISITOR_HEADERS, [AGENT_INBOX_CLIENT_IP_HEADER]: '198.51.100.20' };

      expect(getClientIp(buildRequest({ ...VERCEL_EGRESS, ...tampered }))).to.equal('76.76.21.9');
    });

    it('ignores a signature made with another secret', () => {
      process.env.AGENT_INBOX_DASHBOARD_API_SECRET = 'another-secret';

      expect(getClientIp(buildRequest({ ...VERCEL_EGRESS, ...SIGNED_VISITOR_HEADERS }))).to.equal('76.76.21.9');
    });

    it('ignores a signature more than five minutes old', () => {
      clock.setSystemTime(SIGNED_AT_MS + 5 * 60_000 + 1000);

      expect(getClientIp(buildRequest({ ...VERCEL_EGRESS, ...SIGNED_VISITOR_HEADERS }))).to.equal('76.76.21.9');
    });

    it('ignores the signed headers when AGENT_INBOX_DASHBOARD_API_SECRET is unset', () => {
      delete process.env.AGENT_INBOX_DASHBOARD_API_SECRET;

      expect(getClientIp(buildRequest({ ...VERCEL_EGRESS, ...SIGNED_VISITOR_HEADERS }))).to.equal('76.76.21.9');
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
