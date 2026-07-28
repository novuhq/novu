import { describe, expect, it } from 'vitest';
import { mapProvidersToPreviewOverrides } from './map-providers-to-preview-overrides';

describe('mapProvidersToPreviewOverrides', () => {
  it('maps non-empty provider payloads', () => {
    const result = mapProvidersToPreviewOverrides({
      slack: { text: 'hello' },
      msteams: { body: 'world' },
    });

    expect(result).toEqual({
      slack: { text: 'hello' },
      msteams: { body: 'world' },
    });
  });

  it('drops empty object entries', () => {
    const result = mapProvidersToPreviewOverrides({
      slack: { text: 'hello' },
      msteams: {},
    });

    expect(result).toEqual({
      slack: { text: 'hello' },
    });
  });

  it('strips _passthrough from each provider payload', () => {
    const result = mapProvidersToPreviewOverrides({
      slack: {
        text: 'hello',
        _passthrough: { body: true },
      },
    });

    expect(result).toEqual({
      slack: { text: 'hello' },
    });
  });

  it('returns undefined when all entries are empty or input is undefined', () => {
    expect(mapProvidersToPreviewOverrides(undefined)).toBeUndefined();
    expect(mapProvidersToPreviewOverrides({})).toBeUndefined();
    expect(mapProvidersToPreviewOverrides({ slack: {} })).toBeUndefined();
    expect(
      mapProvidersToPreviewOverrides({
        slack: { _passthrough: { body: true } },
      })
    ).toBeUndefined();
  });
});
