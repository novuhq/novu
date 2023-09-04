import styled from '@emotion/styled';
import { Group, UnstyledButton, Text } from '@mantine/core';
import { colors } from '@novu/notification-center';
import { When } from '../../../components/utils/When';
import { Tooltip } from '../../../design-system';
import { AddCondition, Condition } from '../../../design-system/icons';

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
    <Text mt={4} lineClamp={3} color="#EAA900">
      This action replaces
      <br /> the primary provider
      <br />
      Learn more...{' '}
    </Text>
  );
};

export const ConditionIconButton = ({
  conditions,
  primary = false,
  onClick,
}: {
  conditions?: any[];
  primary?: boolean;
  onClick: () => void;
}) => {
  return (
    <Tooltip
      label={
        <>
          {conditions && conditions.length > 0 ? 'Edit' : 'Add'} Conditions
          <When truthy={primary}>
            <RemovesPrimary />
          </When>
        </>
      }
      position="bottom"
    >
      <UnstyledButton onClick={onClick}>
        <Button position="center" spacing={4}>
          <When truthy={!conditions || conditions.length === 0}>
            <AddCondition />
          </When>
          <When truthy={conditions && conditions.length > 0}>
            <Condition />
            <div>{conditions?.length || 0}</div>
          </When>
        </Button>
      </UnstyledButton>
    </Tooltip>
  );
};
