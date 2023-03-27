import { Grid, Input as MantineInput } from '@mantine/core';
import { DigestUnitEnum, DelayTypeEnum } from '@novu/shared';
import { Controller, useFormContext } from 'react-hook-form';

import { Input, Select } from '../../../design-system';
import { inputStyles } from '../../../design-system/config/inputs.styles';
import { useEnvController } from '../../../hooks';
import { When } from '../../../components/utils/When';

export const DelayMetadata = ({ control, index }) => {
  const { readonly } = useEnvController();
  const {
    formState: { errors, isSubmitted },
    watch,
    trigger,
  } = useFormContext();
  const type = watch(`steps.${index}.metadata.type`);
  const showErrors = isSubmitted && errors?.steps;

  return (
    <>
      <div
        style={{
          marginBottom: '15px',
        }}
      >
        <Controller
          control={control}
          defaultValue={DelayTypeEnum.REGULAR}
          name={`steps.${index}.metadata.type`}
          render={({ field }) => {
            return (
              <Select
                {...field}
                label="Delay Type"
                disabled={readonly}
                data={[
                  { value: DelayTypeEnum.REGULAR, label: 'Regular' },
                  { value: DelayTypeEnum.SCHEDULED, label: 'Scheduled' },
                ]}
                data-test-id="delay-type"
                onChange={async (value) => {
                  field.onChange(value);
                  await trigger(`steps.${index}.metadata`);
                }}
              />
            );
          }}
        />
      </div>
      <When truthy={type === DelayTypeEnum.REGULAR}>
        <MantineInput.Wrapper
          label="Time Interval"
          description="Once triggered, for how long should delay before next step execution."
          styles={inputStyles}
        >
          <Grid
            sx={{
              marginBottom: '2px',
            }}
          >
            <Grid.Col span={4}>
              <Controller
                control={control}
                name={`steps.${index}.metadata.amount`}
                defaultValue=""
                render={({ field, fieldState }) => {
                  return (
                    <Input
                      {...field}
                      value={field.value || ''}
                      error={showErrors && fieldState.error?.message}
                      min={0}
                      max={100}
                      type="number"
                      data-test-id="time-amount"
                      placeholder="0"
                      disabled={readonly}
                    />
                  );
                }}
              />
            </Grid.Col>
            <Grid.Col span={8}>
              <Controller
                control={control}
                name={`steps.${index}.metadata.unit`}
                defaultValue=""
                render={({ field, fieldState }) => {
                  return (
                    <Select
                      disabled={readonly}
                      error={showErrors && fieldState.error?.message}
                      placeholder="Interval"
                      data={[
                        { value: DigestUnitEnum.SECONDS, label: 'Seconds' },
                        { value: DigestUnitEnum.MINUTES, label: 'Minutes' },
                        { value: DigestUnitEnum.HOURS, label: 'Hours' },
                        { value: DigestUnitEnum.DAYS, label: 'Days' },
                      ]}
                      data-test-id="time-unit"
                      {...field}
                    />
                  );
                }}
              />
            </Grid.Col>
          </Grid>
        </MantineInput.Wrapper>
      </When>

      <When truthy={type === DelayTypeEnum.SCHEDULED}>
        <Controller
          control={control}
          name={`steps.${index}.metadata.delayPath`}
          defaultValue=""
          render={({ field, fieldState }) => {
            return (
              <Input
                {...field}
                value={field.value || ''}
                disabled={readonly}
                label="Path for scheduled date"
                placeholder="For example: sendAt"
                description="The path in payload for the scheduled delay date"
                error={showErrors && fieldState.error?.message}
                type="text"
                data-test-id="batch-key"
              />
            );
          }}
        />
      </When>
    </>
  );
};
