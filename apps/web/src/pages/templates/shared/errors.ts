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

export function getStepErrors(index: number | string, errors: FieldErrors<IForm>): string[] {
  if (errors?.steps) {
    const stepErrors = errors.steps[index]?.template;

    if (stepErrors) {
      const keys = Object.keys(stepErrors);

      return keys.map((key) => stepErrors[key]?.message);
    }
    const actionErrors = errors.steps[index]?.metadata;

    if (actionErrors) {
      const keys = Object.keys(actionErrors);

      return keys.map((key) => actionErrors[key]?.message);
    }

    const nameError = errors.steps[index]?.name;

    if (nameError) {
      return [nameError?.message];
    }
  }

  return [];
}

export function getFormattedStepErrors(index: number, errors: FieldErrors<IForm>): string {
  return formatErrorMessage(getStepErrors(index, errors));
}

export function formatErrorMessage(errorsArray: string[]): string {
  const uniqueErrors = Array.from(new Set(errorsArray));
  const arr1 = uniqueErrors.map((errMessage) => errMessage.replace('Required - ', ''));

  return arr1.length ? 'Required - ' + arr1.join(', ') : '';
}
