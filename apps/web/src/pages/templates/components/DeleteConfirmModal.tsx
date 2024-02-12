import { Alert, Group, Modal, useMantineTheme } from '@mantine/core';
import { WarningOutlined } from '@ant-design/icons';
import { Button, colors, shadows, Title, Text } from '@novu/design-system';

export function DeleteConfirmModal({
  target,
  title,
  description,
  isOpen,
  cancel,
  confirm,
  confirmButtonText = 'Yes',
  cancelButtonText = 'No',
  isLoading,
  error,
}: {
  target?: string;
  isOpen: boolean;
  cancel: () => void;
  confirm: () => void;
  isLoading?: boolean;
  error?: string;
  title?: string;
  description?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
}) {
  const theme = useMantineTheme();
  const targetText = target ? ' ' + target : '';

  return (
    <>
      <Modal
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
        title={<Title size={2}>{title ? title : `Delete${targetText}`}</Title>}
        sx={{ backdropFilter: 'blur(10px)' }}
        shadow={theme.colorScheme === 'dark' ? shadows.dark : shadows.medium}
        radius="md"
        size="lg"
        onClose={() => {
          cancel();
        }}
      >
        <div>
          {error && (
            <Alert
              icon={<WarningOutlined size={16} />}
              title="An error occurred!"
              color={`linear-gradient(0deg, ${colors.B17} 0%, ${colors.B17} 100%)`}
              mb={32}
            >
              {error}
            </Alert>
          )}
          <Text>{description ? description : `Would you like to delete this${targetText}?`}</Text>
          <Group position="right">
            <Button variant="outline" size="md" mt={30} onClick={() => cancel()}>
              {cancelButtonText}
            </Button>
            <Button mt={30} size="md" onClick={() => confirm()} loading={isLoading} data-autofocus>
              {confirmButtonText}
            </Button>
          </Group>
        </div>
      </Modal>
    </>
  );
}
