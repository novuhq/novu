import { Radio } from '@mantine/core';
import { DigestUnitEnum } from '@novu/shared';
import { Controller } from 'react-hook-form';
import { useEnvController } from '../../../hooks';

const options = [
  { value: DigestUnitEnum.SECONDS, label: 'Sec' },
  { value: DigestUnitEnum.MINUTES, label: 'Min' },
  { value: DigestUnitEnum.HOURS, label: 'Hours' },
  { value: DigestUnitEnum.DAYS, label: 'Days' },
];

export const IntervalRadios = ({ control, name, showErrors, testId = 'time-unit' }) => {
  const { readonly } = useEnvController();

  return (
    <Controller
      control={control}
      name={name}
      defaultValue=""
      render={({ field, fieldState }) => {
        return (
          <Radio.Group
            spacing={16}
            error={showErrors && fieldState.error?.message}
            data-test-id={testId}
            withAsterisk
            {...field}
          >
            {options.map((option) => (
              <Radio
                styles={() => ({
                  label: {
                    paddingLeft: 8,
                  },
                })}
                key={option.value}
                data-test-id={`${testId}-${option.value}`}
                disabled={readonly}
                value={option.value}
                label={option.label}
              />
            ))}
          </Radio.Group>
        );
      }}
    />
  );
};
