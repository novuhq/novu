import React from 'react';
import { Group, Modal, useMantineTheme } from '@mantine/core';
import { Button, colors, shadows, Title, Text } from '@novu/design-system';

export function NavigateValidatorModal({
  isOpen,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const theme = useMantineTheme();

  return (
    <>
      <Modal
        onClose={onCancel}
        opened={isOpen}
        overlayColor={theme.colorScheme === 'dark' ? colors.BGDark : colors.BGLight}
        overlayOpacity={0.7}
        styles={{
          root: {
            zIndex: 201, // because the editor sidebar has z-index 200
          },
          modal: {
            backgroundColor: theme.colorScheme === 'dark' ? colors.B15 : colors.white,
          },
          body: {
            paddingTop: '5px',
          },
          inner: {
            paddingTop: '180px',
          },
        }}
        title={<Title size={2}>Unsaved changes will be deleted</Title>}
        sx={{ backdropFilter: 'blur(10px)' }}
        shadow={theme.colorScheme === 'dark' ? shadows.dark : shadows.medium}
        radius="md"
        size="lg"
      >
        <div>
          <Text>Any unsaved changes will be deleted. Proceed anyway?</Text>
          <Group position="right">
            <Button variant="outline" size="md" mt={30} onClick={onCancel}>
              No
            </Button>
            <Button mt={30} size="md" onClick={onConfirm}>
              Yes
            </Button>
          </Group>
        </div>
      </Modal>
    </>
  );
}
