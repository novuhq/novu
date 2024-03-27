import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { StepTypeEnum, STEP_TYPE_TO_CHANNEL_TYPE } from '@novu/shared';

import { getStepErrors, getVariantErrors } from '../shared/errors';
import { NODE_ERROR_TYPES } from '../workflow/workflow/node-types/utils';
import { IForm } from './formTypes';
import { useGetPrimaryIntegration, useHasActiveIntegrations } from '../../../hooks';
import { useStepIndex } from '../hooks/useStepIndex';

export enum ItemTypeEnum {
  ROOT = 'root',
  VARIANT = 'variant',
}

interface ErrorType {
  itemType: ItemTypeEnum;
  variantIndex?: number;
  errorMessage: string;
  errorType: NODE_ERROR_TYPES;
}

export const useVariantListErrors = () => {
  const { channel } = useParams<{
    channel: StepTypeEnum;
    stepUuid: string;
  }>();
  const {
    formState: {
      errors: { steps },
    },
  } = useFormContext<IForm>();
  const { stepIndex } = useStepIndex();

  const { hasActiveIntegration } = useHasActiveIntegrations({
    filterByEnv: true,
    channelType: STEP_TYPE_TO_CHANNEL_TYPE.get(channel ?? ''),
  });
  const { primaryIntegration, isPrimaryStep } = useGetPrimaryIntegration({
    filterByEnv: true,
    channelType: STEP_TYPE_TO_CHANNEL_TYPE.get(channel ?? ''),
  });

  const missingProviderError = useMemo(() => {
    if (!hasActiveIntegration && channel) {
      return { errorMessage: `Provider is missing!`, errorType: NODE_ERROR_TYPES.MISSING_PROVIDER };
    }

    if (isPrimaryStep && !primaryIntegration) {
      return { errorMessage: `Primary provider is missing!`, errorType: NODE_ERROR_TYPES.MISSING_PRIMARY_PROVIDER };
    }

    return null;
  }, [hasActiveIntegration, channel, isPrimaryStep, primaryIntegration]);

  return useMemo(() => {
    const result: {
      errors: ErrorType[];
      errorsMap: Record<string, string>;
    } = {
      errors: [],
      errorsMap: {},
    };

    // we have to reverse errors because the variants order in the list is reversed too
    const variantErrors = getVariantErrors(stepIndex, steps)?.reverse();
    if (variantErrors && variantErrors.length > 0) {
      variantErrors.forEach((error) => {
        result.errors.push({
          itemType: ItemTypeEnum.VARIANT,
          variantIndex: error.variantIndex,
          errorMessage: error.errorMsg,
          errorType: NODE_ERROR_TYPES.TEMPLATE_ERROR,
        });
        if (!result.errorsMap[`variant-${error.variantIndex}`]) {
          result.errorsMap[`variant-${error.variantIndex}`] = error.errorMsg;
        }
      });
    }

    if (missingProviderError) {
      result.errors.push({
        itemType: ItemTypeEnum.ROOT,
        errorMessage: missingProviderError.errorMessage,
        errorType: missingProviderError.errorType,
      });
      result.errorsMap.root = missingProviderError.errorMessage;
    }

    const rootStepErrors = getStepErrors(stepIndex, steps).reverse();
    if (rootStepErrors) {
      rootStepErrors.forEach((error) => {
        result.errors.push({
          itemType: ItemTypeEnum.ROOT,
          errorMessage: error,
          errorType: NODE_ERROR_TYPES.TEMPLATE_ERROR,
        });
        if (!result.errorsMap.root) {
          result.errorsMap.root = error;
        }
      });
    }

    return result;
  }, [missingProviderError, stepIndex, steps]);
};
