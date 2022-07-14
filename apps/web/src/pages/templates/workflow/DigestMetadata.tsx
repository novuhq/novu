import { Grid, InputWrapper } from '@mantine/core';
import { DigestTypeEnum, DigestUnitEnum } from '@novu/shared';
import { Controller, useFormContext } from 'react-hook-form';
import { When } from '../../../components/utils/When';
import { Input, Select, Switch } from '../../../design-system';
import { inputStyles } from '../../../design-system/config/inputs.styles';
import { useEnvController } from '../../../store/use-env-controller';
import styled from '@emotion/styled';

const StyledSwitch = styled(Switch)`
  max-width: 100% !important;
  margin-top: 15px;
`;

export const DigestMetadata = ({ control, index }) => {
  const { readonly } = useEnvController();
  const {
    formState: { errors },
    watch,
  } = useFormContext();
  const type = watch(`steps.${index}.metadata.type`);

  return (
    <>
      <InputWrapper
        label="Time Interval"
        description="Set the time intervals for the batch"
        styles={{
          ...inputStyles,
        }}
      >
        <Grid
          sx={{
            marginBottom: '5px',
          }}
        >
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
      <div
        style={{
          marginBottom: '15px',
        }}
      >
        <Controller
          control={control}
          name={`steps.${index}.metadata.digestKey`}
          render={({ field }) => {
            return (
              <Input
                {...field}
                label="Digest Key"
                placeholder="Property key on payload"
                description="A digest key is used to batch notifications"
                error={errors?.steps ? errors.steps[index]?.metadata?.digestKey?.message : undefined}
                type="text"
                data-test-id="batch-key"
              />
            );
          }}
        />
      </div>
      <div
        style={{
          marginBottom: '15px',
        }}
      >
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
                  { value: DigestTypeEnum.REGULAR, label: 'Regular' },
                  { value: DigestTypeEnum.BACKOFF, label: 'Backoff' },
                ]}
                data-test-id="digest-type"
                {...field}
              />
            );
          }}
        />
      </div>
      <When truthy={type === 'backoff'}>
        <InputWrapper
          label="Backoff Time Interval"
          description="Set the time intervals for the backoff"
          styles={inputStyles}
        >
          <Grid
            sx={{
              marginBottom: '5px',
            }}
          >
            <Grid.Col span={4}>
              <Controller
                control={control}
                name={`steps.${index}.metadata.backoffAmount`}
                render={({ field }) => {
                  return (
                    <Input
                      {...field}
                      error={errors?.steps ? errors.steps[index]?.metadata?.backoffAmount?.message : undefined}
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
                name={`steps.${index}.metadata.backoffUnit`}
                render={({ field }) => {
                  return (
                    <Select
                      disabled={readonly}
                      error={errors?.steps ? errors.steps[index]?.metadata?.backoffUnit?.message : undefined}
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
      <When truthy={false}>
        <div
          style={{
            marginBottom: '15px',
          }}
        >
          <Controller
            control={control}
            name={`steps.${index}.metadata.updateMode`}
            render={({ field: { value, ...field } }) => {
              return (
                <StyledSwitch
                  {...field}
                  data-test-id="updateMode"
                  disabled={readonly}
                  checked={value}
                  label={`Update in app notifications`}
                />
              );
            }}
          />
        </div>
      </When>
    </>
  );
};
