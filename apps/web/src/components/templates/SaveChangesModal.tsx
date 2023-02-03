import { Group } from '@mantine/core';
import { useFormContext } from 'react-hook-form';

import { Button, Title, Text, Modal } from '../../design-system';
import type { IForm } from './formTypes';
import { errorMessage } from '../../utils/notifications';

export function SaveChangesModal({
  isVisible,
  onDismiss,
  onConfirm,
  loading,
}: {
  isVisible: boolean;
  loading: boolean;
  onDismiss: () => void;
  onConfirm: (data: IForm) => void;
}) {
  const { handleSubmit } = useFormContext<IForm>();

  const onInvalid = async () => {
    errorMessage('There is something missing! Fix errors before saving changes');
    onDismiss();
  };

  return (
    <Modal
      data-test-id="save-changes-modal"
      opened={isVisible}
      title={<Title size={2}>Save template</Title>}
      onClose={onDismiss}
    >
      <form onSubmit={handleSubmit(onConfirm, onInvalid)}>
        <Text>Would you like to save your current changes?</Text>
        <Group position="right">
          <Button variant="outline" size="md" mt={30} onClick={onDismiss}>
            Cancel
          </Button>
          <Button mt={30} size="md" submit loading={loading}>
            Save
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
