import { Group, Modal, useMantineTheme } from '@mantine/core';
import { Button, colors, shadows, Title, Text } from '@novu/design-system';

export function UnsavedChangesModal({
  isOpen,
  cancelNavigation,
  confirmNavigation,
}: {
  isOpen: boolean;
  cancelNavigation: () => void;
  confirmNavigation: () => void;
}) {
  const theme = useMantineTheme();

  return (
    <>
      <Modal
        opened={isOpen}
        withinPortal
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
        title={<Title size={2}>Unsaved changes</Title>}
        sx={{ backdropFilter: 'blur(10px)' }}
        shadow={theme.colorScheme === 'dark' ? shadows.dark : shadows.medium}
        radius="md"
        size="lg"
        onClose={() => {
          cancelNavigation();
        }}
      >
        <div>
          <Text>Any unsaved changes will be deleted. Proceed anyway?</Text>
          <Group position="right">
            <Button variant="outline" size="md" mt={30} onClick={() => cancelNavigation()}>
              No
            </Button>
            <Button mt={30} size="md" onClick={() => confirmNavigation()}>
              Yes
            </Button>
          </Group>
        </div>
      </Modal>
    </>
  );
}
