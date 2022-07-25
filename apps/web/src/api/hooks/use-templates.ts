import { useQuery } from 'react-query';
import { INotificationTemplate } from '@novu/shared';
import { getNotificationsList } from '../notifications';
import { useEnvController } from '../../store/use-env-controller';

export function useTemplates() {
  const { environment } = useEnvController();
  const { data, isLoading } = useQuery<INotificationTemplate[]>(
    ['notificationsList', environment?._id],
    getNotificationsList
  );

  return {
    templates: data,
    loading: isLoading,
  };
}
