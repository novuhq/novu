import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import type { IResponseError, INotificationTemplate, IUpdateNotificationTemplateDto } from '@novu/shared';

import { updateTemplate } from '../../notification-templates';
import { QueryKeys } from '../../query.keys';

export const useUpdateTemplate = (
  options: UseMutationOptions<
    INotificationTemplate,
    IResponseError,
    { id: string; data: Partial<IUpdateNotificationTemplateDto> }
  > = {}
) => {
  const client = useQueryClient();

  const { mutateAsync: updateTemplateMutation, ...rest } = useMutation<
    INotificationTemplate,
    IResponseError,
    { id: string; data: Partial<IUpdateNotificationTemplateDto> }
  >(({ id, data }) => updateTemplate(id, data), {
    ...options,
    onSuccess: async (newTemplate, variables, context) => {
      await client.setQueryData([QueryKeys.getTemplateById(newTemplate._id)], newTemplate);
      options?.onSuccess?.(newTemplate, variables, context);
    },
  });

  return {
    updateTemplateMutation,
    ...rest,
  };
};
