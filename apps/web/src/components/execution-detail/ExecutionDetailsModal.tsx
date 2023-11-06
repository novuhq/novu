import { useEffect, useState } from 'react';
import { Center, LoadingOverlay, Modal, UnstyledButton, useMantineTheme } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { JobStatusEnum } from '@novu/shared';

import { ExecutionDetailsAccordion } from './ExecutionDetailsAccordion';
import { ExecutionDetailsFooter } from './ExecutionDetailsFooter';
import { getNotification } from '../../api/activity';
import { colors, shadows, Text, Title } from '@novu/design-system';
import { When } from '../utils/When';
import { useNotificationStatus } from '../../pages/activities/hooks/useNotificationStatus';

export function ExecutionDetailsModal({
  notificationId,
  modalVisibility,
  onClose,
  onViewDigestExecution,
}: {
  notificationId: string;
  modalVisibility: boolean;
  onClose: () => void;
  onViewDigestExecution?: (digestNotificationId: string) => void;
}) {
  const theme = useMantineTheme();
  const [shouldRefetch, setShouldRefetch] = useState(true);
  const { data: response, isInitialLoading } = useQuery(
    ['activity', notificationId],
    () => getNotification(notificationId),
    {
      enabled: !!notificationId,
      refetchInterval: shouldRefetch ? 1000 : false,
    }
  );

  const status = useNotificationStatus(response?.data);

  useEffect(() => {
    if (
      status &&
      [JobStatusEnum.FAILED, JobStatusEnum.COMPLETED, JobStatusEnum.CANCELED, JobStatusEnum.MERGED].includes(status)
    ) {
      setShouldRefetch(false);
    }
  }, [status]);

  const {
    jobs,
    _digestedNotificationId: digestedNotificationId,
    to: subscriberVariables,
    template,
  } = response?.data || {};
  const { triggers } = template || {};
  const identifier = triggers ? triggers[0]?.identifier : undefined;

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
          paddingInline: '8px',
        },
      }}
      title={<Title size={2}>Execution Details for {template?.name ?? ''}</Title>}
      sx={{ backdropFilter: 'blur(10px)' }}
      shadow={theme.colorScheme === 'dark' ? shadows.dark : shadows.medium}
      radius="md"
      size="lg"
      onClose={onClose}
      centered
      overflow="inside"
    >
      <LoadingOverlay
        visible={isInitialLoading}
        overlayColor={theme.colorScheme === 'dark' ? colors.B30 : colors.B98}
        loaderProps={{
          color: colors.error,
        }}
        data-test-id="execution-details-modal-loading-overlay"
      />

      <ExecutionDetailsAccordion identifier={identifier} steps={jobs} subscriberVariables={subscriberVariables} />
      <When truthy={digestedNotificationId}>
        <Center mt={20}>
          <Text mr={10} size="md" color={colors.B60}>
            Remaining execution has been merged to an active Digest.
          </Text>
        </Center>
        <When truthy={onViewDigestExecution}>
          <Center mt={10}>
            <UnstyledButton
              onClick={() => {
                onViewDigestExecution && onViewDigestExecution(digestedNotificationId);
              }}
            >
              <Text gradient>View Digest Execution</Text>
            </UnstyledButton>
          </Center>
        </When>
      </When>
      <ExecutionDetailsFooter />
    </Modal>
  );
}
