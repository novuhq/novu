import { Grid } from '@mantine/core';
import { Controller } from 'react-hook-form';
import { Input, Select } from '../../../design-system';
import { Trash } from '../../../design-system/icons';
import { DeleteStepButton } from './FilterModal.styles';

const spanSize = 3;

export function OnlineFiltersForms({
  fieldOn,
  control,
  stepIndex,
  index,
  remove,
}: {
  fieldOn: string;
  control;
  stepIndex: number;
  index: number;
  remove: (index?: number | number[]) => void;
}) {
  return (
    <>
      {fieldOn === 'isOnline' ? (
        <OnlineRightNowForm control={control} stepIndex={stepIndex} index={index} remove={remove} />
      ) : (
        <OnlineInTheLastForm control={control} stepIndex={stepIndex} index={index} remove={remove} />
      )}
      <Grid.Col span={1}>
        <DeleteStepButton
          variant="outline"
          size="md"
          mt={30}
          onClick={() => {
            remove(index);
          }}
        >
          <Trash />
        </DeleteStepButton>
      </Grid.Col>
    </>
  );
}

function OnlineRightNowForm({
  control,
  stepIndex,
  index,
  remove,
}: {
  control;
  stepIndex: number;
  index: number;
  remove: (index?: number | number[]) => void;
}) {
  return (
    <>
      <Grid.Col span={spanSize}>
        <Controller
          control={control}
          name={`steps.${stepIndex}.filters.0.children.${index}.operator`}
          render={({ field }) => {
            return (
              <Select
                placeholder="Operator"
                data={[{ value: 'EQUAL', label: 'Equal' }]}
                {...field}
                value={'EQUAL'}
                disabled
              />
            );
          }}
        />
      </Grid.Col>
      <Grid.Col span={spanSize}>
        <Controller
          control={control}
          name={`steps.${stepIndex}.filters.0.children.${index}.value`}
          render={({ field }) => {
            return (
              <Select
                placeholder="value"
                data={[
                  { value: 'true', label: 'Yes' },
                  { value: 'false', label: 'no' },
                ]}
                {...field}
              />
            );
          }}
        />
      </Grid.Col>
    </>
  );
}

function OnlineInTheLastForm({
  control,
  stepIndex,
  index,
  remove,
}: {
  control;
  stepIndex: number;
  index: number;
  remove: (index?: number | number[]) => void;
}) {
  return (
    <>
      <Grid.Col span={spanSize}>
        <Controller
          control={control}
          name={`steps.${stepIndex}.filters.0.children.${index}.timeOperator`}
          render={({ field }) => {
            return (
              <Select
                placeholder="time period"
                data={[
                  { value: 'minutes', label: 'Minutes' },
                  { value: 'hours', label: 'Hours' },
                  { value: 'days', label: 'Days' },
                ]}
                {...field}
              />
            );
          }}
        />
      </Grid.Col>
      <Grid.Col span={spanSize}>
        <Controller
          control={control}
          name={`steps.${stepIndex}.filters.0.children.${index}.value`}
          render={({ field, fieldState }) => {
            return <Input {...field} error={fieldState.error?.message} placeholder="value" type="number" />;
          }}
        />
      </Grid.Col>
    </>
  );
}
