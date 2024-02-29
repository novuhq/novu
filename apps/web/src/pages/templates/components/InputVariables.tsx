import { useFormContext } from 'react-hook-form';
import { useStepFormPath } from '../hooks/useStepFormPath';

export const InputVariables = () => {
  const stepFormPath = useStepFormPath();
  const { watch } = useFormContext();
  const input = watch(`${stepFormPath}.input`);

  return null;
};
