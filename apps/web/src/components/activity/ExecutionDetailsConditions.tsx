import { Stack } from '@mantine/core';
import { ICondition } from '@novu/shared';
import { ExecutionDetailsConditionItem } from './ExecutionDetailsConditionItem';

export function ExecutionDetailsConditions({ conditions }: { conditions: ICondition[] }) {
  return (
    <Stack spacing={5}>
      {conditions.map((condition) => {
        return <ExecutionDetailsConditionItem condition={condition} />;
      })}
    </Stack>
  );
}
