import { Group } from '@mantine/core';
import { Button } from '@novu/design-system';

import { useRegenerateApiKeyModal } from '../../ApiKeysPage/useRegenerateApiKeyModal';
import { ConfirmRegenerationModal } from './ConfirmRegenerationModal';

export const Regenerate = () => {
  const { isOpen, cancelAction, confirmAction, openModal } = useRegenerateApiKeyModal();

  return (
    <>
      <Group position="right">
        <Button mb={20} mt={10} data-test-id="show-regenerate-api-key-modal" onClick={openModal} variant={'outline'}>
          Regenerate API Key
        </Button>
      </Group>
      <ConfirmRegenerationModal isOpen={isOpen} cancelAction={cancelAction} confirmAction={confirmAction} />
    </>
  );
};
