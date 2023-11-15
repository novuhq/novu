import { DelayTypeEnum, StepTypeEnum } from '@novu/shared';

import { IFlowStep } from '../../../../../components/workflow/types';

export function delaySubtitle(channelType: StepTypeEnum, step: IFlowStep) {
  if (channelType === StepTypeEnum.DELAY && step.delayMetadata) {
    if (step.delayMetadata.type === DelayTypeEnum.REGULAR) {
      return `Delay all events for ${step.delayMetadata.regular?.amount} ${step.delayMetadata.regular?.unit}`;
    } else {
      return `Delay all events on the basis of ${step.delayMetadata.scheduled?.delayPath} path`;
    }
  }
}

export enum NODE_ERROR_TYPES {
  MISSING_PROVIDER = 'missing_provider',
  MISSING_PRIMARY_PROVIDER = 'missing_primary_provider',
  TEMPLATE_ERROR = 'template_error',
}
