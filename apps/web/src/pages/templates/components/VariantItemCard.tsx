import { StepTypeEnum } from '@novu/shared';
import { useNavigate, useParams } from 'react-router-dom';

import { stepIcon } from '../constants';
import { useBasePath } from '../hooks/useBasePath';
import { useStepSubtitle } from '../hooks/useStepSubtitle';
import { WorkflowNode } from '../workflow/workflow/node-types/WorkflowNode';

export const VariantItemCard = ({ variant }) => {
  const { channel, stepUuid = '' } = useParams<{
    channel: StepTypeEnum;
    stepUuid: string;
  }>();
  const subtitle = useStepSubtitle(variant, channel);
  const navigate = useNavigate();
  const basePath = useBasePath();

  const Icon = stepIcon[channel ?? ''];

  return (
    <div
      key={variant._id}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        navigate(basePath + `/${channel}/${stepUuid}/variants/${variant.uuid}`);
      }}
    >
      <WorkflowNode Icon={Icon} label={variant.name} subtitle={subtitle} channelType={variant.type} />
    </div>
  );
};
