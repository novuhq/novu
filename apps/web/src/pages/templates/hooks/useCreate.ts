import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { INotificationTrigger, WorkflowCreationSourceEnum } from '@novu/shared';
import { IForm } from '../components/formTypes';
import { mapFormToCreateNotificationTemplate } from '../components/templateToFormMappers';
import { useTemplateController } from '../components/useTemplateController';

export const useCreate = (
  templateId: string,
  groups: { _id: string }[],
  setTrigger: (trigger: INotificationTrigger) => void,
  getValues: () => IForm
) => {
  const navigate = useNavigate();
  const { createNotificationTemplate } = useTemplateController(templateId);

  useEffect(() => {
    if (!!templateId || !groups || groups.length === 0 || localStorage.getItem('blueprintId') !== null) {
      return;
    }

    const values = getValues();

    if (!values.notificationGroupId) {
      values.notificationGroupId = groups[0]._id;
    }

    const submit = async () => {
      const payloadToCreate = mapFormToCreateNotificationTemplate(values);
      const response = await createNotificationTemplate({
        template: {
          ...payloadToCreate,
          active: true,
          draft: false,
        },
        params: {
          __source: WorkflowCreationSourceEnum.EDITOR,
        },
      });
      setTrigger(response.triggers[0]);
      navigate(`/workflows/edit/${response._id || ''}`);
    };

    submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, groups, localStorage.getItem('blueprintId')]);
};
