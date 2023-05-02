import { Accordion, Grid, Group } from '@mantine/core';
import { Controller, useFormContext } from 'react-hook-form';
import styled from '@emotion/styled';
import { DigestTypeEnum, DigestUnitEnum } from '@novu/shared';

import { When } from '../../../components/utils/When';
import { colors, Input, SegmentedControl, Select, Switch } from '../../../design-system';
import { inputStyles } from '../../../design-system/config/inputs.styles';
import { useEnvController } from '../../../hooks';
import { IntervalRadios } from './IntervalRadios';
import { LabelWithTooltip } from './LabelWithTooltip';
import { WeekDaySelect } from './WeekDaySelect';
import { DaySelect } from './DaySelect';
import { Bell, Digest, Timer } from '../../../design-system/icons';

const StyledSwitch = styled(Switch)`
  max-width: 100% !important;
  margin-top: 15px;
`;

const convertUnitToLabel = (unit: DigestUnitEnum) => {
  switch (unit) {
    case DigestUnitEnum.SECONDS:
      return 'second';
    case DigestUnitEnum.MINUTES:
      return 'minute';
    case DigestUnitEnum.HOURS:
      return 'hour';
    case DigestUnitEnum.DAYS:
      return 'day';
    case DigestUnitEnum.WEEKS:
      return 'week';
    case DigestUnitEnum.MONTHS:
      return 'month';
  }
};

export const DigestMetadata = ({ control, index }) => {
  const { readonly } = useEnvController();
  const {
    formState: { errors, isSubmitted, isDirty },
    watch,
    trigger,
  } = useFormContext();

  const type = watch(`steps.${index}.metadata.type`);
  const unit = watch(`steps.${index}.metadata.unit`);
  const showErrors = isSubmitted && errors?.steps;

  return (
    <>
      <Accordion>
        <Accordion.Item value="events-selection">
          <Accordion.Control>
            <Group>
              <Bell color={colors.B60} />
              <div>
                <div>Events with status</div>
                <div>
                  <b
                    style={{
                      color: colors.B80,
                    }}
                  >
                    All events
                  </b>{' '}
                  since previous digest
                </div>
              </div>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Select mt={-5} mb={-5} data={[{ value: 'all', label: 'All events' }]} value={'all'} />
          </Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="group-by">
          <Accordion.Control>
            <Group>
              <div style={{ width: 26 }}>
                <Digest color={colors.B60} />
              </div>
              <div>
                <div>Grouped by Subscriber_ID</div>
                <div>Add grouping...</div>
              </div>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Controller
              control={control}
              name={`steps.${index}.metadata.digestKey`}
              defaultValue=""
              render={({ field, fieldState }) => {
                return (
                  <Input
                    {...field}
                    mt={-5}
                    mb={-5}
                    value={field.value || ''}
                    placeholder="Post_ID, Attribute_ID, etc."
                    error={fieldState.error?.message}
                    type="text"
                    data-test-id="batch-key"
                    disabled={readonly}
                  />
                );
              }}
            />
          </Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="send">
          <Accordion.Control>
            <Group>
              <Timer width="30" height="30" color={colors.B60} />
              <div>
                <div>Will be send</div>
                <div>
                  after{' '}
                  <b
                    style={{
                      color: colors.B80,
                    }}
                  >
                    6 hours
                  </b>{' '}
                  after collecting first event
                </div>
              </div>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
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
                      marginBottom: -14,
                    }}
                    fullWidth
                    disabled={readonly}
                    data={[
                      { value: DigestTypeEnum.REGULAR, label: 'Regular' },
                      { value: DigestTypeEnum.BACKOFF, label: 'Backoff' },
                      { value: DigestTypeEnum.TIMED, label: 'Scheduled' },
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
            <div
              style={{
                background: colors.B20,
                padding: 16,
                borderRadius: 8,
              }}
            >
              <When truthy={type === DigestTypeEnum.TIMED}>
                <Controller
                  control={control}
                  defaultValue={DigestUnitEnum.DAYS}
                  name={`steps.${index}.metadata.unit`}
                  render={({ field }) => {
                    return (
                      <SegmentedControl
                        {...field}
                        size="sm"
                        sx={{
                          maxWidth: '100% !important',
                        }}
                        fullWidth
                        disabled={readonly}
                        data={[
                          { value: DigestUnitEnum.DAYS, label: 'Daily' },
                          { value: DigestUnitEnum.WEEKS, label: 'Weekly' },
                          { value: DigestUnitEnum.MONTHS, label: 'Monthly' },
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
                <Group spacing={8} sx={{ color: colors.B60 }}>
                  <span>Every</span>
                  <Controller
                    control={control}
                    name={`steps.${index}.metadata.timed.every`}
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
                  <span>{convertUnitToLabel(unit)}(s)</span>
                  <When truthy={[DigestUnitEnum.DAYS, DigestUnitEnum.WEEKS, DigestUnitEnum.MONTHS].includes(unit)}>
                    <span>at</span>
                    <Controller
                      control={control}
                      name={`steps.${index}.metadata.timed.at`}
                      defaultValue=""
                      render={({ field, fieldState }) => {
                        return (
                          <Input
                            {...field}
                            value={field.value || ''}
                            error={showErrors && fieldState.error?.message}
                            type="time"
                            data-test-id="time-at"
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
                  </When>
                  <When truthy={[DigestUnitEnum.WEEKS, DigestUnitEnum.MONTHS].includes(unit)}>
                    <span>on:</span>
                  </When>
                </Group>
                <When truthy={unit === DigestUnitEnum.WEEKS}>
                  <Controller
                    control={control}
                    name={`steps.${index}.metadata.timed.dayOfWeek`}
                    defaultValue=""
                    render={({ field }) => {
                      return (
                        <WeekDaySelect
                          value={field.value}
                          disabled={readonly}
                          onChange={async (value) => {
                            field.onChange(value);
                            await trigger(`steps.${index}.metadata`);
                          }}
                        />
                      );
                    }}
                  />
                </When>
                <When truthy={unit === DigestUnitEnum.MONTHS}>
                  <Controller
                    control={control}
                    name={`steps.${index}.metadata.timed.day`}
                    defaultValue=""
                    render={({ field }) => {
                      return (
                        <DaySelect
                          value={field.value}
                          disabled={readonly}
                          onChange={async (value) => {
                            field.onChange(value);
                            await trigger(`steps.${index}.metadata`);
                          }}
                        />
                      );
                    }}
                  />
                </When>
              </When>
              <When truthy={type !== DigestTypeEnum.TIMED}>
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
              </When>
            </div>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </>
  );
};
