import { createContext, useEffect, useMemo, useCallback, useContext, useState } from 'react';
import { FormProvider, useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams } from 'react-router-dom';
import { DigestTypeEnum, INotificationTemplate, INotificationTrigger } from '@novu/shared';
import * as Sentry from '@sentry/react';
import { StepTypeEnum, ActorTypeEnum, EmailBlockTypeEnum, IEmailBlock, TextAlignEnum } from '@novu/shared';

import type { IForm, IStepEntity } from './formTypes';
import { useTemplateController } from './useTemplateController';
import { mapNotificationTemplateToForm, mapFormToCreateNotificationTemplate } from './templateToFormMappers';
import { errorMessage } from '../../../utils/notifications';
import { schema } from './notificationTemplateSchema';
import { v4 as uuid4 } from 'uuid';

const defaultEmailBlocks: IEmailBlock[] = [
  {
    type: EmailBlockTypeEnum.TEXT,
    content: '',
    styles: {
      textAlign: TextAlignEnum.LEFT,
    },
  },
];

const makeStep = (channelType: StepTypeEnum, id: string): IStepEntity => ({
  _id: id,
  uuid: uuid4(),
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
  ...(channelType === StepTypeEnum.DIGEST && {
    metadata: {
      type: DigestTypeEnum.REGULAR,
    },
  }),
  ...(channelType === StepTypeEnum.DELAY && {
    metadata: {
      type: DigestTypeEnum.REGULAR,
    },
  }),
});

interface ITemplateEditorFormContext {
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

const TemplateEditorFormContext = createContext<ITemplateEditorFormContext>({
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

const defaultValues: IForm = {
  name: '',
  notificationGroupId: '',
  description: '',
  identifier: '',
  tags: [],
  critical: false,
  steps: [],
  preferenceSettings: {
    email: true,
    sms: true,
    in_app: true,
    chat: true,
    push: true,
  },
};

const TemplateEditorFormProvider = ({ children }) => {
  const { templateId = '' } = useParams<{ templateId?: string }>();
  const methods = useForm<IForm>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange',
  });
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
      const form = mapNotificationTemplateToForm(template);
      reset(form);
      setTrigger(template.triggers[0]);
    }
  }, [isDirtyForm, template]);

  const onSubmit = useCallback(
    async (form: IForm, { onCreateSuccess } = {}) => {
      const payloadToCreate = mapFormToCreateNotificationTemplate(form);

      try {
        if (editMode) {
          const response = await updateNotificationTemplate({
            id: templateId,
            data: {
              ...payloadToCreate,
              identifier: form.identifier,
            },
          });
          setTrigger(response.triggers[0]);
          reset(form);
        } else {
          const response = await createNotificationTemplate({ ...payloadToCreate, active: true, draft: false });
          setTrigger(response.triggers[0]);
          setCreatedTemplateId(response._id || '');
          reset(payloadToCreate);
          onCreateSuccess?.();
        }
      } catch (e: any) {
        Sentry.captureException(e);

        errorMessage(e.message || 'Unexpected error occurred');
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
      const newStep: IStepEntity = makeStep(channelType, id);

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

  const value = useMemo<ITemplateEditorFormContext>(
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

  return (
    <FormProvider {...methods}>
      <TemplateEditorFormContext.Provider value={value}>{children}</TemplateEditorFormContext.Provider>
    </FormProvider>
  );
};

const useTemplateEditorForm = () => useContext(TemplateEditorFormContext);

export { TemplateEditorFormProvider, useTemplateEditorForm };
