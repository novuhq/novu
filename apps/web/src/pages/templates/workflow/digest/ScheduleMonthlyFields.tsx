import { Group, Radio, SimpleGrid } from '@mantine/core';
import { DigestUnitEnum } from '@novu/shared';
import { Controller, useFormContext } from 'react-hook-form';
import { When } from '../../../../components/utils/When';
import { colors, Select } from '../../../../design-system';
import { useEnvController } from '../../../../hooks';
import { DaySelect } from './DaySelect';

export const ScheduleMonthlyFields = ({ index, control }) => {
  const { readonly } = useEnvController();
  const { watch, trigger } = useFormContext();

  const unit = watch(`steps.${index}.metadata.unit`);

  return (
    <When truthy={unit === DigestUnitEnum.MONTHS}>
      <Controller
        name={`steps.${index}.metadata.timed.monthlyType`}
        control={control}
        render={({ field: radioGroup }) => {
          return (
            <Radio.Group spacing={0} defaultValue="each" value={radioGroup.value} onChange={radioGroup.onChange}>
              <Group spacing={8} mb={10} mt={34} sx={{ color: colors.B60 }}>
                <Radio value="each" />
                <div>Each</div>
              </Group>
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
              <Group spacing={8} mb={10} mt={34} sx={{ color: colors.B60 }}>
                <Radio value="on" />
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
                          { value: '1', label: 'First' },
                          { value: '2', label: 'Second' },
                          { value: '3', label: 'Third' },
                          { value: '4', label: 'Forth' },
                          { value: '5', label: 'Fifth' },
                          { value: 'last', label: 'Last' },
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
                          { value: 'day', label: 'Day' },
                          { value: 'weekday', label: 'Weekday' },
                          { value: 'weekend', label: 'Weekend day' },
                          { value: 'sunday', label: 'Sunday' },
                          { value: 'monday', label: 'Monday' },
                          { value: 'tuesday', label: 'Tuesday' },
                          { value: 'wednesday', label: 'Wednesday' },
                          { value: 'thursday', label: 'Thursday' },
                          { value: 'friday', label: 'Friday' },
                          { value: 'saturday', label: 'Saturday' },
                        ]}
                        placeholder="Day"
                      />
                    );
                  }}
                />
              </SimpleGrid>
            </Radio.Group>
          );
        }}
      />
    </When>
  );
};
