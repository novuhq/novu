import { createContext, useEffect, useMemo, useCallback, useContext, useState } from 'react';
import { FormProvider, useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { DigestTypeEnum, INotificationTemplate, INotificationTrigger } from '@novu/shared';
import * as Sentry from '@sentry/react';
import { StepTypeEnum, ActorTypeEnum, EmailBlockTypeEnum, IEmailBlock, TextAlignEnum } from '@novu/shared';

import type { IForm, IStepEntity } from './formTypes';
import { useTemplateController } from './useTemplateController';
import { mapNotificationTemplateToForm, mapFormToCreateNotificationTemplate } from './templateToFormMappers';
import { errorMessage, successMessage } from '../../../utils/notifications';
import { schema } from './notificationTemplateSchema';
import { v4 as uuid4 } from 'uuid';
import { useBlocker, useNotificationGroup } from '../../../hooks';
import { useInterval } from '@mantine/hooks';
import { useBasePath } from '../hooks/useBasePath';
import { hideNotification, showNotification } from '@mantine/notifications';

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
  trigger?: INotificationTrigger;
  createdTemplateId?: string;
  onSubmit: (data: IForm) => Promise<void>;
  addStep: (channelType: StepTypeEnum, id: string, stepIndex?: number) => void;
  deleteStep: (index: number) => void;
}

const TemplateEditorFormContext = createContext<ITemplateEditorFormContext>({
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  trigger: undefined,
  createdTemplateId: undefined,
  onSubmit: (() => {}) as any,
  addStep: () => {},
  deleteStep: () => {},
});

const defaultValues: IForm = {
  name: 'Untitled',
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
  const navigate = useNavigate();
  const [{ trigger, createdTemplateId }, setState] = useState<{
    trigger?: INotificationTrigger;
    createdTemplateId?: string;
  }>({});

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

  const basePath = useBasePath();

  const handleBlockedNavigation = useCallback((nextLocation) => {
    if (!nextLocation.location.pathname.includes(basePath)) {
      const notificationId = 'savingOnNavigation';

      showNotification({
        message: 'We are saving your template please wait until we are done',
        color: 'blue',
        id: notificationId,
        autoClose: false,
      });
      onSubmit(methods.getValues(), false)
        .then((value) => {
          interval.stop();
          hideNotification(notificationId);
          successMessage('Trigger code is updated successfully');
          navigate(nextLocation.location.pathname);

          return value;
        })
        .catch(() => {
          interval.stop();
        });

      return false;
    }

    return true;
  }, []);

  useBlocker(handleBlockedNavigation, methods.formState.isDirty);

  const interval = useInterval(() => {
    if (!methods.formState.isDirty) {
      return;
    }
    interval.stop();
    onSubmit(methods.getValues()).finally(() => {
      interval.start();
    });
  }, 1000);

  useEffect(() => {
    interval.start();

    return interval.stop;
  }, []);

  const {
    template,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    updateNotificationTemplate,
    createNotificationTemplate,
  } = useTemplateController(templateId);
  const { groups, loading: loadingGroups } = useNotificationGroup();

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

  useEffect(() => {
    if (!!templateId || groups.length === 0 || localStorage.getItem('blueprintId') !== null) {
      return;
    }

    const values = methods.getValues();

    if (!values.notificationGroupId) {
      values.notificationGroupId = groups[0]._id;
    }

    const submit = async () => {
      const payloadToCreate = mapFormToCreateNotificationTemplate(values);
      const response = await createNotificationTemplate({ ...payloadToCreate, active: true, draft: false });
      setTrigger(response.triggers[0]);
      setCreatedTemplateId(response._id || '');
      reset(payloadToCreate);
      navigate(`/templates/edit/${response._id || ''}`);
    };

    submit();
  }, [templateId, groups, localStorage.getItem('blueprintId')]);

  const onSubmit = useCallback(
    async (form: IForm, showMessage = true) => {
      const payloadToCreate = mapFormToCreateNotificationTemplate(form);

      try {
        const response = await updateNotificationTemplate({
          id: templateId,
          data: {
            ...payloadToCreate,
            identifier: form.identifier,
          },
        });
        setTrigger(response.triggers[0]);
        reset(form);
        if (showMessage) {
          successMessage('Trigger code is updated successfully');
        }
      } catch (e: any) {
        Sentry.captureException(e);

        errorMessage(e.message || 'Unexpected error occurred');
      }
    },
    [templateId, updateNotificationTemplate, reset, setTrigger]
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
      isLoading: isLoading || loadingGroups,
      isCreating,
      isUpdating,
      isDeleting,
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

      trigger,
      createdTemplateId,
      onSubmit,
      addStep,
      deleteStep,
      loadingGroups,
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
