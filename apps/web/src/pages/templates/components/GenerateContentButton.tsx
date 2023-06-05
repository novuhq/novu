import { Button } from '../../../design-system';
import { IForm } from './formTypes';
import { useFormContext } from 'react-hook-form';
import { useEnvController } from '../../../hooks';

export const GenerateContentButton = () => {
  const { formState } = useFormContext<IForm>();
  const { readonly } = useEnvController();

  return (
    <Button
      data-test-id="notification-template-generate-content-btn"
      disabled={readonly || !formState.isDirty}
      submit={true}
    >
      Generate Content
    </Button>
  );
};
