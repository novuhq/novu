import { useMutation } from 'react-query';
import { INotificationTemplate } from '@notifire/shared';
import { useEffect, useState } from 'react';
import { updateTemplateStatus } from '../../../api/templates';

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
  }

  return {
    changeActiveStatus,
    isTemplateActive,
    isStatusChangeLoading,
  };
}
