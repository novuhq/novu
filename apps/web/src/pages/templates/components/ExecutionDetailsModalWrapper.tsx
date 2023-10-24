import { useQuery } from '@tanstack/react-query';
import { LoadingOverlay, useMantineTheme } from '@mantine/core';

import { getActivityList } from '../../../api/activity';
import { ExecutionDetailsModal } from '../../../components/execution-detail/ExecutionDetailsModal';
import { colors } from '@novu/design-system';

interface Props {
  transactionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ExecutionDetailsModalWrapper = ({ transactionId, isOpen, onClose }: Props) => {
  const theme = useMantineTheme();
  const { data: notification, isFetching } = useQuery<{ data: any[] }>(
    ['activitiesList', transactionId],
    () => getActivityList(0, { transactionId }),
    {
      enabled: transactionId.length > 0,
    }
  );

  return (
    <>
      <LoadingOverlay
        visible={isFetching}
        overlayColor={theme.colorScheme === 'dark' ? colors.B30 : colors.B98}
        loaderProps={{
          color: colors.error,
        }}
      />
      {notification?.data?.length && notification?.data?.length > 0 ? (
        <ExecutionDetailsModal notificationId={notification?.data[0]._id} modalVisibility={isOpen} onClose={onClose} />
      ) : null}
    </>
  );
};
