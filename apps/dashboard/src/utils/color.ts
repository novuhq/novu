import { ACTION_PROVIDER_CONFIGS, ActionProviderIdEnum } from '@novu/shared';
import { StepTypeEnum } from './enums';

export enum StepColorEnum {
  NEUTRAL = 'neutral',
  STABLE = 'stable',
  INFORMATION = 'information',
  FEATURE = 'feature',
  DESTRUCTIVE = 'destructive',
  VERIFIED = 'verified',
  ALERT = 'alert',
  HIGHLIGHTED = 'highlighted',
  WARNING = 'warning',
}

export const ACTION_PROVIDER_ID_TO_COLOR: Partial<Record<ActionProviderIdEnum, StepColorEnum>> = Object.fromEntries(
  Object.values(ACTION_PROVIDER_CONFIGS)
    .filter((c) => c.color)
    .map((c) => [c.id, c.color as StepColorEnum])
);

export const STEP_TYPE_TO_COLOR: Record<StepTypeEnum, StepColorEnum> = {
  [StepTypeEnum.TRIGGER]: StepColorEnum.NEUTRAL,
  [StepTypeEnum.IN_APP]: StepColorEnum.STABLE,
  [StepTypeEnum.EMAIL]: StepColorEnum.INFORMATION,
  [StepTypeEnum.CHAT]: StepColorEnum.FEATURE,
  [StepTypeEnum.SMS]: StepColorEnum.DESTRUCTIVE,
  [StepTypeEnum.PUSH]: StepColorEnum.VERIFIED,
  [StepTypeEnum.CUSTOM]: StepColorEnum.ALERT,
  [StepTypeEnum.DIGEST]: StepColorEnum.HIGHLIGHTED,
  [StepTypeEnum.DELAY]: StepColorEnum.WARNING,
  [StepTypeEnum.THROTTLE]: StepColorEnum.DESTRUCTIVE,
};
