import { Button } from '@novu/design-system';
import { IForm } from './formTypes';
import { useFormContext } from 'react-hook-form';
import { useEnvController } from '../../../hooks';
import { useState, useEffect } from 'react';
import { ClipLoader } from 'react-spinners';

export const UpdateButton = () => {
  const { formState } = useFormContext<IForm>();
  const { readonly } = useEnvController();
  /**
   * 'isUpdating' state is used to show workflows update loading state when user presses 'Update' button.
   * SPINNER_COLOR is for to set color for spinner loader.
   * Type of spinner loader is 'ClipLoader'
   */
  const [isUpdating, setIsUpdating] = useState(false);
  const SPINNER_COLOR = '#3498db';

  /*When user presses Update button spinner loader will appear*/
  const handleUpdate = () => {
    setIsUpdating(true);
  };

  /*After user updates spinner loader is disabled*/
  useEffect(() => {
    if (formState.isDirty === false) {
      setIsUpdating(false);
    }
  }, [formState.isDirty]);

  return (
    <Button
      data-test-id="notification-template-submit-btn"
      onClick={handleUpdate}
      disabled={readonly || !formState.isDirty}
      submit={true}
    >
      Update
      <ClipLoader color={SPINNER_COLOR} loading={isUpdating} />
    </Button>
  );
};
