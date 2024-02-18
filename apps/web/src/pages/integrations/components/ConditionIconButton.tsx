import { useState } from 'react';
import styled from '@emotion/styled';
import { Group } from '@mantine/core';
import {
  colors,
  When,
  Text,
  Modal,
  Button,
  Title,
  ActionButton,
  Condition,
  ConditionPlus,
  Warning,
} from '@novu/design-system';

const RemovesPrimary = () => {
  return (
    <Text mt={4} color="#EAA900">
      This action replaces the
      <br />
      primary provider flag
    </Text>
  );
};

export const ConditionIconButton = ({
  conditions = 0,
  primary = false,
  onClick,
}: {
  conditions?: number;
  primary?: boolean;
  onClick: () => void;
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <ActionButton
        tooltip={
          <>
            {conditions > 0 ? 'Edit' : 'Add'} Conditions
            <When truthy={primary}>
              <RemovesPrimary />
            </When>
          </>
        }
        tooltipPosition="bottom"
        Icon={conditions === 0 ? ConditionPlus : Condition}
        text={conditions > 0 ? `${conditions}` : undefined}
        onClick={() => {
          if (primary && conditions === 0) {
            setModalOpen(true);

            return;
          }
          onClick();
        }}
        data-test-id="header-add-conditions-btn"
      />
      <Modal
        opened={modalOpen}
        data-test-id="remove-primary-flag-modal"
        title={
          <Group spacing={8}>
            <Warning color="#EAA900" />
            <Title size={2} color="#EAA900">
              Primary flag will be removed
            </Title>
          </Group>
        }
        size="lg"
        onClose={() => {
          setModalOpen(false);
        }}
      >
        <Text color={colors.B60}>
          Adding conditions to the primary provider instance removes its primary status when a user applies changes by
          clicking the Update button. This can potentially cause notification failures for the steps that were using the
          primary provider.
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
            <Group spacing={8}>Got it</Group>
          </Button>
        </Group>
      </Modal>
    </>
  );
};
