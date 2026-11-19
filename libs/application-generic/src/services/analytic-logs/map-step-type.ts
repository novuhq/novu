import { StepTypeEnum } from '@novu/shared';
import { StepType } from './types';

export function mapStepTypeEnumToStepType(stepType: StepTypeEnum | undefined): StepType | null {
  if (stepType === undefined) {
    return null;
  }

  switch (stepType) {
    case StepTypeEnum.EMAIL:
      return 'email';
    case StepTypeEnum.SMS:
      return 'sms';
    case StepTypeEnum.IN_APP:
      return 'in_app';
    case StepTypeEnum.PUSH:
      return 'push';
    case StepTypeEnum.CHAT:
      return 'chat';
    case StepTypeEnum.TOOL:
      return 'tool';
    case StepTypeEnum.DIGEST:
      return 'digest';
    case StepTypeEnum.THROTTLE:
      return 'throttle';
    case StepTypeEnum.TRIGGER:
      return 'trigger';
    case StepTypeEnum.DELAY:
      return 'delay';
    case StepTypeEnum.CUSTOM:
      return 'custom';
    case StepTypeEnum.HTTP_REQUEST:
      return 'http_request';
    default: {
      const _exhaustiveCheck: never = stepType;

      return _exhaustiveCheck;
    }
  }
}
