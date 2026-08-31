import { resolveThrottleGrouping } from './resolve-throttle-grouping';

describe('resolveThrottleGrouping', () => {
  it('uses default grouping when no key is configured', () => {
    expect(resolveThrottleGrouping(undefined, { userId: 'user1' })).toEqual({
      throttleKey: 'default',
      throttleValue: 'default',
    });
  });

  it('looks up a bare payload path so existing Redis keys stay stable', () => {
    expect(resolveThrottleGrouping('userId', { userId: 'user1' })).toEqual({
      throttleKey: 'userId',
      throttleValue: 'user1',
    });
  });

  it('treats a Liquid-compiled value as the grouping value when it is not a payload path', () => {
    expect(resolveThrottleGrouping('order-1', { orderId: 'order-1' })).toEqual({
      throttleKey: 'order-1',
      throttleValue: 'order-1',
    });
  });

  it('looks up nested paths when the compiled key is still a path', () => {
    expect(resolveThrottleGrouping('order.id', { order: { id: 'abc' } })).toEqual({
      throttleKey: 'order.id',
      throttleValue: 'abc',
    });
  });
});
