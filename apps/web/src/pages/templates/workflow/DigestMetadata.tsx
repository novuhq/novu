import { Grid, InputWrapper } from '@mantine/core';
import { DigestUnitEnum } from '@novu/shared';
import { Controller, useFormContext } from 'react-hook-form';
import { When } from '../../../components/utils/When';
import { Input, Select } from '../../../design-system';
import { inputStyles } from '../../../design-system/config/inputs.styles';
import { useEnvController } from '../../../store/use-env-controller';

export const DigestMetadata = ({ control, index }) => {
  const { readonly } = useEnvController();
  const {
    formState: { errors },
    watch,
  } = useFormContext();
  const type = watch(`steps.${index}.metadata.type`);

  return (
    <>
      <InputWrapper label="Time Interval" description="Set the time intervals for the batch" styles={inputStyles}>
        <Grid>
          <Grid.Col span={4}>
            <Controller
              control={control}
              name={`steps.${index}.metadata.amount`}
              render={({ field }) => {
                return (
                  <Input
                    {...field}
                    error={errors?.steps ? errors.steps[index]?.metadata?.amount?.message : undefined}
                    min={0}
                    max={100}
                    type="number"
                    data-test-id="time-amount"
                    placeholder="20"
                  />
                );
              }}
            />
          </Grid.Col>
          <Grid.Col span={8}>
            <Controller
              control={control}
              name={`steps.${index}.metadata.unit`}
              render={({ field }) => {
                return (
                  <Select
                    disabled={readonly}
                    error={errors?.steps ? errors.steps[index]?.metadata?.unit?.message : undefined}
                    placeholder="Minutes"
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
      </InputWrapper>
      <Controller
        control={control}
        name={`steps.${index}.metadata.batchkey`}
        render={({ field }) => {
          return (
            <Input
              {...field}
              label="Batch Key"
              placeholder="Property key on payload"
              description="A batch key is used to batch notifications"
              error={errors?.steps ? errors.steps[index]?.metadata?.batchkey?.message : undefined}
              type="text"
              data-test-id="batch-key"
            />
          );
        }}
      />
      <Controller
        control={control}
        defaultValue="regular"
        name={`steps.${index}.metadata.type`}
        render={({ field }) => {
          return (
            <Select
              label="Type of digest"
              disabled={readonly}
              placeholder="Regular"
              data={[
                { value: 'regular', label: 'Regular' },
                { value: 'backoff', label: 'Backoff' },
              ]}
              data-test-id="digest-type"
              {...field}
            />
          );
        }}
      />
      <When truthy={type === 'backoff'}>
        <InputWrapper
          label="Backoff Time Interval"
          description="Set the time intervals for the backoff"
          styles={inputStyles}
        >
          <Grid>
            <Grid.Col span={4}>
              <Controller
                control={control}
                name={`steps.${index}.metadata.backoffamount`}
                render={({ field }) => {
                  return (
                    <Input
                      {...field}
                      error={errors?.steps ? errors.steps[index]?.metadata?.amount?.message : undefined}
                      min={0}
                      max={100}
                      type="number"
                      data-test-id="backoff-amount"
                      placeholder="20"
                      required
                    />
                  );
                }}
              />
            </Grid.Col>
            <Grid.Col span={8}>
              <Controller
                control={control}
                name={`steps.${index}.metadata.backoffunit`}
                render={({ field }) => {
                  return (
                    <Select
                      disabled={readonly}
                      error={errors?.steps ? errors.steps[index]?.metadata?.backoffunit?.message : undefined}
                      placeholder="Minutes"
                      data={[
                        { value: DigestUnitEnum.SECONDS, label: 'Seconds' },
                        { value: DigestUnitEnum.MINUTES, label: 'Minutes' },
                        { value: DigestUnitEnum.HOURS, label: 'Hours' },
                        { value: DigestUnitEnum.DAYS, label: 'Days' },
                      ]}
                      data-test-id="backoff-unit"
                      required
                      {...field}
                    />
                  );
                }}
              />
            </Grid.Col>
          </Grid>
        </InputWrapper>
      </When>
    </>
  );
};
