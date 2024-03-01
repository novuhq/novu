import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { IResponseError, INotificationTemplate } from '@novu/shared';

import { updateTemplateStatus } from '../../../api/notification-templates';
import { QueryKeys } from '../../../api/query.keys';
import { successMessage } from '../../../utils/notifications';

export function useStatusChangeControllerHook(templateId: string, template: INotificationTemplate | undefined) {
  const queryClient = useQueryClient();
  const [isTemplateActive, setIsTemplateActive] = useState<boolean>();
  const { isLoading: isStatusChangeLoading, mutateAsync: updateNotificationStatus } = useMutation<
    INotificationTemplate,
    IResponseError,
    { id: string; active: boolean }
  >(({ id, active }) => updateTemplateStatus(id, active), {
    onSuccess: () => {
      queryClient.refetchQueries([QueryKeys.changesCount]);
    },
  });

  useEffect(() => {
    if (template) {
      setIsTemplateActive(template.active);
    }
  }, [template]);

  async function changeActiveStatus(selected: boolean) {
    setIsTemplateActive(selected);

    await updateNotificationStatus({
      id: templateId,
      active: selected,
    });

    successMessage('Status changed successfully');
  }

  return {
    changeActiveStatus,
    isTemplateActive,
    isStatusChangeLoading,
  };
}
