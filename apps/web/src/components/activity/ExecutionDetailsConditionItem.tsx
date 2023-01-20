import React from 'react';
import styled from '@emotion/styled';
import { Group, Stack } from '@mantine/core';
import { ICondition } from '@novu/shared';
import { colors, Text, Tooltip } from '../../design-system';
import { CheckCircle, ErrorIcon } from '../../design-system/icons';

export function ExecutionDetailsConditionItem({ condition }: { condition: ICondition }) {
  const isPassed = condition.passed;
  const Icon = isPassed ? CheckCircle : ErrorIcon;
  const passedStatusColor = isPassed ? colors.success : colors.error;
  const tooltipLabel = isPassed ? 'Filter matched' : "Filter didn't match";

  return (
    <ItemContainer spacing={5}>
      <Tooltip label={tooltipLabel} position="left">
        <ConditionHeader>
          <Icon color={passedStatusColor} width="15px" height="15px" />
          <Text weight="bold">{condition.filter}</Text>
        </ConditionHeader>
      </Tooltip>
      <Group>
        <ConditionPair>
          <ConditionTitle>Field:</ConditionTitle>
          <Text>{condition.field}</Text>
        </ConditionPair>
        <ConditionPair>
          <ConditionTitle>Operator:</ConditionTitle>
          <Text>{condition.operator}</Text>
        </ConditionPair>
      </Group>
      <Group>
        <ConditionPair>
          <ConditionTitle>Expected:</ConditionTitle>
          <Text color={passedStatusColor}>{condition.expected}</Text>
        </ConditionPair>
        <ConditionPair>
          <ConditionTitle>Actual:</ConditionTitle>
          <Text color={passedStatusColor}>{condition.actual}</Text>
        </ConditionPair>
      </Group>
    </ItemContainer>
  );
}

function ConditionPair({ children }: { children: React.ReactNode }) {
  return <Group spacing={5}>{children}</Group>;
}

const ItemContainer = styled(Stack)`
  border: ${({ theme }) => `1px solid ${theme.colorScheme === 'dark' ? colors.B70 : colors.B30}`};
  border-radius: 7px;
  padding: 0.75rem;
`;

const ConditionTitle = styled(Text)`
  color: ${colors.B60};
`;

const ConditionHeader = styled.div`
  display: flex;
  gap: 5px;
  cursor: pointer;
`;
