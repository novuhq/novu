import { resolveThrottleGrouping } from './resolve-throttle-grouping';

describe('resolveThrottleGrouping', () => {
  it('uses the rendered Liquid value without treating it as another payload path', () => {
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

  it('preserves the legacy Redis identity for a bare payload path', () => {
    expect(resolveThrottleGrouping('userId', 'userId', { userId: 'user-1' })).toEqual({
      throttleKey: 'userId',
      throttleValue: 'user-1',
    });
  });

  it('preserves the legacy ungrouped identity when a bare path is missing', () => {
    expect(resolveThrottleGrouping('userId', 'userId', {})).toEqual({
      throttleKey: 'userId',
      throttleValue: undefined,
    });
  });

  it('uses the legacy default identity when no custom key is configured', () => {
    expect(resolveThrottleGrouping(undefined, undefined, {})).toEqual({
      throttleKey: 'default',
      throttleValue: 'default',
    });
  });

  it('keeps a missing Liquid value on the legacy ungrouped identity', () => {
    expect(resolveThrottleGrouping('{{payload.userId}}', '', {})).toEqual({});
  });

  it('supports stateless workflows that only expose the resolved value', () => {
    expect(resolveThrottleGrouping(undefined, 'project-1', {})).toEqual({
      throttleKey: 'project-1',
      throttleValue: 'project-1',
    });
  });
});
