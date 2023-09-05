import { useMemo, useState } from 'react';
import styled from '@emotion/styled';
import { Group, ActionIcon, Title, Center } from '@mantine/core';
import { When } from '../../../components/utils/When';
import { colors, Tooltip, Text, Modal, Button } from '../../../design-system';
import { Condition, ConditionPlus, Warning } from '../../../design-system/icons';
import { IConditions } from '../../../components/conditions';

const IconButton = styled(Group)`
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
  const [modalOpen, setModalOpen] = useState(false);
  const numOfConditions: number = useMemo(() => {
    if (conditions && conditions[0] && conditions[0].children) {
      return conditions[0].children.length;
    }

    return 0;
  }, [conditions]);

  return (
    <>
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
        <ActionIcon
          onClick={() => {
            if (primary) {
              setModalOpen(true);

              return;
            }
            onClick();
          }}
          variant="transparent"
        >
          <IconButton position="center" spacing={4}>
            <When truthy={numOfConditions === 0}>
              <ConditionPlus />
            </When>
            <When truthy={numOfConditions > 0}>
              <Center inline>
                <Condition />
                <div>{numOfConditions}</div>
              </Center>
            </When>
          </IconButton>
        </ActionIcon>
      </Tooltip>
      <Modal
        opened={modalOpen}
        title={
          <Group spacing={8}>
            <Warning color="#EAA900" />
            <Title color="#EAA900">Primary will be removed</Title>
          </Group>
        }
        size="lg"
        onClose={() => {
          setModalOpen(false);
        }}
      >
        <Text color={colors.B60}>
          Adding conditions to this instance will remove it as primary since primary instances can not have any
          conditions.
        </Text>
        <Group mt={30} position="right">
          <Button
            variant="outline"
            onClick={() => {
              setModalOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onClick();
              setModalOpen(false);
            }}
          >
            <Group spacing={8}>Remove as primary</Group>
          </Button>
        </Group>
      </Modal>
    </>
  );
};
