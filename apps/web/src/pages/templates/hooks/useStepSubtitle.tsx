import { StepTypeEnum } from '@novu/shared';
import { useMemo } from 'react';

import { IFlowStep } from '../../../components/workflow/types';
import { WillBeSentHeader } from '../workflow/digest/WillBeSentHeader';
import { delaySubtitle } from '../workflow/workflow/node-types/utils';

export const useStepSubtitle = ({
  path,
  step,
  channelType,
}: {
  path: string;
  step?: IFlowStep;
  channelType?: StepTypeEnum;
}) => {
  return useMemo(() => {
    if (!step) {
      return undefined;
    }

    const content = step.template?.content;
    if (StepTypeEnum.DELAY === channelType) {
      return delaySubtitle(channelType, step);
    }
    if (StepTypeEnum.DIGEST === channelType) {
      return <WillBeSentHeader isHighlight={false} path={path} />;
    }

    if (typeof content === 'string') {
      return content;
    }

    if (channelType === StepTypeEnum.EMAIL) {
      if (content && content?.length > 0) {
        return content?.find((item) => item.type === 'text')?.content;
      }
      if (step.template?.htmlContent) {
        return step.template.htmlContent;
      }
    }

    return undefined;
  }, [channelType, step, path]);
};
