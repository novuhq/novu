import { type ProviderColorToken } from '@novu/shared';
import { StepTypeEnum } from './enums';

export type { ProviderColorToken };

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
  [StepTypeEnum.HTTP_REQUEST]: 'feature',
};
