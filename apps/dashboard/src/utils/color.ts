import { ACTION_PROVIDER_CONFIGS, ActionProviderIdEnum, type ProviderColorToken } from '@novu/shared';
import { StepTypeEnum } from './enums';

export type { ProviderColorToken };

export const ACTION_PROVIDER_ID_TO_COLOR: Partial<Record<ActionProviderIdEnum, ProviderColorToken>> =
  Object.fromEntries(
    Object.values(ACTION_PROVIDER_CONFIGS)
      .filter((c) => c.color)
      .map((c) => [c.id, c.color])
  );

export const STEP_TYPE_TO_COLOR: Record<StepTypeEnum, ProviderColorToken> = {
  [StepTypeEnum.TRIGGER]: 'neutral',
  [StepTypeEnum.IN_APP]: 'stable',
  [StepTypeEnum.EMAIL]: 'information',
  [StepTypeEnum.CHAT]: 'feature',
  [StepTypeEnum.SMS]: 'destructive',
  [StepTypeEnum.PUSH]: 'verified',
  [StepTypeEnum.CUSTOM]: 'alert',
  [StepTypeEnum.DIGEST]: 'highlighted',
  [StepTypeEnum.DELAY]: 'warning',
  [StepTypeEnum.THROTTLE]: 'destructive',
};
