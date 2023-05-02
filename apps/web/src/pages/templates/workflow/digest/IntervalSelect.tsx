import { DigestUnitEnum } from '@novu/shared';
import { Controller } from 'react-hook-form';
import { Select } from '../../../../design-system';
import { inputStyles } from '../../../../design-system/config/inputs.styles';
import { useEnvController } from '../../../../hooks';

const options = [
  { value: DigestUnitEnum.SECONDS, label: 'sec (s)' },
  { value: DigestUnitEnum.MINUTES, label: 'min (s)' },
  { value: DigestUnitEnum.HOURS, label: 'hour (s)' },
  { value: DigestUnitEnum.DAYS, label: 'day (s)' },
];

export const IntervalSelect = ({ control, name, showErrors }) => {
  const { readonly } = useEnvController();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        return (
          <Select
            rightSectionWidth={20}
            disabled={readonly}
            data={options}
            error={showErrors && fieldState.error?.message}
            inputProps={{
              styles: (theme) => ({
                ...inputStyles,
                input: {
                  ...inputStyles(theme).input,
                  margin: 0,
                  minHeight: '30px',
                  height: 30,
                  lineHeight: '32px',
                },
              }),
            }}
            {...field}
          />
        );
      }}
    />
  );
};
