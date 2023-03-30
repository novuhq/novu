import { createContext, useEffect, useMemo, useCallback, useContext, useState } from 'react';
import { FormProvider, useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { DigestTypeEnum, INotificationTemplate, INotificationTrigger } from '@novu/shared';
import * as Sentry from '@sentry/react';
import { StepTypeEnum, ActorTypeEnum, EmailBlockTypeEnum, IEmailBlock, TextAlignEnum } from '@novu/shared';

import type { IForm, IStepEntity } from './formTypes';
import { useTemplateController } from './useTemplateController';
import { mapNotificationTemplateToForm, mapFormToCreateNotificationTemplate } from './templateToFormMappers';
import { errorMessage, successMessage } from '../../../utils/notifications';
import { schema } from './notificationTemplateSchema';
import { v4 as uuid4 } from 'uuid';
import { useNotificationGroup } from '../../../hooks';
import { useTimeout } from '@mantine/hooks';
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

const notificationId = 'savingOnNavigation';

interface ITemplateEditorFormContext {
  template?: INotificationTemplate;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  trigger?: INotificationTrigger;
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
  const [trigger, setTrigger] = useState<INotificationTrigger>();

  const {
    reset,
    formState: { isDirty: isDirtyForm },
  } = methods;

  const steps = useFieldArray({
    control: methods.control,
    name: 'steps',
  });

  const basePath = useBasePath();

  const { start, clear } = useTimeout(() => {
    showNotification({
      message: 'We are saving your changes...',
      color: 'blue',
      id: notificationId,
      autoClose: false,
    });
  }, 3000);

  const { pathname } = useLocation();

  useEffect(() => {
    const isTouring = localStorage.getItem('tour-digest') !== null;

    if (!methods.formState.isDirty || isTouring) {
      return;
    }
    start();
    onSubmit(methods.getValues())
      .then((value) => {
        clear();
        hideNotification(notificationId);

        return value;
      })
      .catch(() => {});
  }, [pathname]);

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
      onSubmit,
      addStep,
      deleteStep,
    }),
    [template, isLoading, isCreating, isUpdating, isDeleting, trigger, onSubmit, addStep, deleteStep, loadingGroups]
  );

  return (
    <FormProvider {...methods}>
      <TemplateEditorFormContext.Provider value={value}>{children}</TemplateEditorFormContext.Provider>
    </FormProvider>
  );
};

const useTemplateEditorForm = () => useContext(TemplateEditorFormContext);

export { TemplateEditorFormProvider, useTemplateEditorForm };
