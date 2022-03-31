import { useQuery } from 'react-query';
import { INotificationTemplate } from '@novu/shared';
import { getTemplateById } from '../../api/templates';

export function useTemplateFetcher(templateId) {
  const {
    isLoading: loading,
    data: template,
    refetch,
  } = useQuery<INotificationTemplate>(`notificationById:${templateId}`, () => getTemplateById(templateId), {
    enabled: !!templateId,
    refetchOnMount: false,
    refetchInterval: false,
  });

  return {
    template,
    loading,
    refetch,
  };
}
