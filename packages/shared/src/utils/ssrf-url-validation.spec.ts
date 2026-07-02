import * as dns from 'node:dns';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isPrivateIp, validateUrlSsrf } from './ssrf-url-validation';

describe('ssrf-url-validation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isPrivateIp', () => {
    it('should detect IPv4 private and reserved addresses', () => {
      expect(isPrivateIp('0.0.0.0')).toBe(true);
      expect(isPrivateIp('127.0.0.1')).toBe(true);
      expect(isPrivateIp('10.0.0.1')).toBe(true);
      expect(isPrivateIp('172.16.0.1')).toBe(true);
      expect(isPrivateIp('172.31.255.255')).toBe(true);
      expect(isPrivateIp('192.168.1.1')).toBe(true);
      expect(isPrivateIp('169.254.1.1')).toBe(true);
      expect(isPrivateIp('100.64.0.1')).toBe(true);
      expect(isPrivateIp('100.100.100.200')).toBe(true);
      expect(isPrivateIp('100.127.255.255')).toBe(true);
      expect(isPrivateIp('100.63.255.255')).toBe(false);
      expect(isPrivateIp('100.128.0.1')).toBe(false);
    });

    it('should detect IPv6 private, loopback, and link-local addresses', () => {
      expect(isPrivateIp('::1')).toBe(true);
      expect(isPrivateIp('fc00::1')).toBe(true);
      expect(isPrivateIp('fdff::1')).toBe(true);
      expect(isPrivateIp('fe80::1')).toBe(true);
      expect(isPrivateIp('fe80:abcd::1')).toBe(true);
      expect(isPrivateIp('fea0::1')).toBe(true);
      expect(isPrivateIp('febf::1')).toBe(true);
    });

    it('should detect IPv4-mapped private IPv6 addresses', () => {
      expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true);
      expect(isPrivateIp('::ffff:10.0.0.1')).toBe(true);
      expect(isPrivateIp('::ffff:192.168.1.1')).toBe(true);
      expect(isPrivateIp('::ffff:169.254.1.1')).toBe(true);
      expect(isPrivateIp('::ffff:100.100.100.200')).toBe(true);
    });

    it('should detect alternate IPv6 encodings of private IPv4 addresses', () => {
      expect(isPrivateIp('::ffff:a9fe:a9fe')).toBe(true);
      expect(isPrivateIp('::ffff:7f00:1')).toBe(true);
      expect(isPrivateIp('::a9fe:a9fe')).toBe(true);
      expect(isPrivateIp('::169.254.169.254')).toBe(true);
      expect(isPrivateIp('64:ff9b::a9fe:a9fe')).toBe(true);
      expect(isPrivateIp('64:ff9b::169.254.169.254')).toBe(true);
      expect(isPrivateIp('2002:7f00:1::')).toBe(true);
      expect(isPrivateIp('::')).toBe(true);
      expect(isPrivateIp('0:0:0:0:0:0:0:1')).toBe(true);
    });

    it('should allow public IP addresses in IPv6 transition encodings', () => {
      expect(isPrivateIp('::ffff:8.8.8.8')).toBe(false);
      expect(isPrivateIp('::ffff:808:808')).toBe(false);
      expect(isPrivateIp('64:ff9b::808:808')).toBe(false);
      expect(isPrivateIp('2002:c000:201::')).toBe(false);
    });

    it('should allow public IP addresses', () => {
      expect(isPrivateIp('8.8.8.8')).toBe(false);
      expect(isPrivateIp('1.1.1.1')).toBe(false);
      expect(isPrivateIp('2001:4860:4860::8888')).toBe(false);
      expect(isPrivateIp('fe8::1')).toBe(false);
      expect(isPrivateIp('feb::1')).toBe(false);
    });

    it('should fail closed on malformed dotted IPv4-compatible encodings', () => {
      // Invalid octet (999 > 255) — intentionally malformed to exercise fail-closed behavior.
      expect(isPrivateIp('::169.254.999.999')).toBe(true);
    });

    it('should fail closed on NAT64 dotted-decimal mixed notation', () => {
      // Hex form (64:ff9b::808:808) is public; dotted-decimal mixed notation is always blocked.
      expect(isPrivateIp('64:ff9b::8.8.8.8')).toBe(true);
    });

    it('should classify bracketed IPv6 literals consistently with bare addresses', () => {
      expect(isPrivateIp('[::ffff:a9fe:a9fe]')).toBe(true);
    });
  });

  describe('validateUrlSsrf', () => {
    it('should block bracketed IPv6 literals that normalize to private addresses', async () => {
      const result = await validateUrlSsrf('http://[::ffff:169.254.169.254]/');

      expect(result).toBe(
        'Requests to private or reserved IP addresses are not allowed (resolved: ::ffff:a9fe:a9fe).'
      );
    });

    it('should block hostnames that resolve to IPv6 link-local addresses', async () => {
      vi.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: 'fe80::1', family: 6 }] as never);

      const result = await validateUrlSsrf('https://ssrf-link-local-test.invalid/file.txt');

      expect(result).toBe('Requests to private or reserved IP addresses are not allowed (resolved: fe80::1).');
    });

    it('should block hostnames that resolve to RFC6598 shared address space', async () => {
      vi.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '100.100.100.200', family: 4 }] as never);

      const result = await validateUrlSsrf('https://ssrf-shared-address-test.invalid/latest/meta-data/');

      expect(result).toBe('Requests to private or reserved IP addresses are not allowed (resolved: 100.100.100.200).');
    });
  });
});
