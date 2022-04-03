import { useMutation } from 'react-query';
import { INotificationTemplate } from '@novu/shared';
import { useEffect, useState } from 'react';
import { showNotification } from '@mantine/notifications';

import { updateTemplateStatus } from '../../api/templates';
import { colors } from '../../design-system';

export function useStatusChangeControllerHook(templateId: string, template: INotificationTemplate | undefined) {
  const [isTemplateActive, setIsTemplateActive] = useState<boolean>();
  const { isLoading: isStatusChangeLoading, mutateAsync: updateNotificationStatus } = useMutation<
    INotificationTemplate,
    { error: string; message: string; statusCode: number },
    { id: string; active: boolean }
  >(({ id, active }) => updateTemplateStatus(id, active));

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

    showNotification({
      message: 'Status changed successfully',
      color: 'green',
    });
  }

  return {
    changeActiveStatus,
    isTemplateActive,
    isStatusChangeLoading,
  };
}
