import { Grid } from '@mantine/core';
import { Controller, useFormContext } from 'react-hook-form';
import styled from '@emotion/styled';
import { DigestTypeEnum } from '@novu/shared';

import { When } from '../../../components/utils/When';
import { Input, SegmentedControl, Switch } from '../../../design-system';
import { inputStyles } from '../../../design-system/config/inputs.styles';
import { useEnvController } from '../../../hooks';
import { IntervalRadios } from './IntervalRadios';
import { LabelWithTooltip } from './LabelWithTooltip';

const StyledSwitch = styled(Switch)`
  max-width: 100% !important;
  margin-top: 15px;
`;

export const DigestMetadata = ({ control, index }) => {
  const { readonly } = useEnvController();
  const {
    formState: { errors, isSubmitted, isDirty },
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
          defaultValue={DigestTypeEnum.REGULAR}
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
                  { value: DigestTypeEnum.REGULAR, label: 'Regular' },
                  { value: DigestTypeEnum.BACKOFF, label: 'Backoff' },
                ]}
                onChange={async (segmentValue) => {
                  field.onChange(segmentValue);
                  await trigger(`steps.${index}.metadata`);
                }}
                data-test-id="digest-type"
              />
            );
          }}
        />
      </div>
      <div data-test-id="digest-step-settings-interval">
        <LabelWithTooltip
          label="Time Interval"
          tooltip="Once triggered, for how long the digest should collect events"
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
      </div>
      <When truthy={type === DigestTypeEnum.BACKOFF}>
        <LabelWithTooltip
          label="Backoff Time Interval"
          tooltip="A digest will only be created if a message was previously sent in this time interval"
        />
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
            <IntervalRadios
              control={control}
              name={`steps.${index}.metadata.backoffUnit`}
              testId="backoff-unit"
              showErrors={showErrors}
            />
          </Grid.Col>
        </Grid>
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
                  label="Update in app notifications"
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
                label={
                  <LabelWithTooltip
                    label="Digest Key (Optional)"
                    tooltip="Used to group messages using this payload key, by default only subscriberId is used"
                  />
                }
                placeholder="For example: post_id"
                error={fieldState.error?.message}
                type="text"
                data-test-id="batch-key"
                disabled={readonly}
              />
            );
          }}
        />
      </div>
    </>
  );
};
