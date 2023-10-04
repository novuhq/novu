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
