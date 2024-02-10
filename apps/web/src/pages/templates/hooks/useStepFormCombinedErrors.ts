import { formatErrorMessage, mapStepErrors } from '../shared/errors';
import { useStepFormErrors } from './useStepFormErrors';

export const useStepFormCombinedErrors = () => {
  const error = useStepFormErrors();

  if (!error || !error?.template) {
    return '';
  }

  const stepErrorsArray = error?.template;

  const formattedError = mapStepErrors(stepErrorsArray);
  const combinedError = formatErrorMessage(formattedError);

  return combinedError;
};
