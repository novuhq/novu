import { Control, Controller } from 'react-hook-form';
import { Grid } from '@mantine/core';
import { PreviousStepTypeEnum } from '@novu/shared';
import { Select } from '@novu/design-system';

import { DataSelect, IConditionsForm } from './types';
import { DefaultPreviousStepTypeData } from './constants';

export function PreviousStepsConditionRow({
  control,
  index,
  customData,
  isReadonly = false,
}: {
  control: Control<IConditionsForm>;
  index: number;
  customData?: DataSelect[];
  isReadonly?: boolean;
}) {
  const defaultValue = customData?.[0].value;

  return (
    <>
      <Grid.Col span={4}>
        <Controller
          control={control}
          name={`conditions.0.children.${index}.step`}
          defaultValue={defaultValue}
          render={({ field }) => {
            return (
              <Select
                placeholder="Select previous step"
                data={customData ?? []}
                {...field}
                disabled={isReadonly}
                data-test-id="previous-step-dropdown"
              />
            );
          }}
        />
      </Grid.Col>
      <Grid.Col span={3}>
        <Controller
          control={control}
          name={`conditions.0.children.${index}.stepType`}
          defaultValue={PreviousStepTypeEnum.READ}
          render={({ field }) => {
            return (
              <Select
                placeholder="Select type"
                data={DefaultPreviousStepTypeData}
                {...field}
                disabled={isReadonly}
                data-test-id="previous-step-type-dropdown"
              />
            );
          }}
        />
      </Grid.Col>
    </>
  );
}
