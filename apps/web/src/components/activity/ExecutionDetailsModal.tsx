import { LoadingOverlay, Modal, useMantineTheme } from '@mantine/core';
import { useQuery } from 'react-query';

import { ExecutionDetailsAccordion } from './ExecutionDetailsAccordion';
import { ExecutionDetailsFooter } from './ExecutionDetailsFooter';

import { getNotification } from '../../api/activity';
import { colors, shadows, Title } from '../../design-system';

export function ExecutionDetailsModal({
  notificationId,
  modalVisibility,
  onClose,
}: {
  notificationId: string;
  modalVisibility: boolean;
  onClose: () => void;
}) {
  const theme = useMantineTheme();
  const { data: response, isLoading } = useQuery(['activity', notificationId], () => getNotification(notificationId), {
    enabled: !!notificationId,
    refetchInterval: 3000,
  });

  const { jobs, subscriber } = response?.data || {};

  return (
    <Modal
      opened={modalVisibility}
      overlayColor={theme.colorScheme === 'dark' ? colors.BGDark : colors.BGLight}
      overlayOpacity={0.7}
      styles={{
        modal: {
          backgroundColor: theme.colorScheme === 'dark' ? colors.B15 : colors.white,
          width: '90%',
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
      <LoadingOverlay
        visible={isLoading}
        overlayColor={theme.colorScheme === 'dark' ? colors.B30 : colors.B98}
        loaderProps={{
          color: colors.error,
        }}
        data-test-id="execution-details-modal-loading-overlay"
      />
      <ExecutionDetailsAccordion steps={jobs} subscriber={subscriber} />
      <ExecutionDetailsFooter />
    </Modal>
  );
}
