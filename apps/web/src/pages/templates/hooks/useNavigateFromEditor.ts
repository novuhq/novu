import { useFormContext } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { StepTypeEnum } from '@novu/shared';

import type { IForm } from '../components/formTypes';
import { useBasePath } from './useBasePath';
import { useStepIndex } from './useStepIndex';
import { useEffect } from 'react';

export const useNavigateFromEditor = () => {
  const {
    channel,
    stepUuid = '',
    variantUuid = '',
  } = useParams<{
    channel: StepTypeEnum | undefined;
    stepUuid: string;
    variantUuid: string;
  }>();
  const { watch } = useFormContext<IForm>();
  const steps = watch('steps');
  const navigate = useNavigate();
  const workflowEditorPath = useBasePath();

  const areStepsExists = steps.length > 0;
  const { stepIndex, variantIndex } = useStepIndex();
  const isStepExists = stepIndex > -1;
  const isVariantExists = typeof variantIndex !== 'undefined' && variantIndex > -1;
  const stepEditorPath = `${workflowEditorPath}/${channel}/${stepUuid}`;

  useEffect(() => {
    if (!areStepsExists) {
      return;
    }
    if (!isStepExists) {
      navigate(workflowEditorPath);
    }
    if (isStepExists && !isVariantExists) {
      navigate(stepEditorPath);
    }
  }, [navigate, areStepsExists, isStepExists, isVariantExists, workflowEditorPath, stepEditorPath]);
};
