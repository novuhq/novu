import { Grid, Input as MantineInput } from '@mantine/core';
import { Controller, useFormContext } from 'react-hook-form';
import styled from '@emotion/styled';
import { DigestTypeEnum, DigestUnitEnum } from '@novu/shared';

import { When } from '../../../components/utils/When';
import { Input, Select, Switch, Button } from '../../../design-system';
import { inputStyles } from '../../../design-system/config/inputs.styles';
import { useEnvController } from '../../../hooks';

const StyledSwitch = styled(Switch)`
  max-width: 100% !important;
  margin-top: 15px;
`;

export const DigestMetadata = ({ control, index, loading, disableSubmit, setSelectedChannel }) => {
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
      <MantineInput.Wrapper
        label="Time Interval"
        description="Once triggered, for how long the digest should collect events"
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
      <div
        style={{
          marginBottom: '15px',
        }}
      >
        <Controller
          control={control}
          defaultValue={DigestTypeEnum.REGULAR}
          name={`steps.${index}.metadata.type`}
          render={({ field }) => {
            return (
              <Select
                {...field}
                label="Type of digest"
                disabled={readonly}
                data={[
                  { value: DigestTypeEnum.REGULAR, label: 'Regular' },
                  { value: DigestTypeEnum.BACKOFF, label: 'Backoff' },
                ]}
                onChange={async (value) => {
                  field.onChange(value);
                  await trigger(`steps.${index}.metadata`);
                }}
                data-test-id="digest-type"
              />
            );
          }}
        />
      </div>

      <When truthy={type === DigestTypeEnum.BACKOFF}>
        <MantineInput.Wrapper
          label="Backoff Time Interval"
          description="A digest will only be created if a message was previously sent in this time interval"
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
                      data-test-id="backoff-amount"
                      placeholder="0"
                      required
                      disabled={readonly}
                    />
                  );
                }}
              />
            </Grid.Col>
            <Grid.Col span={8}>
              <Controller
                control={control}
                name={`steps.${index}.metadata.backoffUnit`}
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
                      data-test-id="backoff-unit"
                      required
                      {...field}
                    />
                  );
                }}
              />
            </Grid.Col>
          </Grid>
        </MantineInput.Wrapper>
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
            defaultValue={false}
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
      <div
        style={{
          marginBottom: '15px',
        }}
      >
        <Controller
          control={control}
          name={`steps.${index}.metadata.digestKey`}
          defaultValue=""
          render={({ field, fieldState }) => {
            return (
              <Input
                {...field}
                value={field.value || ''}
                label="Digest Key (Optional)"
                placeholder="For example: post_id"
                description="Used to group messages using this payload key, by default only subscriberId is used"
                error={fieldState.error?.message}
                type="text"
                data-test-id="batch-key"
                disabled={readonly}
              />
            );
          }}
        />
      </div>
      <Button
        fullWidth
        mt={10}
        mb={15}
        variant="outline"
        data-test-id="delete-step-button"
        loading={loading}
        disabled={disableSubmit}
        onClick={() => setSelectedChannel(null)}
      >
        Save
      </Button>
    </>
  );
};
