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
      expect(isPrivateIp('::ffff:fe80::1')).toBe(true);
    });

    it('should allow public IP addresses', () => {
      expect(isPrivateIp('8.8.8.8')).toBe(false);
      expect(isPrivateIp('1.1.1.1')).toBe(false);
      expect(isPrivateIp('2001:4860:4860::8888')).toBe(false);
      expect(isPrivateIp('fe8::1')).toBe(false);
      expect(isPrivateIp('feb::1')).toBe(false);
    });
  });

  describe('validateUrlSsrf', () => {
    it('should block hostnames that resolve to IPv6 link-local addresses', async () => {
      vi.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: 'fe80::1', family: 6 }] as never);

      const result = await validateUrlSsrf('https://ssrf-link-local-test.invalid/file.txt');

      expect(result).toBe('Requests to private or reserved IP addresses are not allowed (resolved: fe80::1).');
    });
  });
});
