import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  IResponseError,
  ICreateNotificationTemplateDto,
  INotificationTemplate,
  IUpdateNotificationTemplateDto,
} from '@novu/shared';

import { useTemplateFetcher } from '../../../api/hooks';
import { QueryKeys } from '../../../api/query.keys';
import { createTemplate, deleteTemplateById, updateTemplate } from '../../../api/notification-templates';

export function useTemplateController(
  templateId?: string,
  { onFetchSuccess }: { onFetchSuccess?: (template: INotificationTemplate) => void } = {}
) {
  const {
    template,
    refetch,
    isInitialLoading: isLoading,
  } = useTemplateFetcher({ templateId }, { onSuccess: onFetchSuccess });
  const client = useQueryClient();

  const { isLoading: isCreating, mutateAsync: createNotificationTemplate } = useMutation<
    INotificationTemplate & { __source?: string },
    IResponseError,
    { template: ICreateNotificationTemplateDto } & { params: { __source?: string } }
  >((data) => createTemplate(data.template, data.params), {
    onSuccess: async () => {
      await client.refetchQueries([QueryKeys.changesCount]);
    },
  });

  const { isLoading: isUpdating, mutateAsync: updateNotificationTemplate } = useMutation<
    INotificationTemplate,
    IResponseError,
    { id: string; data: Partial<IUpdateNotificationTemplateDto> }
  >(({ id, data }) => updateTemplate(id, data), {
    onSuccess: async () => {
      refetch();
      await client.refetchQueries([QueryKeys.changesCount]);
    },
  });

  const { isLoading: isDeleting, mutate: deleteNotificationTemplate } = useMutation<unknown, IResponseError>(() => {
    if (!templateId) {
      return Promise.resolve();
    }

    return deleteTemplateById(templateId);
  });

  return {
    template,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    updateNotificationTemplate,
    createNotificationTemplate,
    deleteNotificationTemplate,
  };
}
