import { IS_DOCKER_HOSTED } from '@novu/shared-web';
import { useFormContext } from 'react-hook-form';
import { useStepFormPath } from '../hooks/useStepFormPath';

export const InputVariables = () => {
  const stepFormPath = useStepFormPath();
  const { watch } = useFormContext();
  const input = watch(`${stepFormPath}.input`);

  if (IS_DOCKER_HOSTED) {
    return null;
  }

  try {
    const module = require('@novu/ee-billing-web');
    const InputVariablesComponent = module.InputVariables;

    return <InputVariablesComponent />;
  } catch (e) {}

  return null;
};
