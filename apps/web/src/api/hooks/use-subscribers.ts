import { useQuery } from 'react-query';
import { INotificationTemplate } from '@novu/shared';
import { getSubscribersList } from '../subscribers';
import { useEnvController } from '../../store/use-env-controller';

export function useSubscribers(page = 0, limit = 0) {
  const { environment } = useEnvController();
  const { data, isLoading } = useQuery<any[]>(['subscribersList', environment?._id], () =>
    getSubscribersList(page, limit)
  );

  return {
    subscibers: [],
    loading: isLoading,
  };
}
