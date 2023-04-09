import { Grid } from '@mantine/core';
import { DelayTypeEnum } from '@novu/shared';
import { Controller, useFormContext } from 'react-hook-form';

import { Input, SegmentedControl } from '../../../design-system';
import { inputStyles } from '../../../design-system/config/inputs.styles';
import { useEnvController } from '../../../hooks';
import { When } from '../../../components/utils/When';
import { IntervalRadios } from './IntervalRadios';
import { LabelWithTooltip } from './LabelWithTooltip';

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
              <SegmentedControl
                {...field}
                sx={{
                  maxWidth: '100% !important',
                }}
                fullWidth
                disabled={readonly}
                data={[
                  { value: DelayTypeEnum.REGULAR, label: 'Regular' },
                  { value: DelayTypeEnum.SCHEDULED, label: 'Scheduled' },
                ]}
                onChange={async (segmentValue) => {
                  field.onChange(segmentValue);
                  await trigger(`steps.${index}.metadata`);
                }}
                data-test-id="delay-type"
              />
            );
          }}
        />
      </div>
      <When truthy={type === DelayTypeEnum.REGULAR}>
        <LabelWithTooltip
          label="Time Interval"
          tooltip="Once triggered, for how long should delay before next step execution."
        />
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
                    styles={(theme) => ({
                      ...inputStyles(theme),
                      input: {
                        textAlign: 'center',
                        ...inputStyles(theme).input,
                      },
                    })}
                  />
                );
              }}
            />
          </Grid.Col>
          <Grid.Col span={8}>
            <IntervalRadios control={control} name={`steps.${index}.metadata.unit`} showErrors={showErrors} />
          </Grid.Col>
        </Grid>
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
                label={
                  <LabelWithTooltip
                    label="Path for scheduled date"
                    tooltip="The path in payload for the scheduled delay date"
                  />
                }
                placeholder="For example: sendAt"
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
