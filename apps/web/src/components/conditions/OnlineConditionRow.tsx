import { Grid } from '@mantine/core';
import { Control, Controller } from 'react-hook-form';
import { FilterPartTypeEnum, TimeOperatorEnum } from '@novu/shared';
import { Input, Select } from '@novu/design-system';

import { RightSectionError } from './Conditions';
import { IConditionsForm, IConditionsProps } from './types';
import { DefaultTimeOperatorData } from './constants';

export function OnlineConditionRow({
  fieldOn,
  control,
  index,
  isReadonly = false,
}: {
  fieldOn: string;
  control: Control<IConditionsForm>;
  index: number;
  isReadonly?: boolean;
}) {
  return (
    <>
      {fieldOn === FilterPartTypeEnum.IS_ONLINE ? (
        <OnlineRightNowForm control={control} index={index} isReadonly={isReadonly} />
      ) : (
        <OnlineInTheLastForm control={control} index={index} isReadonly={isReadonly} />
      )}
    </>
  );
}

function OnlineRightNowForm({ control, index, isReadonly }: IConditionsProps) {
  return (
    <>
      <Grid.Col span={4}>
        <Controller
          control={control}
          name={`conditions.0.children.${index}.value`}
          defaultValue={'true'}
          rules={{ required: false }}
          render={({ field }) => {
            const value = typeof field.value === 'boolean' ? `${field.value}` : `${field.value === 'true'}`;

            return (
              <Select
                placeholder="value"
                data={[
                  { value: 'true', label: 'Yes' },
                  { value: 'false', label: 'No' },
                ]}
                {...field}
                onChange={(val) => field.onChange(val === 'true')}
                value={value}
                disabled={isReadonly}
                data-test-id="online-now-value-dropdown"
              />
            );
          }}
        />
      </Grid.Col>
    </>
  );
}

function OnlineInTheLastForm({ control, index, isReadonly }: IConditionsProps) {
  return (
    <>
      <Grid.Col span={4}>
        <Controller
          control={control}
          name={`conditions.0.children.${index}.value`}
          defaultValue=""
          render={({ field, fieldState }) => {
            return (
              <Input
                {...field}
                value={field.value as string}
                rightSection={<RightSectionError showError={!!fieldState.error} label="Value is missing" />}
                error={!!fieldState.error}
                placeholder="Value"
                type="number"
                disabled={isReadonly}
                data-test-id="online-in-last-value-input"
              />
            );
          }}
        />
      </Grid.Col>
      <Grid.Col span={3}>
        <Controller
          control={control}
          name={`conditions.0.children.${index}.timeOperator`}
          defaultValue={TimeOperatorEnum.MINUTES}
          render={({ field }) => {
            return (
              <Select
                data={DefaultTimeOperatorData}
                {...field}
                disabled={isReadonly}
                data-test-id="online-in-last-operator-dropdown"
              />
            );
          }}
        />
      </Grid.Col>
    </>
  );
}
