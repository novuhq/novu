import { createContext, useEffect, useMemo, useCallback, useContext, useState } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { INotificationTemplate, INotificationTrigger } from '@novu/shared';
import { showNotification } from '@mantine/notifications';
import * as Sentry from '@sentry/react';
import {
  ICreateNotificationTemplateDto,
  StepTypeEnum,
  ActorTypeEnum,
  ChannelCTATypeEnum,
  EmailBlockTypeEnum,
  IEmailBlock,
  TextAlignEnum,
} from '@novu/shared';

import type { IForm, IStepEntity } from './formTypes';
import { useTemplateController } from './useTemplateController';

const defaultEmailBlocks: IEmailBlock[] = [
  {
    type: EmailBlockTypeEnum.TEXT,
    content: '',
    styles: {
      textAlign: TextAlignEnum.LEFT,
    },
  },
];

interface ITemplateEditorContext {
  template?: INotificationTemplate;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  editMode: boolean;
  trigger?: INotificationTrigger;
  createdTemplateId?: string;
  onSubmit: (data: IForm, callbacks?: { onCreateSuccess: () => void }) => Promise<void>;
  addStep: (channelType: StepTypeEnum, id: string, stepIndex?: number) => void;
  deleteStep: (index: number) => void;
}

const TemplateEditorContext = createContext<ITemplateEditorContext>({
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  editMode: true,
  trigger: undefined,
  createdTemplateId: undefined,
  onSubmit: (() => {}) as any,
  addStep: () => {},
  deleteStep: () => {},
});

const { Provider } = TemplateEditorContext;

