import type { IncomingMessage } from 'node:http';
import { expect } from 'chai';
import { getClientIp } from './client-ip';

function buildRequest(headers: Record<string, string>, remoteAddress = '10.0.0.5'): IncomingMessage {
  return { headers, socket: { remoteAddress } } as unknown as IncomingMessage;
}

const SPOOFED_HEADERS = { 'x-client-ip': '1.2.3.4', 'x-forwarded-for': '5.6.7.8, 198.51.100.10' };

describe('getClientIp', () => {
  const originalHeader = process.env.CLIENT_IP_HEADER;

  afterEach(() => {
    if (originalHeader === undefined) {
      delete process.env.CLIENT_IP_HEADER;
    } else {
      process.env.CLIENT_IP_HEADER = originalHeader;
    }
  });

  describe('when CLIENT_IP_HEADER is unset', () => {
    beforeEach(() => {
      delete process.env.CLIENT_IP_HEADER;
    });

    it('reads the first matching proxy header', () => {
      expect(getClientIp(buildRequest({ ...SPOOFED_HEADERS, 'cf-connecting-ip': '203.0.113.7' }))).to.equal('1.2.3.4');
    });

    it('falls back to the socket address without proxy headers', () => {
      expect(getClientIp(buildRequest({}))).to.equal('10.0.0.5');
    });
  });

  describe('when CLIENT_IP_HEADER is set', () => {
    beforeEach(() => {
      process.env.CLIENT_IP_HEADER = 'CF-Connecting-IP';
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
