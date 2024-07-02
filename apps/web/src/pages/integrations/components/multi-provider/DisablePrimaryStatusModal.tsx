import { Group } from '@mantine/core';
import { colors, Text, Title, Modal, Button, Warning } from '@novu/design-system';

export interface IDisablePrimaryStatusModal {
  isOpened: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
}

export function DisablePrimaryStatusModal(props: IDisablePrimaryStatusModal) {
  return (
    <Modal
      onClose={props.onDismiss}
      opened={props.isOpened}
      title={
        <Group spacing={8}>
          <Warning color="#EAA900" />
          <Title size={2} color="#EAA900">
            Disabling will remove primary status
          </Title>
        </Group>
      }
    >
      <Text size="lg" color={colors.B60}>
        Disabling the primary provider instance removes its primary status, potentially causing failures for steps that
        rely on it.
      </Text>

      <Group mt={30} position="right">
        <Button type="button" variant="outline" onClick={props.onDismiss}>
          Cancel
        </Button>
        <Button type="button" onClick={props.onConfirm}>
          <Group spacing={8}>Disable instance</Group>
        </Button>
      </Group>
    </Modal>
  );
}
