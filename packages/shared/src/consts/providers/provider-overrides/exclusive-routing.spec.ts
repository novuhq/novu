import { describe, expect, it } from 'vitest';
import { resolveExclusiveRoutingKeys } from './exclusive-routing';
import { FCM_ROUTING_KEYS } from './fcm/keys';

const GROUPS = [FCM_ROUTING_KEYS];

describe('resolveExclusiveRoutingKeys', () => {
  it('reads a top-level routing key when there is no passthrough', () => {
    expect(resolveExclusiveRoutingKeys({ topic: 'orders', notification: { body: 'x' } }, GROUPS)).toEqual({
      topic: 'orders',
    });
  });

  it('lets _passthrough.body win over the same top-level key', () => {
    const resolved = resolveExclusiveRoutingKeys(
      { topic: 'from-override', _passthrough: { body: { topic: 'from-passthrough' } } },
      GROUPS
    );

    expect(resolved).toEqual({ topic: 'from-passthrough' });
  });

  it('claims the whole group so a passthrough topic evicts a top-level tokens', () => {
    const resolved = resolveExclusiveRoutingKeys(
      { tokens: ['t1', 't2'], _passthrough: { body: { topic: 'orders' } } },
      GROUPS
    );

    expect(resolved).toEqual({ topic: 'orders' });
  });

  it('falls back to the top level when the passthrough routing value is unusable', () => {
    expect(resolveExclusiveRoutingKeys({ tokens: ['t1'], _passthrough: { body: { topic: 42 } } }, GROUPS)).toEqual({
      tokens: ['t1'],
    });

    expect(
      resolveExclusiveRoutingKeys({ topic: 'orders', _passthrough: { body: { tokens: [{ $exists: true }] } } }, GROUPS)
    ).toEqual({ topic: 'orders' });
  });

  it('rejects empty strings and empty arrays at either layer', () => {
    expect(resolveExclusiveRoutingKeys({ topic: '' }, GROUPS)).toEqual({});
    expect(resolveExclusiveRoutingKeys({ tokens: [] }, GROUPS)).toEqual({});
    expect(resolveExclusiveRoutingKeys({ _passthrough: { body: { topic: '' } } }, GROUPS)).toEqual({});
  });

  it('drops unusable token entries so Mongo operators cannot reach $pull cleanup', () => {
    expect(resolveExclusiveRoutingKeys({ tokens: [{ $exists: true }, 'safe-token', null, 1, ''] }, GROUPS)).toEqual({
      tokens: ['safe-token'],
    });

    expect(
      resolveExclusiveRoutingKeys({ _passthrough: { body: { tokens: ['safe-token', { $ne: null }] } } }, GROUPS)
    ).toEqual({ tokens: ['safe-token'] });
  });

  it('keeps only the first usable key in group order within a claiming layer', () => {
    expect(resolveExclusiveRoutingKeys({ token: 'single', topic: 'orders' }, GROUPS)).toEqual({
      token: 'single',
    });

    // Legacy: topic beats tokens when both appear in the same claiming layer.
    expect(
      resolveExclusiveRoutingKeys(
        { tokens: ['t1'], topic: 'orders', _passthrough: { body: { tokens: ['a'], topic: 'news' } } },
        GROUPS
      )
    ).toEqual({ topic: 'news' });

    expect(resolveExclusiveRoutingKeys({ tokens: ['t1'], topic: 'orders' }, GROUPS)).toEqual({
      topic: 'orders',
    });
  });

  it('ignores non-routing keys at both layers', () => {
    const resolved = resolveExclusiveRoutingKeys(
      { notification: { title: 'hi' }, _passthrough: { body: { android: { priority: 'high' } } } },
      GROUPS
    );

    expect(resolved).toEqual({});
  });

  it('returns nothing for providers without exclusive key groups', () => {
    expect(resolveExclusiveRoutingKeys({ topic: 'orders' }, [])).toEqual({});
    expect(resolveExclusiveRoutingKeys(undefined, GROUPS)).toEqual({});
    expect(resolveExclusiveRoutingKeys(null, GROUPS)).toEqual({});
  });

  it('ignores a malformed _passthrough', () => {
    expect(resolveExclusiveRoutingKeys({ topic: 'orders', _passthrough: 'nope' }, GROUPS)).toEqual({
      topic: 'orders',
    });

    expect(resolveExclusiveRoutingKeys({ topic: 'orders', _passthrough: { body: 'nope' } }, GROUPS)).toEqual({
      topic: 'orders',
    });
  });
});
