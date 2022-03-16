import { useState } from 'react';
import { Modal, Button, Group } from '@mantine/core';
import { ConnectIntegrationForm } from './ConnectIntegrationForm';

export function ConnectIntegrationModal() {
  const [opened, setOpened] = useState(false);

  return (
    <>
      <Modal
        centered
        size="lg"
        overflow="inside"
        opened={opened}
        onClose={() => setOpened(false)}
        title="provider logo">
        <ConnectIntegrationForm />
      </Modal>

      <Group position="center">
        <Button onClick={() => setOpened(true)}>Open Modal</Button>
      </Group>
    </>
  );
}
