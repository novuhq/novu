import { Accordion, Group, useMantineColorScheme } from '@mantine/core';
import { Controller, useFormContext } from 'react-hook-form';
import { DigestTypeEnum, DigestUnitEnum } from '@novu/shared';

import { When } from '../../../components/utils/When';
import { colors, Input, SegmentedControl, Select, Tooltip } from '../../../design-system';
import { inputStyles } from '../../../design-system/config/inputs.styles';
import { WeekDaySelect } from './digest/WeekDaySelect';
import { Bell, Digest, Timer } from '../../../design-system/icons';
import { TypeSegmented } from './digest/TypeSegment';
import { IntervalSelect } from './digest/IntervalSelect';
import { BackOffFields } from './digest/BackOffFields';
import { WillBeSentHeader } from './digest/WillBeSentHeader';
import { ScheduleMonthlyFields } from './digest/ScheduleMonthlyFields';
import { useEffect } from 'react';
import { RegularInfo } from './digest/RegularInfo';

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

export const DigestMetadata = ({ control, index, readonly }) => {
  const {
    formState: { errors, isSubmitted },
    watch,
    trigger,
    setValue,
  } = useFormContext();

  const { colorScheme } = useMantineColorScheme();

  const type = watch(`steps.${index}.metadata.type`);
  const unit = watch(`steps.${index}.metadata.unit`);
  const digestKey = watch(`steps.${index}.metadata.digestKey`);
  const showErrors = isSubmitted && errors?.steps;
  const isEnterprise = process.env.REACT_APP_DOCKER_HOSTED_ENV !== 'true';

  useEffect(() => {
    if (unit !== undefined) {
      return;
    }
    if (type !== DigestTypeEnum.TIMED) {
      return;
    }

    setValue(`steps.${index}.metadata.unit`, DigestUnitEnum.DAYS);
    trigger(`steps.${index}.metadata`);
  }, [unit, type]);

  return (
    <div data-test-id="digest-step-settings-interval">
      <Accordion>
        <Tooltip
          position="left"
          width={227}
          multiline
          label="Types of events that will be aggregated from the previous digest to the time it will be sent"
        >
          <Accordion.Item value="events-selection" data-test-id="digest-events-selection-options">
            <Accordion.Control>
              <Group>
                <Bell color={colors.B60} />
                <div>
                  <div>
                    <b
                      style={{
                        color: colorScheme === 'dark' ? colors.B80 : colors.B40,
                      }}
                    >
                      All events
                    </b>
                  </div>
                  <div>since previous digest</div>
                </div>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Select mt={-5} mb={-5} data={[{ value: 'all', label: 'All events' }]} value={'all'} />
            </Accordion.Panel>
          </Accordion.Item>
        </Tooltip>
        <Tooltip
          position="left"
          width={227}
          multiline
          label={
            <>
              Events aggregated by subscriber_ID by default, this can’t be changed. You may add additional aggregations
              by typing the name of a variable.
            </>
          }
        >
          <Accordion.Item value="group-by" data-test-id="digest-group-by-options">
            <Accordion.Control>
              <Group>
                <div style={{ width: 26 }}>
                  <Digest color={colors.B60} />
                </div>
                <div>
                  <div>
                    <b>Aggregated by Subscriber_ID</b>
                  </div>
                  <When truthy={!digestKey}>
                    <div>Add grouping...</div>
                  </When>
                  <When truthy={digestKey}>
                    <div>
                      And by{' '}
                      <b
                        style={{
                          color: colorScheme === 'dark' ? colors.B80 : colors.B40,
                        }}
                      >
                        {digestKey}
                      </b>
                    </div>
                  </When>
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
        </Tooltip>
        <Accordion.Item value="send" data-test-id="digest-send-options">
          <Accordion.Control>
            <Group>
              <Timer width="30" height="30" color={colors.B60} />
              <div>
                <div>
                  <b>Will be sent</b>
                </div>
                <div>
                  <WillBeSentHeader index={index} />
                </div>
              </div>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <When truthy={isEnterprise}>
              <Controller
                control={control}
                defaultValue={DigestTypeEnum.REGULAR}
                name={`steps.${index}.metadata.type`}
                render={({ field }) => {
                  return (
                    <TypeSegmented
                      {...field}
                      sx={{
                        maxWidth: '100% !important',
                        marginBottom: -14,
                      }}
                      fullWidth
                      disabled={readonly}
                      data={[
                        {
                          value: DigestTypeEnum.REGULAR,
                          label: (
                            <Tooltip
                              withinPortal
                              width={310}
                              multiline
                              label={
                                <>
                                  <div>
                                    Digest starts after the first event occurred since the previous sent digest. From
                                    that moment on, it aggregates events for the specified time, after which it sends a
                                    digest of the events.
                                  </div>
                                  <RegularInfo />
                                </>
                              }
                            >
                              <div>Event</div>
                            </Tooltip>
                          ),
                        },
                        {
                          value: DigestTypeEnum.TIMED,
                          label: (
                            <Tooltip
                              withinPortal
                              width={240}
                              multiline
                              label="Digest aggregates the events in between the selected time period"
                            >
                              <div>Schedule</div>
                            </Tooltip>
                          ),
                        },
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
            </When>
            <div
              style={{
                background: colorScheme === 'dark' ? colors.B20 : colors.BGLight,
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
                          { value: DigestUnitEnum.MINUTES, label: 'Min' },
                          { value: DigestUnitEnum.HOURS, label: 'Hour' },
                          { value: DigestUnitEnum.DAYS, label: 'Daily' },
                          { value: DigestUnitEnum.WEEKS, label: 'Weekly' },
                          { value: DigestUnitEnum.MONTHS, label: 'Monthly' },
                        ]}
                        onChange={async (segmentValue) => {
                          field.onChange(segmentValue);
                          await trigger(`steps.${index}.metadata`);
                        }}
                        data-test-id="digest-unit"
                      />
                    );
                  }}
                />
                <Group data-test-id="timed-group" spacing={8} sx={{ color: colors.B60 }}>
                  <span>Every</span>
                  <Controller
                    control={control}
                    name={`steps.${index}.metadata.amount`}
                    defaultValue=""
                    render={({ field, fieldState }) => {
                      return (
                        <Input
                          {...field}
                          value={field.value || '1'}
                          error={showErrors && fieldState.error?.message}
                          min={1}
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
                      name={`steps.${index}.metadata.timed.atTime`}
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
                    name={`steps.${index}.metadata.timed.weekDays`}
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
                <ScheduleMonthlyFields readonly={readonly} index={index} control={control} />
              </When>
              <When truthy={type !== DigestTypeEnum.TIMED}>
                <Group spacing={8} sx={{ color: colors.B60 }}>
                  <span>digest events for</span>
                  <Controller
                    control={control}
                    name={`steps.${index}.metadata.amount`}
                    defaultValue={5}
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
                              minHeight: '30px',
                              margin: 0,
                              height: 30,
                              lineHeight: '32px',
                            },
                          })}
                        />
                      );
                    }}
                  />
                  <div
                    style={{
                      width: '90px',
                      height: 30,
                    }}
                  >
                    <IntervalSelect
                      readonly={readonly}
                      control={control}
                      name={`steps.${index}.metadata.unit`}
                      showErrors={showErrors}
                    />
                  </div>
                  <span>before send</span>
                </Group>
                <BackOffFields index={index} control={control} readonly={readonly} />
              </When>
            </div>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </div>
  );
};
