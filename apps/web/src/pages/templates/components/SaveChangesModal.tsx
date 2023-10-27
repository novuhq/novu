import { Group } from '@mantine/core';
import { FieldErrors, useFormContext } from 'react-hook-form';

import { Button, Title, Text, Modal } from '@novu/design-system';
import type { IForm } from './formTypes';

export function SaveChangesModal({
  isVisible,
  onDismiss,
  onConfirm,
  loading,
  onInvalid,
}: {
  isVisible: boolean;
  loading: boolean;
  onDismiss: () => void;
  onConfirm: (data: IForm) => void;
  onInvalid: (errors: FieldErrors<IForm>) => void;
}) {
  const { handleSubmit } = useFormContext<IForm>();

  function onInvalidForm(errors: FieldErrors<IForm>) {
    onInvalid(errors);
    onDismiss();
  }

  return (
    <Modal
      data-test-id="save-changes-modal"
      opened={isVisible}
      title={<Title size={2}>Save template</Title>}
      onClose={onDismiss}
    >
      <form onSubmit={handleSubmit(onConfirm, onInvalidForm)}>
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
