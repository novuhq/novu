import { Group, Modal, useMantineTheme } from '@mantine/core';
import { colors, shadows, Title, Text } from '../../design-system';

import { GotAQuestionButton } from '../utils/GotAQuestionButton';

export function ExecutionDetailsModal({ modalVisibility, onClose }: { modalVisibility: boolean; onClose: () => void }) {
  const theme = useMantineTheme();

  return (
    <>
      <Modal
        opened={modalVisibility}
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
        title={<Title size={2}>Execution details</Title>}
        sx={{ backdropFilter: 'blur(10px)' }}
        shadow={theme.colorScheme === 'dark' ? shadows.dark : shadows.medium}
        radius="md"
        size="lg"
        onClose={onClose}
      >
        <div>
          <Text>TODO</Text>
          <Group position="right">
            <GotAQuestionButton mt={30} size="md" />
          </Group>
        </div>
      </Modal>
    </>
  );
}
