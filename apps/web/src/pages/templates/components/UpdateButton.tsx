import { Button, Tooltip } from '../../../design-system';
import { IForm } from './formTypes';
import { useFormContext } from 'react-hook-form';

export const UpdateButton = () => {
  const {
    formState: { isDirty, isValid },
  } = useFormContext<IForm>();

  return (
    <Tooltip label={!isValid ? 'Your workflow is not valid' : !isDirty ? 'Workflow saved' : 'Save workflow'}>
      <div>
        <Button data-test-id="notification-template-submit-btn" disabled={!isDirty || !isValid} submit={true}>
          Update
        </Button>
      </div>
    </Tooltip>
  );
};
