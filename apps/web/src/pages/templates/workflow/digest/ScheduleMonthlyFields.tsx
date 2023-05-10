import { Group, Radio, SimpleGrid, Text } from '@mantine/core';
import { Controller, useFormContext } from 'react-hook-form';
import { DigestUnitEnum, OrdinalEnum, OrdinalValueEnum, MonthlyTypeEnum } from '@novu/shared';

import { When } from '../../../../components/utils/When';
import { colors, Select } from '../../../../design-system';
import { DaySelect } from './DaySelect';

export const ScheduleMonthlyFields = ({ index, control, readonly }) => {
  const { watch, trigger } = useFormContext();

  const unit = watch(`steps.${index}.metadata.unit`);

  return (
    <When truthy={unit === DigestUnitEnum.MONTHS}>
      <Controller
        name={`steps.${index}.metadata.timed.monthlyType`}
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
                name={`steps.${index}.metadata.timed.monthDays`}
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
              <Group spacing={8} mb={10} mt={34} sx={{ color: colors.B60 }}>
                <Radio value={MonthlyTypeEnum.ON} />
                <div>On the</div>
              </Group>
              <SimpleGrid cols={2} spacing={16}>
                <Controller
                  name={`steps.${index}.metadata.timed.ordinal`}
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
                  name={`steps.${index}.metadata.timed.ordinalValue`}
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
              <Text
                size={12}
                color={colors.error}
                sx={{
                  lineHeight: '20px',
                }}
              >
                Will not be sent in those months in which there is no such day
              </Text>
            </Radio.Group>
          );
        }}
      />
    </When>
  );
};
