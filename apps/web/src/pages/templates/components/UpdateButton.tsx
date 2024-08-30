import { Button } from '@novu/design-system';
import { useFormContext } from 'react-hook-form';
import { IForm } from './formTypes';
import { useEnvironment } from '../../../hooks';
import { useTemplateEditorForm } from './TemplateEditorFormProvider';

export const UpdateButton = () => {
  const { formState } = useFormContext<IForm>();
  const { readonly } = useEnvironment();
  const { isUpdating } = useTemplateEditorForm();

  return (
    <Button
      data-test-id="notification-template-submit-btn"
      loading={isUpdating}
      disabled={readonly || !formState.isDirty}
      submit={true}
    >
      Update
    </Button>
  );
};
