import { Grid } from '@mantine/core';
import { DelayTypeEnum } from '@novu/shared';
import { Controller, useFormContext } from 'react-hook-form';

import { Input, SegmentedControl, inputStyles } from '@novu/design-system';
import { useEnvController } from '../../../hooks';
import { When } from '../../../components/utils/When';
import { IntervalRadios } from './IntervalRadios';
import { LabelWithTooltip } from './LabelWithTooltip';
import { StepSettings } from './SideBar/StepSettings';
import { useStepFormPath } from '../hooks/useStepFormPath';

export const DelayMetadata = () => {
  const { readonly } = useEnvController();
  const {
    control,
    formState: { errors, isSubmitted },
    watch,
    trigger,
  } = useFormContext();
  const stepFormPath = useStepFormPath();
  const type = watch(`${stepFormPath}.delayMetadata.type`);
  const showErrors = isSubmitted && errors?.steps;

  return (
    <>
      <StepSettings />
      <Controller
        control={control}
        defaultValue={DelayTypeEnum.REGULAR}
        name={`${stepFormPath}.delayMetadata.type`}
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
                await trigger(`${stepFormPath}.delayMetadata`);
              }}
              data-test-id="delay-type"
            />
          );
        }}
      />
      <When truthy={type === DelayTypeEnum.REGULAR}>
        <Grid m={0}>
          <Grid.Col span={4}>
            <Controller
              control={control}
              name={`${stepFormPath}.delayMetadata.${DelayTypeEnum.REGULAR}.amount`}
              defaultValue=""
              render={({ field, fieldState }) => {
                return (
                  <Input
                    {...field}
                    value={field.value || ''}
                    error={showErrors && fieldState.error?.message}
                    min={0}
                    max={100}
                    label={
                      <LabelWithTooltip
                        label="Time Interval"
                        tooltip="Once triggered, for how long should delay before next step execution."
                      />
                    }
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
          <Grid.Col span={8} mt={20}>
            <IntervalRadios
              control={control}
              name={`${stepFormPath}.delayMetadata.${DelayTypeEnum.REGULAR}.unit`}
              showErrors={showErrors}
            />
          </Grid.Col>
        </Grid>
      </When>

      <When truthy={type === DelayTypeEnum.SCHEDULED}>
        <Controller
          control={control}
          name={`${stepFormPath}.delayMetadata.${DelayTypeEnum.SCHEDULED}.delayPath`}
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
