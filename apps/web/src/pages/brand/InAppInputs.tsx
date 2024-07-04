import { ColorInput, Select } from '@novu/design-system';
import { Control, Controller } from 'react-hook-form';
import { FONT_FAMILIES, IBrandFormValues } from './BrandingPage.const';
import { inputWrapperStyles } from './BrandingPage.styles';

type InAppInputsProps = {
  control: Control<IBrandFormValues, any>;
};

export function InAppInputs({ control }: InAppInputsProps) {
  return (
    <>
      <div className={inputWrapperStyles}>
        <Controller
          render={({ field }) => (
            <ColorInput label="In-App font color" data-test-id="font-color-picker" disallowInput={false} {...field} />
          )}
          control={control}
          name="fontColor"
        />
      </div>
      <div className={inputWrapperStyles}>
        <Controller
          render={({ field }) => (
            <Select
              label="In-App font family"
              placeholder="Select a font family"
              data={FONT_FAMILIES}
              data-test-id="font-family-selector"
              {...field}
            />
          )}
          control={control}
          name="fontFamily"
        />
      </div>
    </>
  );
}
