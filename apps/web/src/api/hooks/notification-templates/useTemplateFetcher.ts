import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { INotificationTemplate } from '@novu/shared';

import { getTemplateById } from '../../notification-templates';
import { QueryKeys } from '../../query.keys';

export function useTemplateFetcher(
  { templateId }: { templateId?: string },
  options: UseQueryOptions<INotificationTemplate, any, INotificationTemplate> = {}
) {
  const { data: template, ...rest } = useQuery<INotificationTemplate>(
    [QueryKeys.getTemplateById(templateId)],
    () => getTemplateById(templateId as string),
    {
      enabled: !!templateId,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchInterval: false,
      ...options,
    }
  );

  return {
    template,
    ...rest,
  };
}
