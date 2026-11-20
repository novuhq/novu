import type { ControlValuesEntity } from '@novu/dal';
import { ControlValuesLevelEnum } from '@novu/shared';
import {
  type StepIntegrationOverrides,
  type StepProviderOverrides,
  stitchIntegrationOverridesFromDocs,
  stitchProviderOverridesFromDocs,
} from './provider-overrides';

export type StepOverrideLevel =
  | ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS
  | ControlValuesLevelEnum.STEP_INTEGRATION_CONTROLS;

export const STEP_OVERRIDE_CONTROL_LEVELS: ControlValuesLevelEnum[] = [
  ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS,
  ControlValuesLevelEnum.STEP_INTEGRATION_CONTROLS,
];

/** Every control-values level owned by a step; deleting a step's controls must cover all of them. */
export const STEP_CONTROL_LEVELS: ControlValuesLevelEnum[] = [
  ControlValuesLevelEnum.STEP_CONTROLS,
  ...STEP_OVERRIDE_CONTROL_LEVELS,
];

export type StepOverrideDoc = Pick<ControlValuesEntity, 'level' | 'providerId' | 'integrationIdentifier' | 'controls'>;

export interface StepOverrides {
  providerOverrides?: StepProviderOverrides;
  integrationOverrides?: StepIntegrationOverrides;
}

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
