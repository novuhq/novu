import { createContext, useEffect, useMemo, useCallback, useContext, useState } from 'react';
import slugify from 'slugify';
import { FormProvider, useForm, useFieldArray, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams } from 'react-router-dom';
import * as cloneDeep from 'lodash.clonedeep';
import {
  DelayTypeEnum,
  DigestTypeEnum,
  DigestUnitEnum,
  INotificationTemplate,
  INotificationTrigger,
  NotificationTemplateTypeEnum,
} from '@novu/shared';
import * as Sentry from '@sentry/react';
import { StepTypeEnum, ActorTypeEnum, EmailBlockTypeEnum, IEmailBlock, TextAlignEnum } from '@novu/shared';

import type { IForm, IFormStep, ITemplates } from './formTypes';
import { useTemplateController } from './useTemplateController';
import { mapNotificationTemplateToForm, mapFormToCreateNotificationTemplate } from './templateToFormMappers';
import { errorMessage, successMessage } from '../../../utils/notifications';
import { schema } from './notificationTemplateSchema';
import { v4 as uuid4 } from 'uuid';
import { useEffectOnce, useNotificationGroup } from '../../../hooks';
import { useCreate } from '../hooks/useCreate';
import { stepNames } from '../constants';
import { getExplicitErrors } from '../shared/errors';

const defaultEmailBlocks: IEmailBlock[] = [
  {
    type: EmailBlockTypeEnum.TEXT,
    content: '',
    styles: {
      textAlign: TextAlignEnum.LEFT,
    },
  },
];

const makeStep = (channelType: StepTypeEnum, id: string): IFormStep => {
  return {
    _id: id,
    uuid: uuid4(),
    name: stepNames[channelType],
    template: {
      subject: '',
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
    variants: [],
    ...(channelType === StepTypeEnum.EMAIL && {
      replyCallback: {
        active: false,
      },
    }),
    ...(channelType === StepTypeEnum.DIGEST && {
      digestMetadata: {
        digestKey: '',
        type: DigestTypeEnum.REGULAR,
        regular: {
          unit: DigestUnitEnum.MINUTES,
          amount: '5',
          backoff: false,
        },
      },
    }),
    ...(channelType === StepTypeEnum.DELAY && {
      delayMetadata: {
        type: DelayTypeEnum.REGULAR,
        regular: {
          unit: DigestUnitEnum.MINUTES,
          amount: '5',
        },
      },
    }),
  };
};

const makeTemplateCopy = ({
  _id,
  id,
  _environmentId,
  _organizationId,
  _creatorId,
  _parentId,
  createdAt,
  updatedAt,
  ...rest
}: ITemplates) => ({
  ...rest,
});

export const makeVariantFromStep = (
  stepToVariant: IFormStep,
  { conditions }: { conditions: IFormStep['filters'] }
): IFormStep => {
  const { id: _, variants, template, _templateId, ...rest } = stepToVariant;
  const variantsCount = variants?.length ?? 0;
  const variantName = `V${variantsCount + 1} ${stepToVariant?.name}`;

  return {
    ...rest,
    _id: uuid4(),
    uuid: uuid4(),
    name: variantName,
    filters: conditions,
    template: cloneDeep(makeTemplateCopy(template)),
  };
};

interface AddVariantResult {
  variant: IFormStep;
  variantIndex: number;
}

interface INotificationTemplateWithChimera extends INotificationTemplate {
  chimera?: boolean;
}

interface ITemplateEditorFormContext {
  template?: INotificationTemplateWithChimera;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  trigger?: INotificationTrigger;
  onSubmit: (data: IForm) => Promise<void>;
  onInvalid: (errors: FieldErrors<IForm>) => void;
  addStep: (channelType: StepTypeEnum, id: string, stepIndex?: number) => void;
  deleteStep: (index: number) => void;
  deleteVariant: (stepUuid: string, variantUuid: string) => void;
}

const TemplateEditorFormContext = createContext<ITemplateEditorFormContext>({
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  trigger: undefined,
  onSubmit: (() => {}) as any,
  onInvalid: () => {},
  addStep: () => {},
  deleteStep: () => {},
  deleteVariant: () => {},
});

const defaultValues: IForm = {
  name: 'Untitled',
  notificationGroupId: '',
  description: '',
  identifier: '',
  tags: [],
  critical: true,
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
  const [trigger, setTrigger] = useState<INotificationTrigger>();

  const { reset, watch } = methods;

  const name = watch('name');
  const identifier = watch('identifier');

  const steps = useFieldArray({
    control: methods.control,
    name: 'steps',
  });

  useEffect(() => {
    if (!template?.triggers[0].identifier.includes('untitled')) {
      return;
    }
    const newIdentifier = slugify(name, {
      lower: true,
      strict: true,
    });

    if (newIdentifier === identifier) {
      return;
    }

    methods.setValue('identifier', newIdentifier);
    if (trigger) {
      setTrigger({
        ...trigger,
        identifier: newIdentifier,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const { template, isLoading, isCreating, isUpdating, isDeleting, updateNotificationTemplate } =
    useTemplateController(templateId);

  useEffectOnce(() => {
    if (!template) return;

    // we don't call this on success because the templates might be fetched before
    setTrigger(template.triggers[0]);
    const form = mapNotificationTemplateToForm(template);
    reset(form);
  }, !!template);

  const { groups, loading: loadingGroups } = useNotificationGroup();

  useCreate(templateId, groups, setTrigger, methods.getValues);

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
        reset(mapNotificationTemplateToForm(response));

        if (showMessage) {
          successMessage('Trigger code is updated successfully', 'workflowSaved');
        }
      } catch (e: any) {
        Sentry.captureException(e);

        errorMessage(e.message || 'Unexpected error occurred');
      }
    },
    [templateId, updateNotificationTemplate, setTrigger, reset]
  );

  const onInvalid = useCallback((errors: FieldErrors<IForm>) => {
    errorMessage(getExplicitErrors(errors));
  }, []);

  const addStep = useCallback(
    (channelType: StepTypeEnum, id: string, stepIndex?: number) => {
      const newStep: IFormStep = makeStep(channelType, id);

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

  const deleteVariant = useCallback(
    (stepUuid: string, variantUuid: string) => {
      const workflowSteps = methods.getValues('steps');
      const stepToVariant = workflowSteps.find((step) => step.uuid === stepUuid);
      const index = workflowSteps.findIndex((item) => item.uuid === stepUuid);
      if (!stepToVariant) {
        return;
      }
      // remove the variant with the variantUuid
      const newVariants = stepToVariant?.variants?.filter((variant) => variant.uuid !== variantUuid);

      methods.setValue(`steps.${index}.variants`, newVariants, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [methods]
  );

  const value = useMemo<ITemplateEditorFormContext>(
    () => ({
      template: {
        ...template,
        chimera: template?.type === NotificationTemplateTypeEnum.ECHO,
      } as INotificationTemplateWithChimera,
      isLoading: isLoading || loadingGroups,
      isCreating,
      isUpdating,
      isDeleting,
      trigger: trigger,
      onSubmit,
      onInvalid,
      addStep,
      deleteStep,
      deleteVariant,
    }),
    [
      template,
      isLoading,
      isCreating,
      isUpdating,
      isDeleting,
      trigger,
      onSubmit,
      onInvalid,
      addStep,
      deleteStep,
      loadingGroups,
      deleteVariant,
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
