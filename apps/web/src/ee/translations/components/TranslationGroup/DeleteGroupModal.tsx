import styled from '@emotion/styled';
import { Group, Stack } from '@mantine/core';
import { Button, colors, Label, Modal, Text, WarningIcon } from '@novu/design-system';
import React from 'react';
import { useDeleteTranslationGroup } from '../../hooks';

export function DeleteGroupModal({
  onDismiss,
  open,
  groupName,
  groupIdentifier,
  onConfirm,
}: {
  onDismiss: () => void;
  open: boolean;
  groupName: string;
  groupIdentifier: string;
  onConfirm: () => void;
}) {
  const { deleteTranslationGroup, isLoading } = useDeleteTranslationGroup();

  const handleConfirm = async () => {
    await deleteTranslationGroup({ id: groupIdentifier });
    onConfirm();
  };

  return (
    <Modal opened={open} title={<ModalTitle groupName={groupName} />} onClose={onDismiss} centered>
      <Stack spacing={32}>
        <div>
          <Text color={colors.B60}>
            Deleting a translation group removes its JSON files containing translation keys. Notifications that use
            these variables will not be translated and will display the variables instead of the text message.
          </Text>
        </div>
        <Group position="right">
          <Group spacing={24}>
            <Button variant="outline" onClick={onDismiss}>
              Cancel
            </Button>
            <Button loading={isLoading} onClick={handleConfirm} data-test-id="delete-group-submit-btn">
              Delete group
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}

function ModalTitle({ groupName }) {
  return (
    <Group spacing={8}>
      <WarningIcon width="16px" height="16px" />
      <StyledLabel gradientColor="none">Delete {groupName} group?</StyledLabel>
    </Group>
  );
}

const StyledLabel = styled(Label)`
  color: #eaa900;
`;
