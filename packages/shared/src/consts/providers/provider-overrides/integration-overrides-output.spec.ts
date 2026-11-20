import { describe, expect, it } from 'vitest';
import { packProviderOverrideOutput, unpackProviderOverrideOutput } from './integration-overrides-output';
import { INTEGRATION_OVERRIDES_OUTPUT_KEY } from './provider-override-registry';

describe('packProviderOverrideOutput', () => {
  it('carries integration overrides inside the provider entry under the reserved key', () => {
    expect(packProviderOverrideOutput({ env: 'all' }, { 'prod-alerts': { env: 'prod' } })).toEqual({
      env: 'all',
      [INTEGRATION_OVERRIDES_OUTPUT_KEY]: { 'prod-alerts': { env: 'prod' } },
    });
  });

  it('returns the provider override untouched when there are no integration overrides', () => {
    expect(packProviderOverrideOutput({ env: 'all' }, undefined)).toEqual({ env: 'all' });
    expect(packProviderOverrideOutput({ env: 'all' }, {})).toEqual({ env: 'all' });
  });

  it('never lets the provider override supply the reserved key itself', () => {
    expect(
      packProviderOverrideOutput({ env: 'all', [INTEGRATION_OVERRIDES_OUTPUT_KEY]: { spoof: {} } }, undefined)
    ).toEqual({ env: 'all' });
  });
});

describe('unpackProviderOverrideOutput', () => {
  it('splits a provider entry into the provider override and its integration overrides', () => {
    expect(
      unpackProviderOverrideOutput({
        env: 'all',
        [INTEGRATION_OVERRIDES_OUTPUT_KEY]: { 'prod-alerts': { env: 'prod' } },
      })
    ).toEqual({
      providerOverride: { env: 'all' },
      integrationOverrides: { 'prod-alerts': { env: 'prod' } },
    });
  });

  it('drops malformed integration entries and tolerates a missing or malformed provider entry', () => {
    expect(
      unpackProviderOverrideOutput({ [INTEGRATION_OVERRIDES_OUTPUT_KEY]: { ok: { a: 1 }, bad: 'x', list: [1] } })
    ).toEqual({ providerOverride: {}, integrationOverrides: { ok: { a: 1 } } });
    expect(unpackProviderOverrideOutput(undefined)).toEqual({ providerOverride: {}, integrationOverrides: {} });
    expect(unpackProviderOverrideOutput([1, 2])).toEqual({ providerOverride: {}, integrationOverrides: {} });
    expect(unpackProviderOverrideOutput({ [INTEGRATION_OVERRIDES_OUTPUT_KEY]: 'nope' })).toEqual({
      providerOverride: {},
      integrationOverrides: {},
    });
  });

  it('round-trips with packProviderOverrideOutput', () => {
    const integrationOverrides = { a: { x: 1 }, b: { y: [1, 2] } };

    expect(unpackProviderOverrideOutput(packProviderOverrideOutput({ z: true }, integrationOverrides))).toEqual({
      providerOverride: { z: true },
      integrationOverrides,
    });
  });
});