const TemplateEditorProvider = ({ children }) => {
  const { templateId = '' } = useParams<{ templateId?: string }>();
  const methods = useFormContext<IForm>();
  const [{ editMode, trigger, createdTemplateId }, setState] = useState<{
    editMode: boolean;
    trigger?: INotificationTrigger;
    createdTemplateId?: string;
  }>({
    editMode: !!templateId,
  });

  const setTrigger = useCallback(
    (newTrigger: INotificationTrigger) => setState((old) => ({ ...old, trigger: newTrigger })),
    [setState]
  );

  const setCreatedTemplateId = useCallback(
    (newCreatedTemplateId: string) => setState((old) => ({ ...old, createdTemplateId: newCreatedTemplateId })),
    [setState]
  );

  const {
    reset,
    formState: { isDirty: isDirtyForm },
  } = methods;

  const steps = useFieldArray({
    control: methods.control,
    name: 'steps',
  });

  const {
    template,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    updateNotificationTemplate,
    createNotificationTemplate,
  } = useTemplateController(templateId);

  useEffect(() => {
    if (isDirtyForm) {
      return;
    }

    if (template && template.steps) {
      const formValues: IForm = {
        notificationGroupId: template._notificationGroupId,
        name: template.name,
        description: template.description ?? '',
        tags: template.tags,
        identifier: template.triggers[0].identifier,
        critical: template.critical,
        preferenceSettings: template.preferenceSettings,
        steps: [],
      };

      formValues.steps = (template.steps as IStepEntity[]).map((item) => {
        if (item.template.type === StepTypeEnum.EMAIL) {
          return {
            ...item,
            ...(!item.replyCallback && {
              replyCallback: {
                active: false,
                url: '',
              },
            }),
            template: {
              ...item.template,
              layoutId: item.template._layoutId ?? '',
              preheader: item.template.preheader ?? '',
              content: item.template.content,
              ...(item.template?.contentType === 'customHtml' && {
                htmlContent: item.template.content as string,
                content: [],
              }),
            },
          };
        }
        if (item.template.type === StepTypeEnum.IN_APP) {
          return {
            ...item,
            template: {
              ...item.template,
              feedId: item.template._feedId ?? '',
              actor: item.template.actor?.type
                ? item.template.actor
                : {
                    type: ActorTypeEnum.NONE,
                    data: null,
                  },
              enableAvatar: item.template.actor?.type && item.template.actor.type !== ActorTypeEnum.NONE ? true : false,
              cta: {
                data: item.template.cta?.data ?? { url: '' },
                type: ChannelCTATypeEnum.REDIRECT,
                action: item.template.cta?.action ?? '',
              },
            },
          };
        }

        return item;
      });

      reset(formValues);
      setTrigger(template.triggers[0]);
    }
  }, [isDirtyForm, template]);

  const onSubmit = useCallback(
    async (data: IForm, { onCreateSuccess } = {}) => {
      let stepsToSave = data.steps;

      stepsToSave = stepsToSave.map((step: IStepEntity) => {
        if (step.template.type === StepTypeEnum.EMAIL && step.template.contentType === 'customHtml') {
          step.template.content = step.template.htmlContent as string;
        }

        if (step.template.type === StepTypeEnum.IN_APP) {
          if (!step.template.enableAvatar) {
            step.template.actor = {
              type: ActorTypeEnum.NONE,
              data: null,
            };
          }

          delete step.template.enableAvatar;
        }

        return step;
      });

      const payloadToCreate: ICreateNotificationTemplateDto = {
        name: data.name,
        notificationGroupId: data.notificationGroupId,
        description: data.description !== '' ? data.description : undefined,
        tags: data.tags,
        critical: data.critical,
        preferenceSettings: data.preferenceSettings,
        steps: stepsToSave,
      };

      try {
        if (editMode) {
          const response = await updateNotificationTemplate({
            id: templateId,
            data: {
              ...payloadToCreate,
              identifier: data.identifier,
            },
          });
          setTrigger(response.triggers[0]);
          reset(data);
        } else {
          const response = await createNotificationTemplate({ ...payloadToCreate, active: true, draft: false });
          setTrigger(response.triggers[0]);
          setCreatedTemplateId(response._id || '');
          reset(payloadToCreate);
          onCreateSuccess?.();
        }
      } catch (e: any) {
        Sentry.captureException(e);

        showNotification({
          message: e.message || 'Un-expected error occurred',
          color: 'red',
        });
      }
    },
    [
      templateId,
      editMode,
      updateNotificationTemplate,
      createNotificationTemplate,
      reset,
      setTrigger,
      setCreatedTemplateId,
    ]
  );

  const addStep = useCallback(
    (channelType: StepTypeEnum, id: string, stepIndex?: number) => {
      const newStep: IStepEntity = {
        _id: id,
        template: {
          type: channelType,
          content: channelType === StepTypeEnum.EMAIL ? defaultEmailBlocks : '',
          contentType: 'editor',
          variables: [],
          ...(channelType === StepTypeEnum.IN_APP && {
            actor: {
              type: ActorTypeEnum.NONE,
              data: null,
            },
            enableAvatar: false,
          }),
        },
        active: true,
        shouldStopOnFail: false,
        filters: [],
        ...(channelType === StepTypeEnum.EMAIL && {
          replyCallback: {
            active: false,
          },
        }),
      };

      if (stepIndex != null) {
        steps.insert(stepIndex, newStep);
      } else {
        steps.append(newStep);
      }
    },
    [steps]
  );

  const deleteStep = useCallback(
    (index: number) => {
      steps.remove(index);
    },
    [steps]
  );

  const value = useMemo<ITemplateEditorContext>(
    () => ({
      template,
      isLoading,
      isCreating,
      isUpdating,
      isDeleting,
      editMode: editMode,
      trigger: trigger,
      createdTemplateId: createdTemplateId,
      onSubmit,
      addStep,
      deleteStep,
    }),
    [
      template,
      isLoading,
      isCreating,
      isUpdating,
      isDeleting,
      editMode,
      trigger,
      createdTemplateId,
      onSubmit,
      addStep,
      deleteStep,
    ]
  );

  return <Provider value={value}>{children}</Provider>;
};

const useTemplateEditor = () => useContext(TemplateEditorContext);

export { TemplateEditorProvider, useTemplateEditor };
