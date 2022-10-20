import { Group } from '@mantine/core';
import { Button, Title, Text, Modal } from '../../design-system';

export function SaveChangesModal({
  isVisible,
  onDismiss,
  onConfirm,
}: {
  isVisible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      <Modal opened={isVisible} title={<Title size={2}>Save template</Title>} onClose={onDismiss}>
        <div>
          <Text>Would you like to save your current changes?</Text>
          <Group position="right">
            <Button variant="outline" size="md" mt={30} onClick={onDismiss}>
              Cancel
            </Button>
            <Button mt={30} size="md" submit onClick={onConfirm} data-autofocus>
              Save
            </Button>
          </Group>
        </div>
      </Modal>
    </>
  );
}
