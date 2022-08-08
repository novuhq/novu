import { useEffect } from 'react';
import {
  DigestUnitEnum,
  ICreateNotificationTemplateDto,
  IMessageTemplate,
  INotificationTemplate,
  IUpdateNotificationTemplate,
  StepTypeEnum,
} from '@novu/shared';
import { showNotification } from '@mantine/notifications';
import { useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useFormContext } from 'react-hook-form';
import * as Sentry from '@sentry/react';
import { createTemplate, updateTemplate, deleteTemplateById } from '../../api/templates';
import { useTemplateFetcher } from './use-template.fetcher';
import { QueryKeys } from '../../api/query.keys';
import { useTemplateEditor } from './TemplateEditorProvider';
import { useFieldArrayContext } from './FieldArrayProvider';
import { successMessage } from '../../utils/notifications';

export function useTemplateController(templateId: string) {
  const {
    isDirty,
    setIsDirty,
    editMode,
    setEditMode,
    isEmbedModalVisible,
    setIsEmbedModalVisible,
    trigger,
    setTrigger,
  } = useTemplateEditor();

  useEffect(() => {
    setEditMode(!!templateId);
  }, []);

  const methods = useFormContext<IForm>();

  const {
    reset,
    register,
    handleSubmit,
    setValue,
    control,
    watch,
    formState: { errors, isDirty: isDirtyForm },
  } = methods;

  const {
    fieldArrays: { steps },
  } = useFieldArrayContext();

  const navigate = useNavigate();
  const { template, refetch, loading: loadingEditTemplate } = useTemplateFetcher(templateId);
  const client = useQueryClient();

  const deleteTemplate = () => deleteTemplateById(templateId);

  const { isLoading, mutateAsync: createNotification } = useMutation<
    INotificationTemplate,
    { error: string; message: string; statusCode: number },
    ICreateNotificationTemplateDto
  >(createTemplate);

  const { isLoading: isUpdateLoading, mutateAsync: updateNotification } = useMutation<
    INotificationTemplate,
    { error: string; message: string; statusCode: number },
    { id: string; data: Partial<IUpdateNotificationTemplate> }
  >(({ id, data }) => updateTemplate(id, data));

  useEffect(() => {
    if (isDirtyForm) {
      return;
    }
    if (template && template.steps) {
      const formValues: IForm = {
        notificationGroup: template._notificationGroupId,
        name: template.name,
        description: template.description as string,
        tags: template.tags,
        steps: [],
      };

      formValues.steps = (template.steps as StepEntity[]).map((item) => {
        if (item.template.type === StepTypeEnum.EMAIL && item.template?.contentType === 'customHtml') {
          return {
            ...item,
            template: {
              ...item.template,
              htmlContent: item.template.content as string,
              content: [],
            },
          };
        }
        if (item.template.type === StepTypeEnum.IN_APP) {
          return {
            ...item,
            template: {
              ...item.template,
              feedId: item.template._feedId || '',
            },
          };
        }

        return item;
      });

      reset(formValues);
      setTrigger(template.triggers[0]);
    } else {
      reset(JSON.parse(JSON.stringify(defaultFormValues)));
    }
  }, [template]);

  useEffect(() => {
    setEditMode(!!templateId);
  }, [templateId]);

  const onSubmit = async (data: IForm) => {
    let stepsToSave = data.steps as StepEntity[];
    stepsToSave = stepsToSave.map((step: StepEntity) => {
      if (step.template.type === StepTypeEnum.EMAIL && step.template.contentType === 'customHtml') {
        step.template.content = step.template.htmlContent as string;
      }

      return step;
    });
    const payload: ICreateNotificationTemplateDto = {
      notificationGroupId: data.notificationGroup,
      name: data.name,
      description: data.description,
      tags: data.tags,
      steps: stepsToSave,
    };

    try {
      if (editMode) {
        await updateNotification({
          id: templateId,
          data: payload,
        });

        refetch();
        reset(payload);
        setIsDirty(false);

        await client.refetchQueries(QueryKeys.changesCount);
        showNotification({
          message: 'Template updated successfully',
          color: 'green',
        });
      } else {
        const response = await createNotification({ ...payload, active: true, draft: false });

        setTrigger(response.triggers[0]);
        setIsEmbedModalVisible(true);
        reset(payload);
        setIsDirty(false);
        await client.refetchQueries(QueryKeys.changesCount);
        successMessage('Template saved successfully');
      }
    } catch (e: any) {
      Sentry.captureException(e);

      showNotification({
        message: e.message || 'Un-expected error occurred',
        color: 'red',
      });
    }
  };

  const onTriggerModalDismiss = () => {
    navigate('/templates');
  };

  const addStep = (channelType: StepTypeEnum, id: string) => {
    steps.append({
      _id: id,
      template: {
        type: channelType,
        content: [],
        contentType: 'editor',
        subject: '',
        name: 'Email Message Template',
      },
      active: true,
      filters: [],
    });
  };

  const deleteStep = (index: number) => {
    steps.remove(index);
  };

  return {
    addStep,
    deleteStep,
    editMode,
    template,
    deleteTemplate,
    onSubmit,
    isEmbedModalVisible,
    trigger,
    isLoading,
    isUpdateLoading,
    loadingEditTemplate,
    onTriggerModalDismiss,
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    methods,
    errors,
    setIsDirty,
    isDirty: isDirtyForm || isDirty,
  };
}

interface ITemplates extends IMessageTemplate {
  htmlContent?: string;
}

export interface StepEntity {
  id: string;
  _id?: string;

  _templateId: string;

  template: ITemplates;

  filters?: any[];

  active: boolean;

  metadata?: {
    amount?: number;
    unit?: DigestUnitEnum;
    digestKey?: string;
  };
}

export interface IForm {
  notificationGroup: string;
  name: string;
  description: string;
  tags: string[];
  steps: StepEntity[];
}

const defaultFormValues = {
  steps: [] as StepEntity[],
};
