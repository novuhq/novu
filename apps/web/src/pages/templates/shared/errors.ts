import { FieldErrors } from 'react-hook-form';
import { IForm } from '../components/formTypes';

export function getExplicitErrors(errors: FieldErrors<IForm>, mode: 'settings' | 'steps' | 'all' = 'all'): string {
  const errorsArray: string[] = [];
  if (['settings', 'all'].includes(mode)) {
    errorsArray.push(...getSettingsErrors(errors));
  }
  if (['steps', 'all'].includes(mode) && errors?.steps) {
    const errorIndexes = Object.keys(errors?.steps);
    errorIndexes.forEach((index) => {
      errorsArray.push(...getStepErrors(index, errors.steps));
      const variantErrors = getVariantErrors(index, errors.steps)?.map((err) => err.errorMsg);
      if (variantErrors?.length) {
        errorsArray.push(...variantErrors);
      }
    });
  }

  return formatErrorMessage(errorsArray);
}

export function getSettingsErrors(errors) {
  const errorsArray: string[] = [];
  if (errors?.name) {
    errorsArray.push(errors.name?.message);
  }
  if (errors?.notificationGroupId) {
    errorsArray.push(errors.notificationGroupId?.message);
  }

  return errorsArray;
}

function findMessages(obj: object): string[] {
  let messages: string[] = [];

  for (const key in obj) {
    const value = obj[key];

    if (typeof value === 'object' && value !== null) {
      messages = messages.concat(findMessages(value));
    } else if (key === 'message' && typeof value === 'string') {
      messages.push(value);
    }
  }

  return messages;
}

export function getStepErrors(index: number | string, stepsErrors?: FieldErrors<IForm>['steps']): string[] {
  if (stepsErrors) {
    const stepErrors = stepsErrors[index]?.template;

    if (stepErrors) {
      return mapStepErrors(stepErrors);
    }

    const digestMetadataErrors = stepsErrors[index]?.digestMetadata;
    if (digestMetadataErrors) {
      return findMessages(digestMetadataErrors);
    }

    const delayMetadataErrors = stepsErrors[index]?.delayMetadata;

    if (delayMetadataErrors) {
      return findMessages(delayMetadataErrors);
    }
  }

  return [];
}

export function mapStepErrors(stepErrors) {
  if (stepErrors) {
    const keys = Object.keys(stepErrors);

    return keys.map((key) => stepErrors[key]?.message);
  }

  return [];
}

export function getVariantErrors(
  stepIndex: number | string,
  stepsErrors?: FieldErrors<IForm>['steps']
): undefined | { errorMsg: string; variantIndex: number }[] {
  if (stepsErrors) {
    const variantsErrors = stepsErrors[stepIndex]?.variants?.reduce((acc, variant, variantIndex) => {
      const variantErrors = variant?.template;
      if (variantErrors) {
        const keys = Object.keys(variantErrors);

        const errorMsg = keys.map((key) => variantErrors[key]?.message);

        acc.push(...errorMsg.map((msg) => ({ errorMsg: msg, variantIndex })));
      }

      return acc;
    }, []);

    return variantsErrors;
  }

  return [];
}

export function getFormattedStepErrors(index: number, errors?: FieldErrors<IForm>): string {
  return formatErrorMessage(getStepErrors(index, errors?.steps));
}

export function formatErrorMessage(errorsArray: string[]): string {
  const uniqueErrors = Array.from(new Set(errorsArray));
  if (uniqueErrors.length > 1) {
    const combinedErrors = uniqueErrors.map((errMessage) => errMessage.replace(/(Message)|(is missing!)/g, ''));

    return combinedErrors.length ? 'Message ' + combinedErrors.join(' and ') + 'are missing!' : '';
  }

  return uniqueErrors.join('');
}

export function hasGroupError(stepIndex: number, errors?: FieldErrors<IForm>): boolean {
  const stepErrors = getStepErrors(stepIndex, errors?.steps);
  const variantErrors = getVariantErrors(stepIndex, errors?.steps);

  return stepErrors?.length > 0 || (!!variantErrors && variantErrors?.length > 0);
}
