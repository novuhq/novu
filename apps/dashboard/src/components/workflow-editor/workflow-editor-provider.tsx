import { ReactNode, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
// eslint-disable-next-line
// @ts-ignore
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { RiProgress1Line } from 'react-icons/ri';

import { WorkflowEditorContext } from './workflow-editor-context';
import { StepTypeEnum } from '@/utils/enums';
import { Form } from '../primitives/form/form';
import { buildRoute, ROUTES } from '@/utils/routes';
import { useEnvironment } from '@/context/environment/hooks';
import { formSchema } from './schema';
import { useFetchWorkflow, useUpdateWorkflow, useFormAutoSave } from '@/hooks';
import { Step } from '@/utils/types';
import { smallToast } from '../primitives/sonner-helpers';

const STEP_NAME_BY_TYPE: Record<StepTypeEnum, string> = {
  email: 'Email Step',
  chat: 'Chat Step',
  in_app: 'In-App Step',
  sms: 'SMS Step',
  push: 'Push Step',
  digest: 'Digest Step',
  delay: 'Delay Step',
  trigger: 'Trigger Step',
  custom: 'Custom Step',
};

const createStep = (type: StepTypeEnum): Step => ({
  name: STEP_NAME_BY_TYPE[type],
  type,
});

export const WorkflowEditorProvider = ({ children }: { children: ReactNode }) => {
  const changesSavedToastIdRef = useRef<string | number>();
  const { currentEnvironment } = useEnvironment();
  const { workflowId } = useParams<{ workflowId?: string }>();
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof formSchema>>({ mode: 'onSubmit', resolver: zodResolver(formSchema) });
  const { reset } = form;
  const steps = useFieldArray({
    control: form.control,
    name: 'steps',
  });

  const { workflow, error } = useFetchWorkflow({
    workflowId,
  });

  useLayoutEffect(() => {
    if (error) {
      navigate(buildRoute(ROUTES.WORKFLOWS, { environmentId: currentEnvironment?._id ?? '' }));
    }

    if (!workflow) {
      return;
    }

    reset({ ...workflow, steps: workflow.steps.map((step) => ({ ...step })) });
  }, [workflow, error, navigate, reset, currentEnvironment]);

  const { updateWorkflow } = useUpdateWorkflow({
    onSuccess: (data) => {
      reset({ ...data, steps: data.steps.map((step) => ({ ...step })) });
      if (changesSavedToastIdRef.current) {
        return;
      }

      const id = smallToast({
        children: (
          <>
            <RiProgress1Line className="size-6" />
            <span className="text-sm">Saved</span>
          </>
        ),
        options: {
          position: 'bottom-left',
          classNames: {
            toast: 'ml-10',
          },
          onAutoClose: () => {
            changesSavedToastIdRef.current = undefined;
          },
        },
      });
      changesSavedToastIdRef.current = id;
    },
  });

  useFormAutoSave({
    form,
    onSubmit: async (data: z.infer<typeof formSchema>) => {
      if (!workflow) {
        return;
      }

      updateWorkflow({ id: workflow._id, workflow: { ...workflow, ...data } as any });
    },
  });

  const addStep = useCallback(
    (channelType: StepTypeEnum, stepIndex?: number) => {
      const newStep = createStep(channelType);
      if (stepIndex != null) {
        steps.insert(stepIndex, newStep);
      } else {
        steps.append(newStep);
      }
    },
    [steps]
  );

  const value = useMemo(
    () => ({
      addStep,
    }),
    [addStep]
  );

  return (
    <WorkflowEditorContext.Provider value={value}>
      <Form {...form}>
        <form className="h-full">{children}</form>
      </Form>
    </WorkflowEditorContext.Provider>
  );
};
