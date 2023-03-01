import { useQuery } from '@tanstack/react-query';
import { INotificationTemplate } from '@novu/shared';
import { getTemplateById } from '../../api/notification-templates';

export function useTemplateFetcher(templateId) {
  const {
    isInitialLoading,
    data: template,
    refetch,
  } = useQuery<INotificationTemplate>([`notificationById:${templateId}`], () => getTemplateById(templateId), {
    enabled: !!templateId,
    refetchOnMount: false,
    refetchInterval: false,
  });

  return {
    template,
    loading: isInitialLoading,
    refetch,
  };
}
