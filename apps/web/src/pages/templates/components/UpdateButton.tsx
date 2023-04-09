import { Button, Tooltip } from '../../../design-system';
import { IForm } from './formTypes';
import { useFormContext } from 'react-hook-form';

export const UpdateButton = () => {
  const { formState } = useFormContext<IForm>();

  return (
    <Tooltip
      label={
        !formState.isValid ? 'Your workflow is not valid' : !formState.isDirty ? 'Workflow saved' : 'Save workflow'
      }
    >
      <div>
        <Button
          data-test-id="notification-template-submit-btn"
          disabled={!formState.isDirty || !formState.isValid}
          submit={true}
        >
          Update
        </Button>
      </div>
    </Tooltip>
  );
};
