import { IS_DOCKER_HOSTED } from '@novu/shared-web';
import { useFormContext } from 'react-hook-form';
import { useStepFormPath } from '../hooks/useStepFormPath';

export const InputVariables = ({
  onSubmit = () => {},
  onChange = () => {},
}: {
  onSubmit?: (values: any, e: any) => void;
  onChange?: (values: any, e: any) => void;
}) => {
  const stepFormPath = useStepFormPath();
  const { watch } = useFormContext();
  const inputs = watch(`${stepFormPath}.template.inputs.schema`) || {};

  if (IS_DOCKER_HOSTED) {
    return null;
  }

  try {
    const module = require('@novu/ee-echo-web');
    const InputVariablesComponent = module.InputVariables;

    return <InputVariablesComponent schema={inputs} onSubmit={onSubmit} onChange={onChange} />;
  } catch (e) {
    throw e;
  }
};
