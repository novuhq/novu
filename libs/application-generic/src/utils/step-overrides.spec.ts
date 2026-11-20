import { ControlValuesLevelEnum, ToolProviderIdEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { stitchStepOverridesFromDocs } from './step-overrides';

describe('stitchStepOverridesFromDocs', () => {
  it('stitches each override layer only from docs of its own level', () => {
    const stitched = stitchStepOverridesFromDocs([
      {
        level: ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS,
        providerId: ToolProviderIdEnum.Webhook,
        controls: { env: 'all' },
      },
      {
        level: ControlValuesLevelEnum.STEP_INTEGRATION_CONTROLS,
        providerId: ToolProviderIdEnum.Webhook,
        integrationIdentifier: 'prod-alerts',
        controls: { alert_type: 'incident' },
      },
      {
        level: ControlValuesLevelEnum.STEP_CONTROLS,
        providerId: ToolProviderIdEnum.PagerDuty,
        integrationIdentifier: 'pd-main',
        controls: { body: 'main controls' },
      },
    ]);

    expect(stitched).toEqual({
      providerOverrides: { [ToolProviderIdEnum.Webhook]: { env: 'all' } },
      integrationOverrides: { [ToolProviderIdEnum.Webhook]: { 'prod-alerts': { alert_type: 'incident' } } },
    });
  });

  it('leaves both layers undefined when there are no override docs', () => {
    expect(stitchStepOverridesFromDocs([])).toEqual({
      providerOverrides: undefined,
      integrationOverrides: undefined,
    });
  });
});
