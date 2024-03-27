import { Controller, useFormContext } from 'react-hook-form';
import { Group } from '@mantine/core';
import { format } from 'date-fns';
import { DigestTypeEnum, DigestUnitEnum } from '@novu/shared';

import { colors, Input, SegmentedControl, inputStyles } from '@novu/design-system';
import { WeekDaySelect } from './digest/WeekDaySelect';
import { ScheduleMonthlyFields } from './digest/ScheduleMonthlyFields';
import { When } from '../../../components/utils/When';
import { useStepFormPath } from '../hooks/useStepFormPath';
import { useEnvController } from '../../../hooks';
import { useTemplateEditorForm } from '../components/TemplateEditorFormProvider';

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

export const TimedDigestMetadata = () => {
  const { template } = useTemplateEditorForm();
  const { readonly } = useEnvController({}, template?.chimera);
  const { control, watch, setValue } = useFormContext();
  const stepFormPath = useStepFormPath();
  const unit: DigestUnitEnum =
    watch(`${stepFormPath}.digestMetadata.${DigestTypeEnum.TIMED}.unit`) ?? DigestUnitEnum.DAYS;
  const amountFieldName = `${stepFormPath}.digestMetadata.${DigestTypeEnum.TIMED}.${unit}.amount`;
  const atTimeFieldName = `${stepFormPath}.digestMetadata.${DigestTypeEnum.TIMED}.${unit}.atTime`;
  const amountDefaultValue = unit === DigestUnitEnum.MINUTES ? '5' : '1';
  const atTimeDefaultValue = format(new Date(), 'HH:mm');

  return (
    <>
      <Controller
        control={control}
        defaultValue={DigestUnitEnum.DAYS}
        name={`${stepFormPath}.digestMetadata.${DigestTypeEnum.TIMED}.unit`}
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
              onChange={field.onChange}
              data-test-id="digest-unit"
            />
          );
        }}
      />
      <Group data-test-id="timed-group" spacing={8} sx={{ color: colors.B60 }}>
        <span>Every</span>
        <Controller
          control={control}
          key={amountFieldName}
          name={amountFieldName}
          defaultValue={amountDefaultValue}
          render={({ field }) => {
            return (
              <Input
                {...field}
                value={field.value}
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
                onBlur={(e) => {
                  if (e.target.value === '') {
                    setValue(amountFieldName, amountDefaultValue);
                  }
                  field.onBlur();
                }}
              />
            );
          }}
        />
        <span>{convertUnitToLabel(unit)}(s)</span>
        <When truthy={[DigestUnitEnum.DAYS, DigestUnitEnum.WEEKS, DigestUnitEnum.MONTHS].includes(unit)}>
          <span>at</span>
          <Controller
            control={control}
            key={atTimeFieldName}
            name={atTimeFieldName}
            defaultValue={atTimeDefaultValue}
            render={({ field }) => {
              return (
                <Input
                  {...field}
                  value={field.value || ''}
                  type="time"
                  data-test-id="time-at"
                  disabled={readonly}
                  styles={(theme) => ({
                    ...inputStyles(theme),
                    input: {
                      textAlign: 'center',
                      ...inputStyles(theme).input,
                    },
                  })}
                  onBlur={(e) => {
                    if (e.target.value === '') {
                      setValue(atTimeFieldName, atTimeDefaultValue);
                    }
                    field.onBlur();
                  }}
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
          name={`${stepFormPath}.digestMetadata.${DigestTypeEnum.TIMED}.${unit}.weekDays`}
          defaultValue={[format(new Date(), 'EEEE').toLowerCase()]}
          render={({ field }) => {
            return <WeekDaySelect value={field.value} disabled={readonly} onChange={field.onChange} />;
          }}
        />
      </When>
      <When truthy={unit === DigestUnitEnum.MONTHS}>
        <ScheduleMonthlyFields />
      </When>
    </>
  );
};
