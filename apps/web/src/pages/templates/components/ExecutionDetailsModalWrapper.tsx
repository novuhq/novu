import { useQuery } from '@tanstack/react-query';
import { LoadingOverlay, useMantineTheme } from '@mantine/core';

import { getActivityList } from '../../../api/activity';
import { ExecutionDetailsModal } from '../../../components/execution-detail/ExecutionDetailsModal';
import { colors } from '@novu/design-system';
import { useEffect } from 'react';

interface Props {
  transactionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ExecutionDetailsModalWrapper = ({ transactionId, isOpen, onClose }: Props) => {
  const theme = useMantineTheme();
  const {
    data: notification,
    isFetching,
    refetch,
  } = useQuery<{ data: any[] }>(['activitiesList', transactionId], () => getActivityList(0, { transactionId }), {
    enabled: transactionId.length > 0,
  });

  useEffect(() => {
    if (!isFetching && !notification?.data.length) {
      refetch();
    }
  }, [isFetching, notification, refetch]);

  if (!isOpen || !transactionId) return null;

  return (
    <>
      <LoadingOverlay
        visible={isFetching}
        overlayColor={theme.colorScheme === 'dark' ? colors.B30 : colors.B98}
        loaderProps={{
          color: colors.error,
        }}
      />
      <ExecutionDetailsModal notificationId={notification?.data[0]?._id} modalVisibility={isOpen} onClose={onClose} />
    </>
  );
};
