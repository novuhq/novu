import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StepTypeEnum } from '@novu/shared';
import { ROUTES } from '@novu/shared-web';

import { parseUrl } from '../../../utils/routeUtils';

export const useNavigateToVariantPreview = () => {
  const {
    templateId = '',
    channel = '',
    stepUuid = '',
    variantUuid = '',
  } = useParams<{ templateId: string; channel: StepTypeEnum; stepUuid: string; variantUuid: string }>();
  const navigate = useNavigate();

  const navigateToVariantPreview = useCallback(
    (
      params: {
        templateId?: string;
        channel?: StepTypeEnum;
        stepUuid?: string;
        variantUuid?: string;
      } = {}
    ) => {
      navigate(
        parseUrl(ROUTES.WORKFLOWS_VARIANT_PREVIEW, {
          templateId: params.templateId ?? templateId,
          channel: params.channel ?? channel,
          stepUuid: params.stepUuid ?? stepUuid,
          variantUuid: params.variantUuid ?? variantUuid,
        })
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return { navigateToVariantPreview };
};
