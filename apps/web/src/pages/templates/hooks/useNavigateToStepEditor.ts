import { useNavigate, useParams } from 'react-router-dom';
import { StepTypeEnum } from '@novu/shared';

import { useBasePath } from './useBasePath';

export const useNavigateToStepEditor = () => {
  const basePath = useBasePath();
  const navigate = useNavigate();
  const { channel, stepUuid, variantUuid } = useParams<{
    channel: StepTypeEnum;
    stepUuid: string;
    variantUuid: string;
  }>();

  const navigateToStepEditor = () => {
    const isVariant = !!variantUuid;
    let navigatePath = `${basePath}/${channel}/${stepUuid}`;
    if (isVariant) {
      navigatePath += `/variants/${variantUuid}`;
    }

    navigate(navigatePath);
  };

  return {
    navigateToStepEditor,
  };
};
