import styled from '@emotion/styled';
import { Group, Text } from '@mantine/core';
import { useState } from 'react';
import {
  When,
  Button,
  colors,
  Modal,
  Title,
  ActionButton,
  RemoveCondition,
  StarEmpty,
  Warning,
} from '@novu/design-system';

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

const RemovesCondition = () => {
  return (
    <Text mt={4} lineClamp={3} color="#EAA900">
      This action remove
      <br /> applied conditions
    </Text>
  );
};

export const PrimaryIconButton = ({
  conditions = 0,
  primary = false,
  onClick,
}: {
  conditions?: number;
  primary?: boolean;
  onClick: () => void;
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  if (primary) {
    return null;
  }

  return (
    <>
      <ActionButton
        tooltip={
          <>
            Mark as Primary
            <When truthy={conditions > 0}>
              <RemovesCondition />
            </When>
          </>
        }
        tooltipPosition="bottom"
        Icon={StarEmpty}
        onClick={() => {
          if (conditions > 0) {
            setModalOpen(true);

            return;
          }
          onClick();
        }}
        data-test-id="header-make-primary-btn"
      />
      <Modal
        data-test-id="remove-conditions-modal"
        opened={modalOpen}
        title={
          <Group spacing={8}>
            <Warning color="#EAA900" />
            <Title color="#EAA900">Conditions will be removed</Title>
          </Group>
        }
        size="lg"
        onClose={() => {
          setModalOpen(false);
        }}
      >
        <Text color={colors.B60}>
          Marking this instance as primary will remove all conditions since primary instances can not have any
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
            <Group spacing={8}>
              <RemoveCondition /> Remove conditions
            </Group>
          </Button>
        </Group>
      </Modal>
    </>
  );
};
