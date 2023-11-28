import { Group, Radio, SimpleGrid, Text } from '@mantine/core';
import { Controller, useFormContext } from 'react-hook-form';
import { DigestUnitEnum, OrdinalEnum, OrdinalValueEnum, MonthlyTypeEnum, DigestTypeEnum } from '@novu/shared';

import { colors, Select, When } from '@novu/design-system';
import { DaySelect } from './DaySelect';
import { useEnvController } from '../../../../hooks';
import { useStepFormPath } from '../../hooks/useStepFormPath';

export const ScheduleMonthlyFields = () => {
  const { readonly } = useEnvController();
  const { watch, control } = useFormContext();
  const stepFormPath = useStepFormPath();

  const ordinalFieldName = `${stepFormPath}.digestMetadata.${DigestTypeEnum.TIMED}.${DigestUnitEnum.MONTHS}.ordinal`;
  const ordinalValueFieldName = `${stepFormPath}.digestMetadata.${DigestTypeEnum.TIMED}.${DigestUnitEnum.MONTHS}.ordinalValue`;
  const ordinal = watch(ordinalFieldName);
  const ordinalValue = watch(ordinalValueFieldName);

  return (
    <Controller
      name={`${stepFormPath}.digestMetadata.${DigestTypeEnum.TIMED}.${DigestUnitEnum.MONTHS}.monthlyType`}
      defaultValue={MonthlyTypeEnum.EACH}
      control={control}
      render={({ field: radioGroup }) => {
        return (
          <Radio.Group
            spacing={0}
            defaultValue={MonthlyTypeEnum.EACH}
            value={radioGroup.value}
            onChange={radioGroup.onChange}
          >
            <Group spacing={8} mb={10} mt={34} sx={{ color: colors.B60 }}>
              <Radio value={MonthlyTypeEnum.EACH} />
              <div>Each</div>
            </Group>
            <Controller
              control={control}
              name={`${stepFormPath}.digestMetadata.${DigestTypeEnum.TIMED}.${DigestUnitEnum.MONTHS}.monthDays`}
              defaultValue={[new Date().getDate()]}
              render={({ field }) => {
                return <DaySelect value={field.value} disabled={readonly} onChange={field.onChange} />;
              }}
            />
            <Group spacing={8} mb={10} mt={34} sx={{ color: colors.B60 }}>
              <Radio value={MonthlyTypeEnum.ON} />
              <div>On the</div>
            </Group>
            <SimpleGrid cols={2} spacing={16}>
              <Controller
                name={ordinalFieldName}
                defaultValue={OrdinalEnum.FIRST}
                control={control}
                render={({ field }) => {
                  return (
                    <Select
                      value={field.value}
                      onChange={field.onChange}
                      mt={-5}
                      mb={-5}
                      data={[
                        { value: OrdinalEnum.FIRST, label: 'First' },
                        { value: OrdinalEnum.SECOND, label: 'Second' },
                        { value: OrdinalEnum.THIRD, label: 'Third' },
                        { value: OrdinalEnum.FOURTH, label: 'Fourth' },
                        { value: OrdinalEnum.FIFTH, label: 'Fifth' },
                        { value: OrdinalEnum.LAST, label: 'Last' },
                      ]}
                      placeholder="First"
                    />
                  );
                }}
              />
              <Controller
                name={ordinalValueFieldName}
                defaultValue={OrdinalValueEnum.DAY}
                control={control}
                render={({ field }) => {
                  return (
                    <Select
                      value={field.value}
                      onChange={field.onChange}
                      mt={-5}
                      mb={-5}
                      data={[
                        { value: OrdinalValueEnum.DAY, label: 'Day' },
                        { value: OrdinalValueEnum.WEEKDAY, label: 'Weekday' },
                        { value: OrdinalValueEnum.WEEKEND, label: 'Weekend day' },
                        { value: OrdinalValueEnum.SUNDAY, label: 'Sunday' },
                        { value: OrdinalValueEnum.MONDAY, label: 'Monday' },
                        { value: OrdinalValueEnum.TUESDAY, label: 'Tuesday' },
                        { value: OrdinalValueEnum.WEDNESDAY, label: 'Wednesday' },
                        { value: OrdinalValueEnum.THURSDAY, label: 'Thursday' },
                        { value: OrdinalValueEnum.FRIDAY, label: 'Friday' },
                        { value: OrdinalValueEnum.SATURDAY, label: 'Saturday' },
                      ]}
                      placeholder="Day"
                    />
                  );
                }}
              />
            </SimpleGrid>
            <When
              truthy={
                ordinal === OrdinalEnum.FIFTH &&
                ![OrdinalValueEnum.DAY, OrdinalValueEnum.WEEKDAY, undefined].includes(ordinalValue)
              }
            >
              <Text
                size={12}
                color={colors.error}
                sx={{
                  lineHeight: '20px',
                }}
              >
                Will not be sent in those months in which there is no such day
              </Text>
            </When>
          </Radio.Group>
        );
      }}
    />
  );
};
