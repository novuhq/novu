import type { ControlValuesEntity } from '@novu/dal';
import { ControlValuesLevelEnum } from '@novu/shared';
import {
  type StepIntegrationOverrides,
  type StepProviderOverrides,
  stitchIntegrationOverridesFromDocs,
  stitchProviderOverridesFromDocs,
} from './provider-overrides';

export const STEP_OVERRIDE_CONTROL_LEVELS = [
  ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS,
  ControlValuesLevelEnum.STEP_INTEGRATION_CONTROLS,
];

export type StepOverrideDoc = Pick<ControlValuesEntity, 'level' | 'providerId' | 'integrationIdentifier' | 'controls'>;

export interface StepOverrides {
  providerOverrides?: StepProviderOverrides;
  integrationOverrides?: StepIntegrationOverrides;
}

/**
 * Docs are split by level first: the provider stitcher would otherwise read an integration doc
 * as that provider's override.
 */
export function stitchStepOverridesFromDocs(docs: StepOverrideDoc[]): StepOverrides {
  return {
    providerOverrides: stitchProviderOverridesFromDocs(
      docs.filter((doc) => doc.level === ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS)
    ),
    integrationOverrides: stitchIntegrationOverridesFromDocs(
      docs.filter((doc) => doc.level === ControlValuesLevelEnum.STEP_INTEGRATION_CONTROLS)
    ),
  };
}
