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
    isLoading,
    refetch,
  } = useQuery<{ data: any[] }>(['activitiesList', transactionId], () => getActivityList(0, { transactionId }), {
    enabled: !!transactionId && isOpen,
    refetchInterval: 1000,
  });

  if (!isOpen || !transactionId) return null;

  return (
    <>
      <LoadingOverlay
        visible={isLoading}
        overlayColor={theme.colorScheme === 'dark' ? colors.B30 : colors.B98}
        loaderProps={{
          color: colors.error,
        }}
      />
      <ExecutionDetailsModal notificationId={notification?.data[0]?._id} modalVisibility={isOpen} onClose={onClose} />
    </>
  );
};
