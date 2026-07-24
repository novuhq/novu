import { afterEach, describe, expect, it } from 'vitest';
import {
  isAddressAllowedByOutboundAllowList,
  isHostnameAllowedByOutboundAllowList,
  isOutboundAddressAllowed,
  resetOutboundSsrfAllowListCacheForTests,
} from './outbound-ssrf-allow-list';

const PRODUCTION_ENV_KEY = 'NOVU_SAFE_OUTBOUND_ALLOW';
const TEST_ENV_KEY = 'NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS';

function withAllowList(env: Record<string, string | undefined>, fn: () => void) {
  const previous: Record<string, string | undefined> = {
    [PRODUCTION_ENV_KEY]: process.env[PRODUCTION_ENV_KEY],
    [TEST_ENV_KEY]: process.env[TEST_ENV_KEY],
  };

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  resetOutboundSsrfAllowListCacheForTests();

  try {
    fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    resetOutboundSsrfAllowListCacheForTests();
  }
}

describe('outbound-ssrf-allow-list', () => {
  afterEach(() => {
    delete process.env[PRODUCTION_ENV_KEY];
    delete process.env[TEST_ENV_KEY];
    resetOutboundSsrfAllowListCacheForTests();
  });

  it('allows exact IPs from the production env var', () => {
    withAllowList({ [PRODUCTION_ENV_KEY]: '10.0.0.5,192.168.1.20' }, () => {
      expect(isAddressAllowedByOutboundAllowList('10.0.0.5')).toBe(true);
      expect(isAddressAllowedByOutboundAllowList('192.168.1.20')).toBe(true);
      expect(isAddressAllowedByOutboundAllowList('10.0.0.6')).toBe(false);
    });
  });

  it('allows CIDR ranges', () => {
    withAllowList({ [PRODUCTION_ENV_KEY]: '10.0.0.0/8,192.168.0.0/16' }, () => {
      expect(isAddressAllowedByOutboundAllowList('10.42.1.5')).toBe(true);
      expect(isAddressAllowedByOutboundAllowList('192.168.50.10')).toBe(true);
      expect(isAddressAllowedByOutboundAllowList('172.16.0.1')).toBe(false);
    });
  });

  it('allows exact hostnames', () => {
    withAllowList({ [PRODUCTION_ENV_KEY]: 'bridge.internal' }, () => {
      expect(isHostnameAllowedByOutboundAllowList('bridge.internal')).toBe(true);
      expect(isHostnameAllowedByOutboundAllowList('other.internal')).toBe(false);
    });
  });

  it('allows Kubernetes service DNS suffixes', () => {
    withAllowList({ [PRODUCTION_ENV_KEY]: '.svc.cluster.local' }, () => {
      expect(isHostnameAllowedByOutboundAllowList('my-bridge.my-namespace.svc.cluster.local')).toBe(true);
      expect(isHostnameAllowedByOutboundAllowList('svc.cluster.local')).toBe(true);
      expect(isHostnameAllowedByOutboundAllowList('example.com')).toBe(false);
    });
  });

  it('allows wildcard namespace suffixes', () => {
    withAllowList({ [PRODUCTION_ENV_KEY]: '*.my-namespace.svc.cluster.local' }, () => {
      expect(isHostnameAllowedByOutboundAllowList('my-bridge.my-namespace.svc.cluster.local')).toBe(true);
      expect(isHostnameAllowedByOutboundAllowList('other-namespace.svc.cluster.local')).toBe(false);
    });
  });

  it('merges production and legacy test IP allow lists', () => {
    withAllowList(
      {
        [PRODUCTION_ENV_KEY]: '.svc.cluster.local',
        [TEST_ENV_KEY]: '127.0.0.1',
      },
      () => {
        expect(isOutboundAddressAllowed('bridge.ns.svc.cluster.local', '10.0.0.5')).toBe(true);
        expect(isOutboundAddressAllowed('example.com', '127.0.0.1')).toBe(true);
        expect(isOutboundAddressAllowed('example.com', '10.0.0.5')).toBe(false);
      }
    );
  });
});
