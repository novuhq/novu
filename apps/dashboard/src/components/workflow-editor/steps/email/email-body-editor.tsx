import { FormField } from '@/components/primitives/form/form';
import { useFormContext } from 'react-hook-form';
import { Maily } from './maily';

export const EmailBodyEditor = () => {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name="body"
      render={({ field }) => {
        return <Maily value={field.value} onChange={field.onChange} />;
      }}
    />
  );
};
