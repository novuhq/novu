import { StepTypeEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { buildStepPreview, mapProvidersToPreviewOverrides } from './build-step-preview';

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

describe('buildStepPreview', () => {
  it('merges mapped providers onto chat, tool, and push preview', () => {
    const executeOutput = {
      outputs: { body: 'hello' },
      providers: { slack: { text: 'override' } },
    };

    expect(buildStepPreview(StepTypeEnum.CHAT, executeOutput)).toEqual({
      body: 'hello',
      providerOverrides: { slack: { text: 'override' } },
    });
    expect(buildStepPreview(StepTypeEnum.TOOL, executeOutput)).toEqual({
      body: 'hello',
      providerOverrides: { slack: { text: 'override' } },
    });
    expect(buildStepPreview(StepTypeEnum.PUSH, executeOutput)).toEqual({
      body: 'hello',
      providerOverrides: { slack: { text: 'override' } },
    });
  });

  it('leaves channels without content overrides as outputs only', () => {
    const executeOutput = {
      outputs: { body: 'hello' },
      providers: { slack: { text: 'override' } },
    };

    expect(buildStepPreview(StepTypeEnum.EMAIL, executeOutput)).toEqual({ body: 'hello' });
  });
});
