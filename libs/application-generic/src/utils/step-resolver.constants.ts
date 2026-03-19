import { StepTypeEnum } from '@novu/shared';

export const SUPPORTED_STEP_RESOLVER_TYPES = new Set<StepTypeEnum>([
  StepTypeEnum.EMAIL,
  StepTypeEnum.SMS,
  StepTypeEnum.CHAT,
  StepTypeEnum.PUSH,
  StepTypeEnum.IN_APP,
]);
