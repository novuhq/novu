import { Grid, InputWrapper } from '@mantine/core';
import { DigestTypeEnum, DigestUnitEnum } from '@novu/shared';
import { Controller, useFormContext } from 'react-hook-form';
import { When } from '../../../components/utils/When';
import { Input, Select, Switch, Button } from '../../../design-system';
import { inputStyles } from '../../../design-system/config/inputs.styles';
import { useEnvController } from '../../../store/use-env-controller';
import styled from '@emotion/styled';

const StyledSwitch = styled(Switch)`
  max-width: 100% !important;
  margin-top: 15px;
`;

export const DigestMetadata = ({ control, index, loading, disableSubmit, setSelectedChannel }) => {
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
              render={({ field, fieldState }) => {
                return (
                  <Input
                    {...field}
                    value={field.value || ''}
                    error={fieldState.error?.message}
                    min={0}
                    max={100}
                    type="number"
                    data-test-id="time-amount"
                    placeholder="0"
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
      </InputWrapper>
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
                label="Type of digest"
                disabled={readonly}
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

      <When truthy={type === DigestTypeEnum.BACKOFF}>
        <InputWrapper
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
                render={({ field, fieldState }) => {
                  return (
                    <Input
                      {...field}
                      value={field.value || ''}
                      error={fieldState.error?.message}
                      min={0}
                      max={100}
                      type="number"
                      data-test-id="backoff-amount"
                      placeholder="0"
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
      <div
        style={{
          marginBottom: '15px',
        }}
      >
        <Controller
          control={control}
          name={`steps.${index}.metadata.digestKey`}
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
