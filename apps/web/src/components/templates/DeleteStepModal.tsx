import { Group, Modal, useMantineTheme } from '@mantine/core';
import { Button, colors, shadows, Title, Text } from '../../design-system';

export function DeleteStepModal({
  isOpen,
  cancel,
  confirm,
}: {
  isOpen: boolean;
  cancel: () => void;
  confirm: () => void;
}) {
  const theme = useMantineTheme();

  return (
    <>
      <Modal
        opened={isOpen}
        overlayColor={theme.colorScheme === 'dark' ? colors.BGDark : colors.BGLight}
        overlayOpacity={0.7}
        styles={{
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
        title={<Title size={2}>Delete step</Title>}
        sx={{ backdropFilter: 'blur(10px)' }}
        shadow={theme.colorScheme === 'dark' ? shadows.dark : shadows.medium}
        radius="md"
        size="lg"
        onClose={() => {
          cancel();
        }}
      >
        <div>
          <Text>Would you like to delete this step?</Text>
          <Group position="right">
            <Button variant="outline" size="md" mt={30} onClick={() => cancel()}>
              No
            </Button>
            <Button mt={30} size="md" onClick={() => confirm()} data-autofocus>
              Yes
            </Button>
          </Group>
        </div>
      </Modal>
    </>
  );
}
