import { ColorInput } from '@novu/design-system';
import { Control, Controller, UseFormSetValue } from 'react-hook-form';
import { Stack } from '../../../../styled-system/jsx';
import { IBrandFormValues } from './BrandingPage.const';
import { inputWrapperStyles, Text } from './BrandingPage.styles';
import { BrandLogoUpload } from './BrandLogoUpload';

type BrandInputsProps = {
  setValue: UseFormSetValue<IBrandFormValues>;
  control: Control<IBrandFormValues, any>;
};

export function BrandInputs({ control, setValue }: BrandInputsProps) {
  return (
    <>
      <Stack gap="75">
        <Text variant="strong">Brand logo</Text>
        <Controller
          render={({ field }) => <BrandLogoUpload field={field} setValue={setValue} />}
          control={control}
          name="logo"
        />
      </Stack>

      <div className={inputWrapperStyles}>
        <Controller
          render={({ field }) => (
            <ColorInput label="Brand color" data-test-id="brand-color-picker" disallowInput={false} {...field} />
          )}
          control={control}
          name="color"
        />
      </div>
    </>
  );
}
