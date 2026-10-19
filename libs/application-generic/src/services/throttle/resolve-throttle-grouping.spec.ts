import { buildThrottleGroupingSuffix, resolveThrottleGrouping } from './resolve-throttle-grouping';

function redisIdentity(configured: unknown, resolved: unknown, payload: unknown): string {
  return buildThrottleGroupingSuffix(resolveThrottleGrouping(configured, resolved, payload));
}

describe('resolveThrottleGrouping', () => {
  describe('production Redis identity (must not change for working customers)', () => {
    it('keeps the default window when no custom key is configured', () => {
      expect(redisIdentity(undefined, undefined, {})).toBe(':default:default');
      expect(redisIdentity('', '', {})).toBe(':default:default');
    });

    it('keeps the bare-path identity so API-configured keys survive deploy', () => {
      expect(redisIdentity('userId', 'userId', { userId: 'user-1' })).toBe(':userId:user-1');
    });

    it('keeps the ungrouped identity when a bare path is missing from the payload', () => {
      expect(redisIdentity('userId', 'userId', {})).toBe('');
    });

    it('keeps the default window when a Liquid key renders empty, matching falsy compiled output', () => {
      expect(redisIdentity('{{payload.userId}}', '', {})).toBe(':default:default');
      expect(redisIdentity('{{payload.userId}}', undefined, {})).toBe(':default:default');
    });

    it('stringifies null/number bare-path values the same way Redis interpolation did', () => {
      expect(redisIdentity('count', 'count', { count: 0 })).toBe(':count:0');
      expect(redisIdentity('flag', 'flag', { flag: false })).toBe(':flag:false');
      expect(redisIdentity('org', 'org', { org: null })).toBe(':org:null');
    });
  });

  describe('dashboard Liquid keys (the original bug)', () => {
    it('groups by the rendered value instead of collapsing every value onto one ungrouped window', () => {
      expect(
        redisIdentity('{{payload.group}}', 'tenantId', {
          group: 'tenantId',
          tenantId: 'acme',
        })
      ).toBe(':tenantId:tenantId');
    });

    it('does not look the rendered value up as another payload path', () => {
      expect(
        resolveThrottleGrouping('{{payload.group}}', 'tenantId', {
          group: 'tenantId',
          tenantId: 'acme',
        })
      ).toEqual({
        throttleKey: 'tenantId',
        throttleValue: 'tenantId',
      });
    });
  });

  it('supports stateless workflows that only expose the resolved value', () => {
    expect(resolveThrottleGrouping(undefined, 'project-1', {})).toEqual({
      throttleKey: 'project-1',
      throttleValue: 'project-1',
    });
    expect(redisIdentity(undefined, 'project-1', {})).toBe(':project-1:project-1');
  });
});
