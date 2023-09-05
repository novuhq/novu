import { useMemo } from 'react';
import styled from '@emotion/styled';
import { Group, UnstyledButton, ActionIcon } from '@mantine/core';
import { When } from '../../../components/utils/When';
import { colors, Tooltip, Text } from '../../../design-system';
import { Condition, ConditionPlus } from '../../../design-system/icons';
import { IConditions } from '../types';

const Button = styled(Group)`
  text-align: center;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B60 : colors.B30)};

  &:hover {
    background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B30 : colors.B85)};
    color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.B30)};
  }
`;

const RemovesPrimary = () => {
  return (
    <Text mt={4} color="#EAA900">
      This action replaces
      <br /> the primary provider
    </Text>
  );
};

export const ConditionIconButton = ({
  conditions,
  primary = false,
  onClick,
}: {
  conditions?: IConditions[];
  primary?: boolean;
  onClick: () => void;
}) => {
  const numOfConditions: number = useMemo(() => {
    if (conditions && conditions[0] && conditions[0].children) {
      return conditions[0].children.length;
    }

    return 0;
  }, [conditions]);

  return (
    <Tooltip
      label={
        <>
          {numOfConditions > 0 ? 'Edit' : 'Add'} Conditions
          <When truthy={primary}>
            <RemovesPrimary />
          </When>
        </>
      }
      position="bottom"
    >
      <ActionIcon onClick={onClick} variant="transparent">
        <Button position="center" spacing={4}>
          <When truthy={numOfConditions === 0}>
            <ConditionPlus />
          </When>
          <When truthy={numOfConditions > 0}>
            <Condition />
            <div>{numOfConditions}</div>
          </When>
        </Button>
      </ActionIcon>
    </Tooltip>
  );
};
