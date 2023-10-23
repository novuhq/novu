import { Grid } from '@mantine/core';
import { TimeOperatorEnum } from '@novu/shared';
import { Controller } from 'react-hook-form';

import { DeleteStepButton } from './FilterModal.styles';

import { Input, Select } from '../../../design-system';
import { Trash } from '../../../design-system/icons';

const spanSize = 3;

export function OnlineFiltersForms({
  fieldOn,
  control,
  stepIndex,
  index,
  remove,
  readonly,
}: {
  fieldOn: string;
  control: any;
  stepIndex: number;
  index: number;
  remove: (index?: number | number[]) => void;
  readonly: boolean;
}) {
  return (
    <>
      {fieldOn === 'isOnline' ? (
        <OnlineRightNowForm control={control} stepIndex={stepIndex} index={index} readonly={readonly} />
      ) : (
        <OnlineInTheLastForm control={control} stepIndex={stepIndex} index={index} readonly={readonly} />
      )}
      <Grid.Col span={1}>
        <DeleteStepButton
          variant="outline"
          size="md"
          mt={30}
          disabled={readonly}
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
  readonly,
}: {
  control: any;
  stepIndex: number;
  index: number;
  readonly: boolean;
}) {
  return (
    <>
      <Grid.Col span={spanSize}>
        <Select placeholder="Operator" data={[{ value: 'EQUAL', label: 'Equal' }]} value={'EQUAL'} disabled />
      </Grid.Col>
      <Grid.Col span={spanSize}>
        <Controller
          control={control}
          name={`steps.${stepIndex}.filters.0.children.${index}.value`}
          defaultValue=""
          render={({ field }) => {
            const value = typeof field.value !== 'undefined' ? `${field.value}` : '';

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
                data-test-id="online-now-value-dropdown"
                disabled={readonly}
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
  readonly,
}: {
  control: any;
  stepIndex: number;
  index: number;
  readonly: boolean;
}) {
  return (
    <>
      <Grid.Col span={spanSize}>
        <Controller
          control={control}
          name={`steps.${stepIndex}.filters.0.children.${index}.timeOperator`}
          defaultValue=""
          render={({ field }) => {
            return (
              <Select
                placeholder="time period"
                data={[
                  { value: TimeOperatorEnum.MINUTES, label: 'Minutes' },
                  { value: TimeOperatorEnum.HOURS, label: 'Hours' },
                  { value: TimeOperatorEnum.DAYS, label: 'Days' },
                ]}
                {...field}
                data-test-id="online-in-last-operator-dropdown"
                disabled={readonly}
              />
            );
          }}
        />
      </Grid.Col>
      <Grid.Col span={spanSize}>
        <Controller
          control={control}
          name={`steps.${stepIndex}.filters.0.children.${index}.value`}
          defaultValue=""
          render={({ field, fieldState }) => {
            return (
              <Input
                {...field}
                error={fieldState.error?.message}
                placeholder="value"
                type="number"
                data-test-id="online-in-last-value-input"
                disabled={readonly}
              />
            );
          }}
        />
      </Grid.Col>
    </>
  );
}
