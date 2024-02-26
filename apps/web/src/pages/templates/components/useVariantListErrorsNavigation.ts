import { StepTypeEnum } from '@novu/shared';
import { useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useParams } from 'react-router-dom';

import { useNavigateToVariantPreview } from '../hooks/useNavigateToVariantPreview';
import { NODE_ERROR_TYPES } from '../workflow/workflow/node-types/utils';
import { IForm } from './formTypes';
import { ItemTypeEnum, useVariantListErrors } from './useVariantListErrors';

export const useVariantListErrorsNavigation = () => {
  const { channel, stepUuid = '' } = useParams<{
    channel: StepTypeEnum;
    stepUuid: string;
  }>();
  const allErrors = useVariantListErrors();
  const { watch } = useFormContext<IForm>();
  const { navigateToVariantPreview } = useNavigateToVariantPreview();

  const steps = watch('steps');
  const stepIndex = useMemo(
    () => steps.findIndex((message) => message.template.type === channel && message.uuid === stepUuid),
    [channel, stepUuid, steps]
  );
  const step = watch(`steps.${stepIndex}`);
  const hasErrors = allErrors.errors.length > 0;
  const variants = step?.variants ?? [];

  const [errorState, setErrorState] = useState<{
    itemType: ItemTypeEnum;
    variantIndex?: number;
    errorMessage: string;
    errorIndex: number;
    errorType: NODE_ERROR_TYPES;
  } | null>(null);

  useEffect(() => {
    if (allErrors.errors.length > 0) {
      const errorIndex = 0;
      const firstError = allErrors.errors[errorIndex];
      setErrorState({
        ...firstError,
        errorIndex,
      });
    } else {
      setErrorState(null);
    }
  }, [allErrors]);

  const handleErrorNavigation = (direction: 'up' | 'down') => {
    if (!errorState || !hasErrors) {
      return;
    }

    const { errorIndex } = errorState;
    const nextErrorIndex = direction === 'up' ? errorIndex - 1 : errorIndex + 1;

    if (nextErrorIndex < 0 || nextErrorIndex >= allErrors.errors.length) {
      return;
    }

    const error = allErrors.errors[nextErrorIndex];

    setErrorState({
      variantIndex: error.variantIndex,
      errorMessage: error.errorMessage,
      itemType: error.itemType,
      errorIndex: nextErrorIndex,
      errorType: error.errorType,
    });

    const isRootError = error?.itemType === ItemTypeEnum.ROOT;
    if (isRootError) {
      navigateToVariantPreview({ variantUuid: stepUuid });
    } else if (typeof error.variantIndex !== 'undefined') {
      const variant = variants[error.variantIndex];
      navigateToVariantPreview({ variantUuid: variant.uuid });
    }
  };

  const onErrorMessageClick = () => {
    if (errorState?.itemType === ItemTypeEnum.ROOT) {
      navigateToVariantPreview({ variantUuid: stepUuid });
    } else if (errorState?.variantIndex !== undefined) {
      const variant = variants[errorState.variantIndex];
      navigateToVariantPreview({ variantUuid: variant.uuid });
    }
  };

  const onErrorUp = () => handleErrorNavigation('up');

  const onErrorDown = () => handleErrorNavigation('down');

  return { allErrors, errorState, onErrorMessageClick, onErrorUp, onErrorDown };
};
