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
      errorsArray.push(...getStepErrors(index, errors));
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

export function getStepErrors(index: number | string, errors?: FieldErrors<IForm>): string[] {
  if (errors?.steps) {
    const stepErrors = errors.steps[index]?.template;

    if (stepErrors) {
      const keys = Object.keys(stepErrors);

      return keys.map((key) => stepErrors[key]?.message);
    }

    const digestMetadataErrors = errors.steps[index]?.digestMetadata;
    if (digestMetadataErrors) {
      return findMessages(digestMetadataErrors);
    }

    const delayMetadataErrors = errors.steps[index]?.delayMetadata;

    if (delayMetadataErrors) {
      return findMessages(delayMetadataErrors);
    }
  }

  return [];
}

export function getFormattedStepErrors(index: number, errors?: FieldErrors<IForm>): string {
  return formatErrorMessage(getStepErrors(index, errors));
}

export function formatErrorMessage(errorsArray: string[]): string {
  const uniqueErrors = Array.from(new Set(errorsArray));
  if (uniqueErrors.length > 1) {
    const combinedErrors = uniqueErrors.map((errMessage) => errMessage.replace(/(Message)|(is missing!)/g, ''));

    return combinedErrors.length ? 'Message ' + combinedErrors.join(' and ') + 'are missing!' : '';
  }

  return uniqueErrors.join('');
}
