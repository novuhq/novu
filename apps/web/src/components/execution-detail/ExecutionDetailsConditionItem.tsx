import React from 'react';
import styled from '@emotion/styled';
import { Group, Stack } from '@mantine/core';
import { ICondition } from '@novu/shared';
import { colors, Text, Tooltip, CheckCircle, ErrorIcon } from '@novu/design-system';

export function ExecutionDetailsConditionItem({ condition }: { condition: ICondition }) {
  const isPassed = condition.passed;
  const Icon = isPassed ? CheckCircle : ErrorIcon;
  const passedStatusColor = isPassed ? colors.success : colors.error;
  const tooltipLabel = isPassed ? 'Filter matched' : "Filter didn't match";
  const iconClass = isPassed ? 'condition-passed' : 'condition-failed';

  return (
    <ItemContainer spacing={5} data-test-id="condition-item-list">
      <Tooltip label={tooltipLabel} position="left">
        <ConditionHeader>
          <Icon color={passedStatusColor} width="15px" height="15px" className={iconClass} />
          <Text weight="bold" data-test-id="condition-filter-value">
            {condition.filter}
          </Text>
        </ConditionHeader>
      </Tooltip>
      <Group>
        <ConditionPair>
          <ConditionTitle>Field:</ConditionTitle>
          <Text data-test-id="condition-field-value">{condition.field}</Text>
        </ConditionPair>
        <ConditionPair>
          <ConditionTitle>Operator:</ConditionTitle>
          <Text data-test-id="condition-operator-value">{condition.operator}</Text>
        </ConditionPair>
      </Group>
      <Group>
        <ConditionPair>
          <ConditionTitle>Expected:</ConditionTitle>
          <Text color={passedStatusColor} data-test-id="condition-expected-value">
            {condition.expected}
          </Text>
        </ConditionPair>
        <ConditionPair>
          <ConditionTitle>Actual:</ConditionTitle>
          <Text color={passedStatusColor} data-test-id="condition-actual-value">
            {condition.actual}
          </Text>
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
