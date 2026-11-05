import { describe, expect, it } from 'vitest';
import { restoreBirdOpaqueKeys, splitBirdBridgeData } from './bird-bridge-data';

describe('splitBirdBridgeData', () => {
  it('separates user-cased keys from known provider keys', () => {
    const { known, opaque } = splitBirdBridgeData({
      category: 'transactional',
      template: { slug: 'welcome', parameters: { firstName: 'Ada' } },
      headers: { 'X-Custom': 'abc' },
    });

    expect(known).toEqual({ category: 'transactional' });
    expect(opaque).toEqual({
      template: { slug: 'welcome', parameters: { firstName: 'Ada' } },
      headers: { 'X-Custom': 'abc' },
    });
  });

  it('keeps _passthrough on the known side so unknown overrides still apply', () => {
    const { known } = splitBirdBridgeData({
      category: 'marketing',
      _passthrough: { body: { subject: 'Overridden' } },
    });

    expect(known).toEqual({ category: 'marketing', _passthrough: { body: { subject: 'Overridden' } } });
  });

  it('gives passthrough opaque values priority over direct bridge values', () => {
    const { opaque } = splitBirdBridgeData({
      template: { slug: 'direct' },
      headers: { 'X-Direct': 'direct', 'X-Shared': 'direct' },
      _passthrough: {
        body: {
          template: { slug: 'passthrough' },
          headers: { 'X-Passthrough': 'passthrough', 'X-Shared': 'passthrough' },
        },
      },
    });

    expect(opaque).toEqual({
      template: { slug: 'passthrough' },
      headers: {
        'X-Direct': 'direct',
        'X-Passthrough': 'passthrough',
        'X-Shared': 'passthrough',
      },
    });
  });
});

describe('restoreBirdOpaqueKeys', () => {
  it('restores opaque values with bridge priority and merges headers per key', () => {
    const body: Record<string, unknown> = {
      headers: { 'X-Base': 'base', 'X-Custom': 'old' },
    };

    restoreBirdOpaqueKeys(body, {
      template: { slug: 'welcome' },
      parameters: { firstName: 'Ada' },
      metadata: { orderId: 'ord_1' },
      headers: { 'X-Custom': 'new' },
    });

    expect(body.template).toEqual({ slug: 'welcome' });
    expect(body.parameters).toEqual({ firstName: 'Ada' });
    expect(body.metadata).toEqual({ orderId: 'ord_1' });
    expect(body.headers).toEqual({ 'X-Base': 'base', 'X-Custom': 'new' });
  });

  it('leaves the body untouched when there is nothing opaque', () => {
    const body: Record<string, unknown> = { to: ['to@acme.com'] };

    restoreBirdOpaqueKeys(body, {});

    expect(body).toEqual({ to: ['to@acme.com'] });
  });
});
