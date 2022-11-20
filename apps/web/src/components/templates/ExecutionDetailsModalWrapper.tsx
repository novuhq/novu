import { useQuery } from 'react-query';
import { getActivityList } from '../../api/activity';
import { ExecutionDetailsModal } from '../activity/ExecutionDetailsModal';
import { LoadingOverlay, useMantineTheme } from '@mantine/core';
import { colors } from '../../design-system';

interface Props {
  transactionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ExecutionDetailsModalWrapper = ({ transactionId, isOpen, onClose }: Props) => {
  const theme = useMantineTheme();
  const {
    data: notification,
    isLoading,
    isFetching,
  } = useQuery<{ data: any[] }>(['activitiesList', transactionId], () => getActivityList(0, { transactionId }), {
    enabled: transactionId.length > 0,
  });

  return (
    <>
      <LoadingOverlay
        visible={isLoading || isFetching}
        overlayColor={theme.colorScheme === 'dark' ? colors.B30 : colors.B98}
        loaderProps={{
          color: colors.error,
        }}
      />
      {notification?.data?.length && (
        <ExecutionDetailsModal notificationId={notification?.data[0]._id} modalVisibility={isOpen} onClose={onClose} />
      )}
    </>
  );
};
