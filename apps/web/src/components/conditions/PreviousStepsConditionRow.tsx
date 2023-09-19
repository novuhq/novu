import { Control, Controller } from 'react-hook-form';
import { Grid } from '@mantine/core';

import { PreviousStepTypeEnum } from '@novu/shared';

import { DataSelect, IConditionsForm } from './types';
import { Select } from '../../design-system';
import { DefaultPreviousStepTypeData } from './constants';

export function PreviousStepsConditionRow({
  control,
  index,
  customData,
}: {
  control: Control<IConditionsForm>;
  index: number;
  customData?: DataSelect[];
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
                data-test-id="previous-step-type-dropdown"
              />
            );
          }}
        />
      </Grid.Col>
    </>
  );
}
