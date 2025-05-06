import { useFormContext } from 'react-hook-form';

import { FormControl, FormField, FormItem } from '@/components/primitives/form/form';
import { AvatarPicker } from '@/components/primitives/form/avatar-picker';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';

const avatarKey = 'avatar';

export const InAppAvatar = () => {
  const { control } = useFormContext();
  const { saveForm } = useSaveForm();

  return (
    <FormField
      control={control}
      name={avatarKey}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <AvatarPicker
              {...field}
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
