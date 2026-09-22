import { useFormContext } from 'react-hook-form';
import { AvatarPicker } from '@/components/primitives/form/avatar-picker';
import { FormControl, FormField, FormItem } from '@/components/primitives/form/form';
import { useStepEditor } from '@/components/workflow-editor/steps/context/step-editor-context';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';

const avatarKey = 'avatar';

export const InAppAvatar = () => {
  const { control } = useFormContext();
  const { saveForm } = useSaveForm();
  const { isReadOnly } = useStepEditor();

  return (
    <FormField
      control={control}
      name={avatarKey}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <AvatarPicker
              {...field}
              readOnly={isReadOnly}
              onPick={(value) => {
                field.onChange(value);
                saveForm();
              }}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
};
