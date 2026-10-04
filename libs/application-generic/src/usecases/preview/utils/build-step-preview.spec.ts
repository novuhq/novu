import { INTEGRATION_OVERRIDES_OUTPUT_KEY, StepTypeEnum } from '@novu/shared';
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

  it('strips the reserved integration overrides key from each provider payload', () => {
    const result = mapProvidersToPreviewOverrides({
      slack: {
        text: 'hello',
        [INTEGRATION_OVERRIDES_OUTPUT_KEY]: { 'workspace-a': { text: 'A' } },
      },
      msteams: { [INTEGRATION_OVERRIDES_OUTPUT_KEY]: { 'tenant-a': { text: 'A' } } },
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
  it('merges mapped providers onto chat and tool preview', () => {
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
  });

  it('leaves non-chat/tool preview as outputs only', () => {
    const executeOutput = {
      outputs: { body: 'hello' },
      providers: { slack: { text: 'override' } },
    };

    expect(buildStepPreview(StepTypeEnum.EMAIL, executeOutput)).toEqual({ body: 'hello' });
  });

  it.each([StepTypeEnum.CHAT, StepTypeEnum.TOOL])(
    'moves rendered integration overrides out of the provider entry on %s preview',
    (stepType) => {
      const executeOutput = {
        outputs: { body: 'hello' },
        providers: {
          'tool-webhook': {
            env: 'all',
            [INTEGRATION_OVERRIDES_OUTPUT_KEY]: {
              'prod-alerts': { alert_type: 'incident' },
              'staging-alerts': { alert_type: 'test' },
            },
          },
        },
      };

      expect(buildStepPreview(stepType, executeOutput)).toEqual({
        body: 'hello',
        providerOverrides: { 'tool-webhook': { env: 'all' } },
        integrationOverrides: {
          'tool-webhook': {
            'prod-alerts': { alert_type: 'incident' },
            'staging-alerts': { alert_type: 'test' },
          },
        },
      });
    }
  );

  it('does not add a provider override entry for a provider that only carries integration overrides', () => {
    const executeOutput = {
      outputs: { body: 'hello' },
      providers: {
        slack: {
          _passthrough: { body: true },
          [INTEGRATION_OVERRIDES_OUTPUT_KEY]: { 'workspace-a': { text: 'only for A' } },
        },
      },
    };

    expect(buildStepPreview(StepTypeEnum.CHAT, executeOutput)).toEqual({
      body: 'hello',
      integrationOverrides: { slack: { 'workspace-a': { text: 'only for A' } } },
    });
  });

  it('omits integrationOverrides when no provider carries rendered integration overrides', () => {
    const executeOutput = {
      outputs: { body: 'hello' },
      providers: {
        slack: { text: 'override', [INTEGRATION_OVERRIDES_OUTPUT_KEY]: {} },
        msteams: { text: 'teams', [INTEGRATION_OVERRIDES_OUTPUT_KEY]: 'not-a-map' },
      },
    };

    expect(buildStepPreview(StepTypeEnum.CHAT, executeOutput)).toEqual({
      body: 'hello',
      providerOverrides: { slack: { text: 'override' }, msteams: { text: 'teams' } },
    });
  });

  it('never leaks the reserved key on non-chat/tool preview', () => {
    const executeOutput = {
      outputs: { body: 'hello' },
      providers: { slack: { [INTEGRATION_OVERRIDES_OUTPUT_KEY]: { 'workspace-a': { text: 'A' } } } },
    };

    expect(buildStepPreview(StepTypeEnum.EMAIL, executeOutput)).toEqual({ body: 'hello' });
  });
});
